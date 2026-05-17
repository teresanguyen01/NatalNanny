from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.user import UserRole


class UserProfileRead(BaseModel):
    id: UUID
    role: UserRole | None
    mascot_health: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    mascot_health: int | None = Field(None, ge=0, le=100)
    role: UserRole | None = None


class HealthRecordRead(BaseModel):
    user_id: UUID
    data: dict[str, Any]
    updated_at: datetime

    model_config = {"from_attributes": True}


class HealthRecordUpdate(BaseModel):
    """Partial merge — only provided keys are written; existing keys are preserved."""

    data: dict[str, Any]


class DoctorPatientCreate(BaseModel):
    patient_id: UUID


class DoctorPatientRead(BaseModel):
    doctor_id: UUID
    patient_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ContactRead(BaseModel):
    """Represents a messaging contact (doctor or patient)."""

    id: str
    role: UserRole | None
    display_name: str
    email: str | None = None
