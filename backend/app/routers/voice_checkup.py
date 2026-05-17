"""
Voice + rPPG check-in session router.

POST /api/checkup/start-session       – start a new voice session, return questions
POST /api/checkup/transcribe-answer   – transcribe one spoken answer via Whisper
POST /api/checkup/finish-session      – AI note cleanup, merge rPPG, save, return result
GET  /api/checkup/voice-latest        – latest combined voice+rPPG result
GET  /api/checkup/voice-history       – recent combined results
POST /api/checkup/mock-voice-session  – realistic mock (no OpenAI/camera required)
"""

import json
import logging
import random
import tempfile
import uuid as _uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db.session import get_db
from app.dependencies import CurrentUser, get_current_user, require_patient_role
from app.models.user import HealthRecord, UserProfile
from rppg import storage

logger = logging.getLogger(__name__)
router = APIRouter(tags=["voice-checkup"])

Cfg = Annotated[Settings, Depends(get_settings)]
Auth = Annotated[CurrentUser, Depends(get_current_user)]
DB = Annotated[Session, Depends(get_db)]

OPENAI_MODEL = "gpt-4o-mini"

# ── In-memory session store (MVP — single server) ────────────────────────────
_SESSIONS: dict[str, dict] = {}

# ── Questions ────────────────────────────────────────────────────────────────
# Always-included safety questions (never dropped)
SAFETY_QUESTIONS = [
    {"id": "symptoms_check",  "question": "Do you feel your heart racing, shortness of breath, chest pain, dizziness, or anything unusual?"},
    {"id": "urgent_symptoms", "question": "Have you had any severe headache, vision changes, heavy bleeding, or reduced fetal movement today?"},
]

# Full question bank — GPT picks the best 3 to pair with the 2 safety questions
QUESTION_BANK = [
    {"id": "feeling_now",        "question": "How are you feeling right now?"},
    {"id": "activity_before",    "question": "Did you rest quietly before starting, or were you recently active?"},
    {"id": "care_team_notes",    "question": "Is there anything you want your care team to know?"},
    {"id": "sleep_quality",      "question": "How has your sleep been lately?"},
    {"id": "hydration",          "question": "Have you been staying hydrated and eating regularly today?"},
    {"id": "stress_mood",        "question": "How has your mood or stress level been?"},
    {"id": "swelling",           "question": "Have you noticed any swelling in your hands, feet, or face?"},
    {"id": "fetal_movement",     "question": "Have you felt your baby moving today?"},
    {"id": "pain_discomfort",    "question": "Are you experiencing any pain or unusual discomfort?"},
    {"id": "medications",        "question": "Have you taken your medications or supplements as usual today?"},
]

# Fallback when no user or no API key
DEFAULT_QUESTIONS = [
    {"id": "feeling_now",     "question": "How are you feeling right now?"},
    {"id": "activity_before", "question": "Did you rest quietly before starting, or were you recently active?"},
    {"id": "symptoms_check",  "question": "Do you feel your heart racing, shortness of breath, chest pain, dizziness, or anything unusual?"},
    {"id": "urgent_symptoms", "question": "Have you had any severe headache, vision changes, heavy bleeding, or reduced fetal movement today?"},
    {"id": "care_team_notes", "question": "Is there anything you want your care team to know?"},
]

QUESTION_PERSONALIZATION_PROMPT = """\
You are NatalNanny, a maternal wellness assistant. Select and lightly personalize exactly 5 check-in questions for this user's wellness session.

Rules:
- ALWAYS include symptoms_check and urgent_symptoms — they are safety-critical and must appear last.
- Choose the best 3 from the question bank based on: recent symptom history, gestational week, known risk factors, and gaps in recent check-ins.
- You may lightly rephrase a question to feel personal (e.g. reference the user's name or week), but keep it concise and warm.
- Return ONLY valid JSON: {"questions": [{"id": "...", "question": "..."}]}
- Use only IDs from the provided bank. Do not invent new IDs.
"""

URGENT_NOTICE = (
    "Seek urgent medical care for chest pain, trouble breathing, fainting, "
    "seizure, severe headache, vision changes, heavy bleeding, or reduced fetal movement."
)

