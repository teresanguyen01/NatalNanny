"""
Local JSON storage for checkup results.
Interface is Supabase-swap-ready: replace implementations below with DB calls.
"""

import json
from pathlib import Path
from typing import Optional

OUTPUT_ROOT = Path(__file__).parent / "output"


def _session_path(session_id: str) -> Path:
    return OUTPUT_ROOT / session_id / "results.json"


def save_checkup_result(result: dict) -> None:
    session_id = result["session_id"]
    session_dir = OUTPUT_ROOT / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    _session_path(session_id).write_text(json.dumps(result, indent=2))


def get_latest_checkup_result() -> Optional[dict]:
    if not OUTPUT_ROOT.exists():
        return None
    sessions = sorted(
        [d for d in OUTPUT_ROOT.iterdir() if d.is_dir() and (d / "results.json").exists()],
        key=lambda d: d.name,
        reverse=True,
    )
    if not sessions:
        return None
    return json.loads((sessions[0] / "results.json").read_text())


def get_checkup_history(limit: int = 30) -> list[dict]:
    if not OUTPUT_ROOT.exists():
        return []
    sessions = sorted(
        [d for d in OUTPUT_ROOT.iterdir() if d.is_dir() and (d / "results.json").exists()],
        key=lambda d: d.name,
        reverse=True,
    )[:limit]
    results = []
    for s in sessions:
        try:
            results.append(json.loads((s / "results.json").read_text()))
        except Exception:
            continue
    return results
