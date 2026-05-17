"""Messaging router — REST thread/message management + WebSocket real-time channel.

WebSocket protocol:
  Connect:  WS /ws/messaging/{thread_id}?token=<jwt>
  Inbound:  { "type": "message",  "content": "..." }
            { "type": "typing",   "is_typing": true/false }
            { "type": "read",     "message_id": "..." }
  Outbound: { "type": "message",       "data": { ...MessageRead } }
            { "type": "typing",        "user_id": "...", "is_typing": true }
            { "type": "read_receipt",  "message_id": "...", "user_id": "..." }
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db.session import get_db
from app.dependencies import CurrentUser, get_current_user
from app.models.doctor_patient import DoctorPatient
from app.models.messaging import Message, MessageThread, SenderType, ThreadParticipant, ThreadType
from app.models.user import UserProfile, UserRole
from app.schemas.messaging import (
    MessageCreate,
    MessageRead,
    MessagesPage,
    ThreadCreate,
    ThreadRead,
)
from app.schemas.user import ContactRead

router = APIRouter(tags=["messaging"])
ws_router = APIRouter(tags=["messaging-ws"])

Auth = Annotated[CurrentUser, Depends(get_current_user)]
DB = Annotated[Session, Depends(get_db)]
Cfg = Annotated[Settings, Depends(get_settings)]


# ── In-memory WebSocket connection manager ────────────────────────────────────
# NOTE: single-process only. Replace with Redis pub/sub for multi-worker deploys.

class _ConnectionManager:
    def __init__(self) -> None:
        # thread_id → list of (user_id, WebSocket)
        self._connections: dict[str, list[tuple[str, WebSocket]]] = {}

    def connect(self, thread_id: str, user_id: str, ws: WebSocket) -> None:
        self._connections.setdefault(thread_id, []).append((user_id, ws))

    def disconnect(self, thread_id: str, user_id: str, ws: WebSocket) -> None:
        conns = self._connections.get(thread_id, [])
        self._connections[thread_id] = [
            (uid, w) for uid, w in conns if w is not ws
        ]

    async def broadcast(self, thread_id: str, payload: dict, exclude: WebSocket | None = None) -> None:
        for _uid, ws in list(self._connections.get(thread_id, [])):
            if ws is exclude:
                continue
            try:
                await ws.send_json(payload)
            except Exception:
                pass


_manager = _ConnectionManager()


# ── Helpers ───────────────────────────────────────────────────────────────────


def _assert_participant(db: Session, thread_id: uuid.UUID, user_id: str) -> None:
    row = db.execute(
        select(ThreadParticipant).where(
            ThreadParticipant.thread_id == thread_id,
            ThreadParticipant.user_id == user_id,
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a thread participant")


def _msg_to_schema(msg: Message) -> MessageRead:
    return MessageRead.model_validate(msg)


def _touch_thread(db: Session, thread: MessageThread) -> None:
    thread.last_message_at = datetime.now(timezone.utc)


# ── REST endpoints ────────────────────────────────────────────────────────────


def _format_contact_name(profile: UserProfile) -> str:
    """Format a user's display name from their profile.

    Returns "FirstName LastName" if available, otherwise just first or last name,
    or a role-based fallback if no names are set.
    """
    name_parts = [
        profile.first_name.strip() if profile.first_name else None,
        profile.last_name.strip() if profile.last_name else None,
    ]
    name_parts = [part for part in name_parts if part]  # filter out None/empty

    if name_parts:
        return ' '.join(name_parts)

    # Fallback to role-based display
    return "Patient" if profile.role == UserRole.patient else "Doctor"


@router.get("/messaging/contacts", response_model=list[ContactRead])
def list_contacts(user: Auth, db: DB) -> list[ContactRead]:
    """Return messaging contacts based on user role.

    Doctor → their patients. Patient → their doctors. Both include AI agent as synthetic contact.
    """
    profile = db.get(UserProfile, uuid.UUID(user.id))
    contacts: list[ContactRead] = []

    if profile and profile.role == UserRole.doctor:
        # Return patients
        links = db.execute(
            select(DoctorPatient.patient_id).where(
                DoctorPatient.doctor_id == uuid.UUID(user.id)
            )
        ).scalars().all()
        if links:
            patients = db.execute(
                select(UserProfile).where(UserProfile.id.in_(links))
            ).scalars().all()
            for p in patients:
                contacts.append(ContactRead(
                    id=str(p.id),
                    role=p.role,
                    display_name=_format_contact_name(p),
                    email=None,
                ))
    elif profile and profile.role == UserRole.patient:
        # Return doctors
        links = db.execute(
            select(DoctorPatient.doctor_id).where(
                DoctorPatient.patient_id == uuid.UUID(user.id)
            )
        ).scalars().all()
        if links:
            doctors = db.execute(
                select(UserProfile).where(UserProfile.id.in_(links))
            ).scalars().all()
            for d in doctors:
                contacts.append(ContactRead(
                    id=str(d.id),
                    role=d.role,
                    display_name=_format_contact_name(d),
                    email=None,
                ))

    # Always include AI agent as synthetic contact
    contacts.append(ContactRead(
        id="ai-agent",
        role=None,
        display_name="NatalNanny AI",
        email=None,
    ))

    return contacts


@router.get("/messaging/threads", response_model=list[ThreadRead])
def list_threads(user: Auth, db: DB) -> list[MessageThread]:
    """List all threads the current user participates in."""
    thread_ids = db.execute(
        select(ThreadParticipant.thread_id).where(
            ThreadParticipant.user_id == user.id
        )
    ).scalars().all()
    if not thread_ids:
        return []
    return db.execute(
        select(MessageThread)
        .where(MessageThread.id.in_(thread_ids))
        .order_by(MessageThread.last_message_at.desc().nullslast())
    ).scalars().all()


@router.post("/messaging/threads", response_model=ThreadRead, status_code=status.HTTP_201_CREATED)
def create_thread(payload: ThreadCreate, user: Auth, db: DB) -> MessageThread:
    """Create a new user-to-user thread. Requires a doctor-patient relationship."""
    all_participants = list({uuid.UUID(user.id), *payload.participant_ids})

    # Access control: verify doctor-patient relationship exists
    if len(all_participants) == 2:
        p1, p2 = all_participants
        relationship = db.execute(
            select(DoctorPatient).where(
                ((DoctorPatient.doctor_id == p1) & (DoctorPatient.patient_id == p2))
                | ((DoctorPatient.doctor_id == p2) & (DoctorPatient.patient_id == p1))
            )
        ).scalar_one_or_none()
        if relationship is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No doctor-patient relationship exists between participants.",
            )

    # Deduplication: find existing thread with same participants
    my_thread_ids = db.execute(
        select(ThreadParticipant.thread_id).where(
            ThreadParticipant.user_id == uuid.UUID(user.id)
        )
    ).scalars().all()
    if my_thread_ids:
        for tid in my_thread_ids:
            thread_participants = db.execute(
                select(ThreadParticipant.user_id).where(ThreadParticipant.thread_id == tid)
            ).scalars().all()
            if set(thread_participants) == set(all_participants):
                # Check it's a user thread
                existing_thread = db.get(MessageThread, tid)
                if existing_thread and existing_thread.type == ThreadType.user:
                    return existing_thread

    thread = MessageThread(type=ThreadType.user)
    db.add(thread)
    db.flush()

    for pid in all_participants:
        db.add(ThreadParticipant(thread_id=thread.id, user_id=pid))

    db.commit()
    db.refresh(thread)
    return thread


@router.get("/messaging/agent/thread", response_model=ThreadRead)
def get_or_create_agent_thread(user: Auth, db: DB) -> MessageThread:
    """Return the singleton agent thread for the current user, creating it if needed."""
    existing_ids = db.execute(
        select(ThreadParticipant.thread_id).where(
            ThreadParticipant.user_id == user.id
        )
    ).scalars().all()

    if existing_ids:
        agent_thread = db.execute(
            select(MessageThread).where(
                MessageThread.id.in_(existing_ids),
                MessageThread.type == ThreadType.agent,
            )
        ).scalar_one_or_none()
        if agent_thread:
            return agent_thread

    thread = MessageThread(type=ThreadType.agent)
    db.add(thread)
    db.flush()
    db.add(ThreadParticipant(thread_id=thread.id, user_id=uuid.UUID(user.id)))
    db.commit()
    db.refresh(thread)
    return thread


@router.get("/messaging/threads/{thread_id}/messages", response_model=MessagesPage)
def list_messages(
    thread_id: uuid.UUID,
    user: Auth,
    db: DB,
    cursor: str | None = Query(default=None, description="ISO datetime cursor for pagination"),
    limit: int = Query(default=50, ge=1, le=200),
) -> MessagesPage:
    _assert_participant(db, thread_id, user.id)

    stmt = select(Message).where(Message.thread_id == thread_id)
    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            stmt = stmt.where(Message.created_at < cursor_dt)
        except ValueError:
            pass
    stmt = stmt.order_by(Message.created_at.desc()).limit(limit + 1)

    msgs = db.execute(stmt).scalars().all()
    has_more = len(msgs) > limit
    page = msgs[:limit]

    next_cursor = page[-1].created_at.isoformat() if has_more and page else None
    return MessagesPage(
        items=[_msg_to_schema(m) for m in reversed(page)],
        next_cursor=next_cursor,
    )


@router.post(
    "/messaging/threads/{thread_id}/messages",
    response_model=MessageRead,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    thread_id: uuid.UUID, payload: MessageCreate, user: Auth, db: DB
) -> MessageRead:
    """Send a message. For agent threads, agent replies are handled async (TODO)."""
    _assert_participant(db, thread_id, user.id)

    thread = db.get(MessageThread, thread_id)
    if thread is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")

    msg = Message(
        thread_id=thread_id,
        sender_id=uuid.UUID(user.id),
        sender_type=SenderType.user,
        content=payload.content,
    )
    db.add(msg)
    _touch_thread(db, thread)
    db.commit()
    db.refresh(msg)

    # Broadcast to WebSocket subscribers so recipients get real-time updates
    outbound = {"type": "message", "data": _msg_to_schema(msg).model_dump(mode="json")}
    await _manager.broadcast(str(thread_id), outbound)

    # TODO: for agent threads, enqueue async agent reply via task queue
    return _msg_to_schema(msg)


# ── WebSocket endpoint ────────────────────────────────────────────────────────


async def _ws_authenticate(token: str | None, cfg: Settings) -> CurrentUser | None:
    """Verify a JWT from a WebSocket query param."""
    if not token:
        return None
    import jwt
    from jwt.exceptions import InvalidTokenError

    try:
        payload = jwt.decode(
            token,
            cfg.jwt_secret,
            algorithms=["HS256"],
        )
        user_id = payload.get("sub")
        email = payload.get("email")
        if user_id and email:
            return CurrentUser(id=user_id, email=email)
    except InvalidTokenError:
        pass
    return None


@ws_router.websocket("/ws/messaging/{thread_id}")
async def websocket_messaging(
    websocket: WebSocket,
    thread_id: uuid.UUID,
    token: str | None = Query(default=None),
    cfg: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> None:
    """Real-time messaging channel for a thread.

    Auth: pass the JWT as ?token=<jwt>
    """
    current_user = await _ws_authenticate(token, cfg)
    if current_user is None:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    try:
        _assert_participant(db, thread_id, current_user.id)
    except HTTPException:
        await websocket.close(code=4003, reason="Not a participant")
        return

    await websocket.accept()
    _manager.connect(str(thread_id), current_user.id, websocket)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                event = json.loads(raw)
            except json.JSONDecodeError:
                continue

            event_type = event.get("type")

            if event_type == "message":
                content = event.get("content", "").strip()
                if not content:
                    continue

                thread = db.get(MessageThread, thread_id)
                if thread is None:
                    continue

                msg = Message(
                    thread_id=thread_id,
                    sender_id=uuid.UUID(current_user.id),
                    sender_type=SenderType.user,
                    content=content,
                )
                db.add(msg)
                _touch_thread(db, thread)
                db.commit()
                db.refresh(msg)

                outbound = {"type": "message", "data": _msg_to_schema(msg).model_dump(mode="json")}
                await _manager.broadcast(str(thread_id), outbound)

            elif event_type == "typing":
                is_typing = bool(event.get("is_typing", False))
                outbound = {
                    "type": "typing",
                    "user_id": current_user.id,
                    "is_typing": is_typing,
                }
                await _manager.broadcast(str(thread_id), outbound, exclude=websocket)

            elif event_type == "read":
                message_id = event.get("message_id")
                if message_id:
                    msg = db.get(Message, uuid.UUID(message_id))
                    if msg and msg.thread_id == thread_id and msg.read_at is None:
                        msg.read_at = datetime.now(timezone.utc)
                        db.commit()
                    outbound = {
                        "type": "read_receipt",
                        "message_id": message_id,
                        "user_id": current_user.id,
                    }
                    await _manager.broadcast(str(thread_id), outbound, exclude=websocket)

    except WebSocketDisconnect:
        pass
    finally:
        _manager.disconnect(str(thread_id), current_user.id, websocket)