NOTE_CLEANUP_SYSTEM_PROMPT = """\
You are NatalNanny, a maternal wellness assistant.

Clean up the user's spoken check-in answers into a concise, supportive wellness note.

Rules:
- Do not diagnose.
- Do not make medical claims.
- Do not claim the camera measured blood pressure, SpO2, respiratory rate, or disease risk.
- Use cautious wording: "reported", "estimated", "may explain", "consider sharing with care team".
- Return ONLY valid JSON matching the schema below. No markdown, no explanation.

Schema:
{
  "cleaned_note": "string",
  "symptoms_reported": {
    "shortness_of_breath": false,
    "chest_pain": false,
    "dizziness": false,
    "severe_headache": false,
    "vision_changes": false,
    "heavy_bleeding": false,
    "reduced_fetal_movement": false,
    "fever_or_chills": false,
    "mood_concern": false
  },
  "possible_context_for_metrics": ["string"],
  "care_team_summary": "string",
  "suggested_next_step": "string",
  "requires_urgent_notice": false,
  "urgent_notice_reason": null
}
"""

# ── Helpers ───────────────────────────────────────────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _session_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def get_user_context_for_session(user_id: Optional[str], db: Optional[Session] = None) -> dict:
    """Build user context from DB profile, health record, and recent check-in history."""
    ctx: dict = {
        "name": None,
        "gestational_week": None,
        "due_date": None,
        "care_team": None,
        "known_risk_factors": [],
        "recent_checkins": [],
    }

    if user_id and db:
        try:
            profile = db.get(UserProfile, _uuid.UUID(user_id))
            if profile:
                ctx["name"] = profile.first_name
        except Exception as exc:
            logger.warning("Profile fetch failed: %s", exc)

        try:
            health = db.query(HealthRecord).filter(
                HealthRecord.user_id == _uuid.UUID(user_id)
            ).first()
            if health and health.data:
                d = health.data
                ctx["gestational_week"] = d.get("gestational_week")
                ctx["due_date"] = d.get("due_date")
                ctx["care_team"] = d.get("care_team")
                ctx["known_risk_factors"] = d.get("risk_factors") or []
        except Exception as exc:
            logger.warning("Health record fetch failed: %s", exc)

    # Pull the 3 most recent voice check-ins from local JSON storage
    try:
        recent = storage.get_voice_history(limit=3)
        ctx["recent_checkins"] = [
            {
                "date": r.get("created_at", "")[:10],
                "symptoms_flagged": [
                    k for k, v in (
                        (r.get("voice_checkin") or {}).get("symptoms_reported") or {}
                    ).items() if v
                ],
                "requires_urgent": bool(
                    (r.get("voice_checkin") or {}).get("requires_urgent_notice")
                ),
                "cleaned_note_excerpt": (
                    ((r.get("voice_checkin") or {}).get("cleaned_note") or "")[:200]
                ),
            }
            for r in recent
        ]
    except Exception as exc:
        logger.warning("History fetch failed: %s", exc)

    return ctx


async def _generate_personalized_questions(user_ctx: dict, api_key: str) -> list[dict]:
    """Ask GPT-4o-mini to pick the best 5 questions for this user from the question bank."""
    try:
        from openai import AsyncOpenAI  # type: ignore[import]
    except ImportError:
        return DEFAULT_QUESTIONS

    bank_text = json.dumps(QUESTION_BANK + SAFETY_QUESTIONS, indent=2)
    user_prompt = (
        f"User context:\n{json.dumps(user_ctx, indent=2)}\n\n"
        f"Question bank (choose from these IDs only):\n{bank_text}"
    )

    try:
        client = AsyncOpenAI(api_key=api_key)
        response = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": QUESTION_PERSONALIZATION_PROMPT},
                {"role": "user",   "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        parsed = json.loads(response.choices[0].message.content or "{}")
        questions = parsed.get("questions", [])
        # Validate: must have exactly 5 items with id + question strings
        if (
            len(questions) == 5
            and all(isinstance(q.get("id"), str) and isinstance(q.get("question"), str) for q in questions)
        ):
            return questions
    except Exception as exc:
        logger.warning("Question personalization failed, using defaults: %s", exc)

    return DEFAULT_QUESTIONS


def _default_symptoms() -> dict:
    return {
        "shortness_of_breath": False,
        "chest_pain": False,
        "dizziness": False,
        "severe_headache": False,
        "vision_changes": False,
        "heavy_bleeding": False,
        "reduced_fetal_movement": False,
        "fever_or_chills": False,
        "mood_concern": False,
    }


async def _transcribe_audio(audio_path: str, api_key: str) -> str:
    """Call OpenAI Whisper. Returns transcript string or raises."""
    try:
        from openai import AsyncOpenAI  # type: ignore[import]
    except ImportError as exc:
        raise RuntimeError("openai package not installed") from exc

    client = AsyncOpenAI(api_key=api_key)
    with open(audio_path, "rb") as f:
        result = await client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="text",
        )
    return str(result).strip()


