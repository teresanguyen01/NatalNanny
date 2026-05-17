import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import CurrentUser, get_current_user
from app.models.user import HealthRecord, UserProfile
from app.schemas.user import (
    HealthRecordRead,
    HealthRecordUpdate,
    UserProfileRead,
    UserProfileUpdate,
)

router = APIRouter(prefix="/users", tags=["users"])

Auth = Annotated[CurrentUser, Depends(get_current_user)]
DB = Annotated[Session, Depends(get_db)]


def _get_or_create_profile(db: Session, user_id: str) -> UserProfile:
    profile = db.get(UserProfile, user_id)
    if profile is None:
        profile = UserProfile(id=uuid.UUID(user_id), mascot_health=50)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def _get_or_create_health_record(db: Session, user_id: str) -> HealthRecord:
    record = db.query(HealthRecord).filter(HealthRecord.user_id == user_id).first()
    if record is None:
        record = HealthRecord(user_id=uuid.UUID(user_id), data={})
        db.add(record)
        db.commit()
        db.refresh(record)
    return record


# ── Profile ──────────────────────────────────────────────────────────────────


@router.get("/me/profile", response_model=UserProfileRead)
def get_profile(user: Auth, db: DB) -> UserProfile:
    return _get_or_create_profile(db, user.id)


@router.patch("/me/profile", response_model=UserProfileRead)
def update_profile(payload: UserProfileUpdate, user: Auth, db: DB) -> UserProfile:
    profile = _get_or_create_profile(db, user.id)
    if payload.mascot_health is not None:
        profile.mascot_health = payload.mascot_health
    if payload.role is not None:
        # Role can only be set once (first-time setup)
        if profile.role is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Role has already been set and cannot be changed.",
            )
        profile.role = payload.role
    db.commit()
    db.refresh(profile)
    return profile


# ── Health record ─────────────────────────────────────────────────────────────


@router.get("/me/health-record", response_model=HealthRecordRead)
def get_health_record(user: Auth, db: DB) -> HealthRecord:
    return _get_or_create_health_record(db, user.id)


@router.patch("/me/health-record", response_model=HealthRecordRead)
def update_health_record(
    payload: HealthRecordUpdate, user: Auth, db: DB
) -> HealthRecord:
    """Partial merge — incoming keys overwrite existing keys, others are preserved.
    Called by the frontend when executing voice agent tool results.
    """
    record = _get_or_create_health_record(db, user.id)
    record.data = {**record.data, **payload.data}
    db.commit()
    db.refresh(record)
    return record
