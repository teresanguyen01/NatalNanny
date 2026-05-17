"""Settings API for user preferences."""
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.models.user import UserProfile

router = APIRouter(prefix="/settings", tags=["settings"])

# Type aliases for dependency injection
Auth = Annotated[dict, Depends(get_current_user)]
DB = Annotated[Session, Depends(get_db)]


# ── Schemas ───────────────────────────────────────────────────────────────────


class NotificationPreferences(BaseModel):
    """User notification preferences."""

    email_reminders_enabled: bool = Field(
        ..., description="Whether daily email reminders are enabled"
    )


class NotificationPreferencesUpdate(BaseModel):
    """Update notification preferences."""

    email_reminders_enabled: bool | None = Field(
        None, description="Whether daily email reminders are enabled"
    )


class TimezoneUpdate(BaseModel):
    """Update user timezone."""

    timezone: str = Field(
        ...,
        max_length=50,
        description="IANA timezone (e.g., 'America/Los_Angeles')",
        examples=["America/Los_Angeles", "America/New_York", "Europe/London"],
    )


# ── Notification Preferences ──────────────────────────────────────────────────


@router.get("/notifications", response_model=NotificationPreferences)
def get_notification_preferences(auth: Auth, db: DB) -> NotificationPreferences:
    """
    Get user's notification preferences.

    Returns:
        Current notification settings
    """
    user_id = uuid.UUID(auth["sub"])
    profile = db.get(UserProfile, user_id)

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found"
        )

    return NotificationPreferences(
        email_reminders_enabled=profile.email_reminders_enabled
    )


@router.patch("/notifications", response_model=NotificationPreferences)
def update_notification_preferences(
    preferences: NotificationPreferencesUpdate, auth: Auth, db: DB
) -> NotificationPreferences:
    """
    Update user's notification preferences.

    Args:
        preferences: New notification settings

    Returns:
        Updated notification settings
    """
    user_id = uuid.UUID(auth["sub"])
    profile = db.get(UserProfile, user_id)

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found"
        )

    # Update fields if provided
    if preferences.email_reminders_enabled is not None:
        profile.email_reminders_enabled = preferences.email_reminders_enabled

    db.commit()
    db.refresh(profile)

    return NotificationPreferences(
        email_reminders_enabled=profile.email_reminders_enabled
    )


# ── Timezone ──────────────────────────────────────────────────────────────────


@router.get("/timezone")
def get_timezone(auth: Auth, db: DB) -> dict:
    """
    Get user's timezone setting.

    Returns:
        Current timezone
    """
    user_id = uuid.UUID(auth["sub"])
    profile = db.get(UserProfile, user_id)

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found"
        )

    return {"timezone": profile.timezone}


@router.patch("/timezone")
def update_timezone(timezone_data: TimezoneUpdate, auth: Auth, db: DB) -> dict:
    """
    Update user's timezone.

    Args:
        timezone_data: New timezone

    Returns:
        Updated timezone
    """
    user_id = uuid.UUID(auth["sub"])
    profile = db.get(UserProfile, user_id)

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found"
        )

    # Validate timezone (basic check - pytz will validate more thoroughly)
    import pytz

    try:
        pytz.timezone(timezone_data.timezone)
    except pytz.UnknownTimeZoneError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid timezone: {timezone_data.timezone}",
        )

    profile.timezone = timezone_data.timezone
    db.commit()
    db.refresh(profile)

    return {"timezone": profile.timezone}