async def _run_note_cleanup(
    answers: list[dict],
    rppg_result: Optional[dict],
    user_ctx: dict,
    api_key: str,
) -> dict:
    """Call GPT-4o to produce cleaned voice notes. Falls back to raw on failure."""
    raw_transcript = "\n\n".join(
        f"Q: {a.get('question', '')}\nA: {a.get('raw_transcript', '')}"
        for a in answers
    )

    # Build user prompt
    rppg_summary = json.dumps(
        {
            "estimated_pulse_bpm": (
                (rppg_result or {}).get("checkup_summary", {}).get("estimated_pulse_bpm")
                or (rppg_result or {}).get("rppg_analysis", {}).get("consensus", {}).get("estimated_pulse_bpm")
            ),
            "pulse_category": (
                (rppg_result or {}).get("checkup_summary", {}).get("pulse_category")
                or (rppg_result or {}).get("rppg_analysis", {}).get("consensus", {}).get("pulse_category")
            ),
            "signal_quality": (
                (rppg_result or {}).get("signal_quality", {}).get("overall")
                or (rppg_result or {}).get("rppg_analysis", {}).get("signal_quality", {}).get("label")
            ),
        },
        indent=2,
    ) if rppg_result else "No rPPG data available."

    user_prompt = (
        f"User knowledge base:\n{json.dumps(user_ctx, indent=2)}\n\n"
        f"rPPG result:\n{rppg_summary}\n\n"
        f"Questions and transcripts:\n{raw_transcript}"
    )

    try:
        from openai import AsyncOpenAI  # type: ignore[import]

        client = AsyncOpenAI(api_key=api_key)
        response = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": NOTE_CLEANUP_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        parsed = json.loads(response.choices[0].message.content or "{}")
    except Exception as exc:
        logger.warning("Note cleanup failed: %s", exc)
        parsed = {}

    symptoms = {**_default_symptoms(), **parsed.get("symptoms_reported", {})}
    requires_urgent = bool(parsed.get("requires_urgent_notice") or any([
        symptoms.get("chest_pain"),
        symptoms.get("shortness_of_breath"),
        symptoms.get("severe_headache"),
        symptoms.get("vision_changes"),
        symptoms.get("heavy_bleeding"),
        symptoms.get("reduced_fetal_movement"),
    ]))

    return {
        "questions_asked": [
            {
                "id": a.get("question_id", ""),
                "question": a.get("question", ""),
                "raw_transcript": a.get("raw_transcript", ""),
                "cleaned_answer": a.get("raw_transcript", ""),
            }
            for a in answers
        ],
        "raw_full_transcript": raw_transcript,
        "cleaned_note": parsed.get(
            "cleaned_note",
            f"User completed a camera-based wellness check-in. {raw_transcript[:300]}"
        ),
        "symptoms_reported": symptoms,
        "possible_context_for_metrics": parsed.get("possible_context_for_metrics", []),
        "care_team_summary": parsed.get(
            "care_team_summary",
            "Voice check-in completed. No AI summary available — raw transcript saved."
        ),
        "suggested_next_step": parsed.get(
            "suggested_next_step",
            "Continue your daily check-ins and share trends with your care team."
        ),
        "requires_urgent_notice": requires_urgent,
        "urgent_notice_reason": parsed.get("urgent_notice_reason") if requires_urgent else None,
    }


