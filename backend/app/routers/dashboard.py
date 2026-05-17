from datetime import date, datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import CurrentUser, get_current_user
from app.models.checkin import CheckupSession, SessionStatus
from app.models.user import UserProfile
from app.schemas.dashboard import (
    BrowniePointEntry,
    BrowniePointsResponse,
    CheckinDatesResponse,
    DashboardSummary,
    LastCheckin,
    MascotResponse,
    StreakResponse,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

Auth = Annotated[CurrentUser, Depends(get_current_user)]
DB = Annotated[Session, Depends(get_db)]


def _get_profile(db: Session, user_id: str) -> UserProfile:
    profile = db.get(UserProfile, user_id)
    if profile is None:
        profile = UserProfile(id=user_id, mascot_health=50)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def _apply_health_decay(profile: UserProfile) -> int:
    """
    Apply proportional health decay based on days since last check-in.
    Decay: -15% per day missed, applied retroactively.
    Returns: Updated mascot_health value (0-100)
    """
    if profile.last_checkin_date is None:
        return profile.mascot_health

    today_date = date.today()
    days_since_last = (today_date - profile.last_checkin_date).days

    if days_since_last <= 0:
        return profile.mascot_health

    # Apply 15% decay per missed day (exponential)
    current_health = profile.mascot_health
    for _ in range(days_since_last):
        current_health = int(current_health * 0.85)

    return max(0, current_health)  # Floor at 0


def _compute_streak(db: Session, user_id: str) -> int:
    """Count consecutive days (ending today) with at least one completed session."""
    completed = (
        db.execute(
            select(func.date(CheckupSession.completed_at).label("day"))
            .where(
                CheckupSession.user_id == user_id,
                CheckupSession.status == SessionStatus.completed,
                CheckupSession.completed_at.isnot(None),
            )
            .distinct()
            .order_by(func.date(CheckupSession.completed_at).desc())
        )
        .scalars()
        .all()
    )
    checkin_days = {d for d in completed}

    streak = 0
    today = date.today()
    cursor = today
    while cursor in checkin_days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def _brownie_entries(db: Session, user_id: str, days: int) -> list[BrowniePointEntry]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.execute(
        select(
            func.date(CheckupSession.completed_at).label("day"),
            func.sum(CheckupSession.brownie_points).label("pts"),
        )
        .where(
            CheckupSession.user_id == user_id,
            CheckupSession.status == SessionStatus.completed,
            CheckupSession.completed_at >= cutoff,
        )
        .group_by(func.date(CheckupSession.completed_at))
        .order_by(func.date(CheckupSession.completed_at))
    ).all()
    return [BrowniePointEntry(date=r.day, points=r.pts or 0.0) for r in rows]


def _checkin_dates(db: Session, user_id: str, month: str | None) -> list[date]:
    stmt = select(func.date(CheckupSession.completed_at).label("day")).where(
        CheckupSession.user_id == user_id,
        CheckupSession.status == SessionStatus.completed,
        CheckupSession.completed_at.isnot(None),
    )
    if month:
        try:
            month_dt = datetime.strptime(month, "%Y-%m")
            stmt = stmt.where(
                func.date_trunc("month", CheckupSession.completed_at)
                == month_dt.date().replace(day=1)
            )
        except ValueError:
            pass
    rows = db.execute(stmt.distinct()).scalars().all()
    return sorted(set(rows))


def _checkin_dates_with_streaks(
    db: Session, user_id: str, month: str | None
) -> list[dict]:
    """
    Fetch completed dates and calculate what the streak was on each specific day.
    Returns: List of {date, streak} objects
    """
    # Get all completed dates
    stmt = select(func.date(CheckupSession.completed_at).label("day")).where(
        CheckupSession.user_id == user_id,
        CheckupSession.status == SessionStatus.completed,
        CheckupSession.completed_at.isnot(None),
    )

    if month:
        try:
            month_dt = datetime.strptime(month, "%Y-%m")
            stmt = stmt.where(
                func.date_trunc("month", CheckupSession.completed_at)
                == month_dt.date().replace(day=1)
            )
        except ValueError:
            pass

    completed_dates = sorted(set(db.execute(stmt.distinct()).scalars().all()))

    if not completed_dates:
        return []

    # Build set for O(1) lookup
    completed_set = set(completed_dates)

    # Compute streak for each date by counting backwards
    result = []
    for check_date in completed_dates:
        streak = 0
        cursor = check_date
        while cursor in completed_set:
            streak += 1
            cursor -= timedelta(days=1)

        result.append({"date": check_date.isoformat(), "streak": streak})

    return result


def _last_checkin(db: Session, user_id: str) -> LastCheckin | None:
    session = db.execute(
        select(CheckupSession)
        .where(
            CheckupSession.user_id == user_id,
            CheckupSession.status == SessionStatus.completed,
        )
        .order_by(CheckupSession.completed_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    if session is None or session.completed_at is None:
        return None
    return LastCheckin(date=session.completed_at.date(), stats=session.stats)


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(user: Auth, db: DB) -> DashboardSummary:
    """Single round-trip for the dashboard initial load."""
    profile = _get_profile(db, user.id)

    # Apply lazy health decay
    decayed_health = _apply_health_decay(profile)
    if decayed_health != profile.mascot_health:
        profile.mascot_health = decayed_health
        profile.last_health_update = datetime.now(timezone.utc)
        db.commit()
        db.refresh(profile)

    current_streak = _compute_streak(db, user.id)

    # Update longest_streak if current exceeds it
    if current_streak > profile.longest_streak:
        profile.longest_streak = current_streak
        db.commit()
        db.refresh(profile)

    # Get checkin dates with historical streak values
    checkin_data = _checkin_dates_with_streaks(db, user.id, month=None)

    return DashboardSummary(
        brownie_points=_brownie_entries(db, user.id, days=30),
        streak=current_streak,
        longest_streak=profile.longest_streak,
        mascot_health=profile.mascot_health,
        last_checkin=_last_checkin(db, user.id),
        checkin_dates=checkin_data,
    )


@router.get("/brownie-points", response_model=BrowniePointsResponse)
def get_brownie_points(
    user: Auth,
    db: DB,
    days: int = Query(default=30, ge=1, le=365),
) -> BrowniePointsResponse:
    return BrowniePointsResponse(
        days=days, entries=_brownie_entries(db, user.id, days=days)
    )


@router.get("/streak", response_model=StreakResponse)
def get_streak(user: Auth, db: DB) -> StreakResponse:
    return StreakResponse(streak=_compute_streak(db, user.id))


@router.get("/mascot", response_model=MascotResponse)
def get_mascot(user: Auth, db: DB) -> MascotResponse:
    profile = _get_profile(db, user.id)
    return MascotResponse(mascot_health=profile.mascot_health)


@router.get("/last-checkin", response_model=LastCheckin | None)
def get_last_checkin(user: Auth, db: DB) -> LastCheckin | None:
    return _last_checkin(db, user.id)


@router.get("/checkin-dates", response_model=CheckinDatesResponse)
def get_checkin_dates(
    user: Auth,
    db: DB,
    month: str | None = Query(
        default=None, description="Filter to a specific month (YYYY-MM)"
    ),
) -> CheckinDatesResponse:
    return CheckinDatesResponse(
        month=month or "", dates=_checkin_dates(db, user.id, month=month)
    )
