from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class UserProfileRead(BaseModel):
    id: str
    mascot_health: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    mascot_health: int | None = Field(None, ge=0, le=100)


class HealthRecordRead(BaseModel):
    user_id: str
    data: dict[str, Any]
    updated_at: datetime

    model_config = {"from_attributes": True}


class HealthRecordUpdate(BaseModel):
    """Partial merge — only provided keys are written; existing keys are preserved."""

    data: dict[str, Any]