def _build_combined_result(
    session_id: str,
    created_at: str,
    duration_seconds: float,
    completed_reason: str,
    rppg_result: Optional[dict],
    voice_checkin: dict,
    user_ctx: dict,
) -> dict:
    cs = (rppg_result or {}).get("checkup_summary") or {}
    sq = (rppg_result or {}).get("signal_quality") or {}

    estimated_pulse = (
        cs.get("estimated_pulse_bpm")
        or (rppg_result or {}).get("rppg_analysis", {}).get("consensus", {}).get("estimated_pulse_bpm")
    )
    pulse_cat = (
        cs.get("pulse_category")
        or (rppg_result or {}).get("rppg_analysis", {}).get("consensus", {}).get("pulse_category")
    )
    sig_quality = sq.get("overall") or (rppg_result or {}).get("rppg_analysis", {}).get("signal_quality", {}).get("label")

    mwi = (rppg_result or {}).get("maternal_wellness_interpretation") or {}
    suggested_step = voice_checkin.get("suggested_next_step") or mwi.get("suggested_next_step", "")
    cleaned_note = voice_checkin.get("cleaned_note", "")
    care_team_summary = voice_checkin.get("care_team_summary", "")

    session_notes = {
        "title": "Your NatalNanny Check-In Notes",
        "summary": (
            "Today's check-in combined your camera-based pulse estimate with your voice answers. "
            "Not a diagnosis. Share trends with your care team."
        ),
        "cleaned_note": cleaned_note,
        "care_team_summary": care_team_summary,
    }

    return {
        "session_id": session_id,
        "created_at": created_at,
        "duration_seconds": duration_seconds,
        "completed_reason": completed_reason,
        "source": {
            "pipeline": "rPPG-Toolbox + OpenAI voice check-in",
            "mode": "voice_rppg_maternal_wellness_mvp",
            "ground_truth_used": False,
        },
        # rPPG data — embed the full upstream result for the frontend ResultsSummary component
        **(rppg_result or {}),
        # Voice check-in overlay
        "voice_checkin": voice_checkin,
        "user_context_used": {
            "gestational_week": user_ctx.get("gestational_week"),
            "care_team": user_ctx.get("care_team"),
            "recent_checkins_used": bool(user_ctx.get("recent_checkins")),
        },
        "session_notes_for_user": session_notes,
        "storage": {
            "saved_local_json": True,
            "local_json_path": f"backend/rppg/output/{session_id}/results.json",
            "saved_supabase": False,
            "supabase_table": "checkup_sessions",
        },
        "medical_notice": "Estimated wellness signal only, not diagnostic.",
        "safety": {
            "not_diagnostic": True,
            "disclaimer": (
                "This is a camera-based wellness signal, not a medical diagnosis. "
                "Estimated pulse is for informational use only. Share trends with your care team."
            ),
            "urgent_notice": URGENT_NOTICE,
        },
    }


def _build_mock_voice_session(session_id: str) -> dict:
    hr = round(78 + random.uniform(-8, 15), 1)
    created_at = _now_iso()

    mock_answers = [
        {"question_id": "feeling_now",     "question": "How are you feeling right now?",                   "raw_transcript": "I'm feeling pretty good today, just a little tired from last night."},
        {"question_id": "activity_before", "question": "Did you rest quietly before starting?",             "raw_transcript": "Yes, I was sitting on the couch for about ten minutes before starting."},
        {"question_id": "symptoms_check",  "question": "Any heart racing, shortness of breath, or dizziness?", "raw_transcript": "No, none of that. I feel okay."},
        {"question_id": "urgent_symptoms", "question": "Any severe headache, vision changes, or heavy bleeding?", "raw_transcript": "No, nothing like that."},
        {"question_id": "care_team_notes", "question": "Anything for your care team?",                      "raw_transcript": "Just that I've been a bit more tired than usual this week."},
    ]

    voice_checkin = {
        "questions_asked": [
            {**a, "id": a["question_id"], "cleaned_answer": a["raw_transcript"]}
            for a in mock_answers
        ],
        "raw_full_transcript": "\n\n".join(
            f"Q: {a['question']}\nA: {a['raw_transcript']}" for a in mock_answers
        ),
        "cleaned_note": (
            "User completed a camera-based wellness check-in. "
            "Reported feeling generally well with mild fatigue. "
            "Rested quietly before the check-in. No acute symptoms reported. "
            "User noted increased tiredness this week."
        ),
        "symptoms_reported": _default_symptoms(),
        "possible_context_for_metrics": [
            "User reported mild fatigue which may contribute to slightly elevated pulse if present.",
            "Rested before check-in — pulse reading reflects a closer resting state.",
        ],
        "care_team_summary": (
            f"Estimated pulse was approximately {hr:.1f} bpm for this resting check-in. "
            "User reported mild fatigue but no acute symptoms. "
            "No urgent symptoms reported. User mentioned increased tiredness this week."
        ),
        "suggested_next_step": (
            "Continue daily check-ins and share your trend history at your next appointment. "
            "If fatigue persists or worsens, mention it to Dr. Rivera."
        ),
        "requires_urgent_notice": False,
        "urgent_notice_reason": None,
    }

    from app.routers.rppg import _make_full_result
    rppg = _make_full_result(session_id, hr, "good", created_at)

    result = _build_combined_result(
        session_id=session_id,
        created_at=created_at,
        duration_seconds=120,
        completed_reason="answered_all_questions",
        rppg_result=rppg,
        voice_checkin=voice_checkin,
        user_ctx=get_user_context_for_session(),
    )
    result["storage"]["saved_supabase"] = False
    result["_is_mock"] = True
    return result


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class AnswerPayload(BaseModel):
    question_id: str
    question: str
    raw_transcript: str


class FinishSessionRequest(BaseModel):
    session_id: str
    rppg_result: Optional[dict] = None
    duration_seconds: Optional[float] = 120
    completed_reason: Optional[str] = "time_limit_reached"
    answers: Optional[list[AnswerPayload]] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/checkup/start-session")
async def start_session(cfg: Cfg, current_user: Auth, db: DB) -> dict:
    """Create an in-memory voice session with AI-personalized questions."""
    require_patient_role(db, current_user.id)
    sid = _session_id()
    user_id = current_user.id

    # Build context from real DB + history, then let GPT pick the best questions
    user_ctx = get_user_context_for_session(user_id, db)
    if cfg.openai_api_key:
        questions = await _generate_personalized_questions(user_ctx, cfg.openai_api_key)
    else:
        questions = DEFAULT_QUESTIONS

    _SESSIONS[sid] = {
        "session_id": sid,
        "user_id": user_id,
        "questions": questions,
        "user_ctx": user_ctx,
        "answers": [],
        "started_at": _now_iso(),
        "status": "active",
    }
    return {
        "session_id": sid,
        "status": "started",
        "max_duration_seconds": 120,
        "questions": questions,
    }


@router.post("/checkup/transcribe-answer")
async def transcribe_answer(
    cfg: Cfg,
    current_user: Auth,
    db: DB,
    session_id: str = Form(...),
    question_id: str = Form(...),
    audio: UploadFile = File(...),
) -> dict:
    """Transcribe one spoken answer with OpenAI Whisper and store it in the session."""
    require_patient_role(db, current_user.id)
    session = _SESSIONS.get(session_id)
    if session is None:
        # Session expired or server restarted — create stub with default questions
        session = {
            "session_id": session_id,
            "user_id": current_user.id,
            "questions": DEFAULT_QUESTIONS,
            "answers": [],
            "started_at": _now_iso(),
        }
        _SESSIONS[session_id] = session

    session_questions: list[dict] = session.get("questions") or DEFAULT_QUESTIONS

    # Find matching question text
    q_text = next((q["question"] for q in session_questions if q["id"] == question_id), question_id)

    # Save audio to a temp file
    suffix = Path(audio.filename or "audio.webm").suffix or ".webm"
    transcript = "[Transcription unavailable]"
    transcription_error: Optional[str] = None

    if not cfg.openai_api_key:
        transcription_error = "OPENAI_API_KEY not configured on server"
    else:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(await audio.read())
            tmp_path = tmp.name
        try:
            transcript = await _transcribe_audio(tmp_path, cfg.openai_api_key)
        except Exception as exc:
            transcription_error = str(exc)
            logger.warning("Transcription error: %s", exc)
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    # Store answer
    answer = {
        "question_id": question_id,
        "question": q_text,
        "raw_transcript": transcript,
    }
    session["answers"].append(answer)

    # Determine next question
    answered_ids = {a["question_id"] for a in session["answers"]}
    next_question = next(
        (q for q in session_questions if q["id"] not in answered_ids), None
    )
    questions_remaining = sum(1 for q in session_questions if q["id"] not in answered_ids)

    response: dict[str, Any] = {
        "question_id": question_id,
        "transcript": transcript,
        "next_question": next_question,
        "questions_remaining": questions_remaining,
        "all_questions_answered": questions_remaining == 0,
    }
    if transcription_error:
        response["transcription_error"] = transcription_error
    return response


@router.post("/checkup/finish-session")
async def finish_session(payload: FinishSessionRequest, cfg: Cfg, current_user: Auth, db: DB) -> dict:
    """
    Clean up voice notes with AI, merge with rPPG result, save locally + Supabase.
    """
    require_patient_role(db, current_user.id)
    session = _SESSIONS.get(payload.session_id, {})

    # Resolve user_id: JWT > session store
    user_id: str = current_user.id or session.get("user_id", "")

    # Use answers from payload (authoritative) or from in-memory session
    answers: list[dict] = (
        [a.model_dump() for a in payload.answers]
        if payload.answers
        else session.get("answers", [])
    )

    # Use context stored at session start (already fetched from DB); re-fetch if missing
    user_ctx = session.get("user_ctx") or get_user_context_for_session(user_id, db)

    if not cfg.openai_api_key:
        logger.warning("OPENAI_API_KEY not set — skipping AI note cleanup")
        voice_checkin = await _run_note_cleanup(answers, payload.rppg_result, user_ctx, "")
        voice_checkin["ai_cleanup_skipped"] = True
        voice_checkin["ai_cleanup_reason"] = "OPENAI_API_KEY not configured"
    else:
        voice_checkin = await _run_note_cleanup(answers, payload.rppg_result, user_ctx, cfg.openai_api_key)

    result = _build_combined_result(
        session_id=payload.session_id,
        created_at=session.get("started_at", _now_iso()),
        duration_seconds=payload.duration_seconds or 120,
        completed_reason=payload.completed_reason or "time_limit_reached",
        rppg_result=payload.rppg_result,
        voice_checkin=voice_checkin,
        user_ctx=user_ctx,
    )

    # Save locally
    try:
        storage.save_checkup_result(result)
        result["storage"]["saved_local_json"] = True
    except Exception as exc:
        logger.error("Local save failed: %s", exc)
        result["storage"]["saved_local_json"] = False
        result["storage"]["local_save_error"] = str(exc)

    # Save to Supabase (three tables)
    if cfg.supabase_url and cfg.supabase_service_role_key:
        errors: list[str] = []
        url, key = cfg.supabase_url, cfg.supabase_service_role_key

        # 1. rppg_results — flat signal metrics
        try:
            storage.save_rppg_result_supabase(result, url, key, user_id=user_id)
        except Exception as exc:
            logger.warning("rppg_results save failed: %s", exc)
            errors.append(f"rppg_results: {exc}")

        # 2. checkin_voice_notes + checkin_answers — voice Q&A
        try:
            storage.save_voice_checkin_supabase(result, url, key, user_id=user_id)
        except Exception as exc:
            logger.warning("checkin tables save failed: %s", exc)
            errors.append(f"checkin_tables: {exc}")

        # 3. checkup_sessions — full JSON backup
        try:
            storage.save_checkup_result_supabase(result, url, key, cfg.supabase_checkup_table, user_id=user_id)
        except Exception as exc:
            logger.warning("checkup_sessions save failed: %s", exc)
            errors.append(f"checkup_sessions: {exc}")

        if errors:
            result["storage"]["saved_supabase"] = False
            result["storage"]["supabase_error"] = "; ".join(errors)
        else:
            result["storage"]["saved_supabase"] = True
    else:
        result["storage"]["saved_supabase"] = False
        result["storage"]["supabase_error"] = "Supabase not configured"

    _SESSIONS.pop(payload.session_id, None)
    return result


@router.get("/checkup/voice-latest")
async def get_voice_latest(current_user: Auth, db: DB) -> dict:
    require_patient_role(db, current_user.id)
    result = storage.get_latest_voice_result()
    if result is None:
        raise HTTPException(status_code=404, detail="No voice check-in results found")
    return result


@router.get("/checkup/voice-history")
async def get_voice_history(current_user: Auth, db: DB, limit: int = 30) -> list:
    require_patient_role(db, current_user.id)
    return storage.get_voice_history(limit=limit)


@router.post("/checkup/mock-voice-session")
async def mock_voice_session(current_user: Auth, db: DB) -> dict:
    """Return a realistic combined mock session — no camera or OpenAI required."""
    require_patient_role(db, current_user.id)
    sid = "mock_voice_" + datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    result = _build_mock_voice_session(sid)
    storage.save_checkup_result(result)
    return result
