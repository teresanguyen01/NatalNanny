"""Doctor-patient relationship management endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import CurrentUser, get_current_user
from app.models.doctor_patient import DoctorPatient
from app.models.user import UserProfile, UserRole
from app.schemas.user import DoctorPatientCreate, DoctorPatientRead

router = APIRouter(tags=["doctor-patients"])

Auth = Annotated[CurrentUser, Depends(get_current_user)]
DB = Annotated[Session, Depends(get_db)]


def _require_role(db: Session, user_id: str, required: UserRole) -> UserProfile:
    profile = db.get(UserProfile, uuid.UUID(user_id))
    if profile is None or profile.role != required:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This action requires role '{required.value}'.",
        )
    return profile


@router.get("/doctor-patients", response_model=list[DoctorPatientRead])
def list_my_patients(user: Auth, db: DB) -> list[DoctorPatient]:
    """List patients for the current doctor."""
    _require_role(db, user.id, UserRole.doctor)
    return db.execute(
        select(DoctorPatient).where(DoctorPatient.doctor_id == uuid.UUID(user.id))
    ).scalars().all()


@router.post("/doctor-patients", response_model=DoctorPatientRead, status_code=status.HTTP_201_CREATED)
def add_patient(payload: DoctorPatientCreate, user: Auth, db: DB) -> DoctorPatient:
    """Add a patient to the current doctor's list."""
    _require_role(db, user.id, UserRole.doctor)

    # Verify patient exists
    patient = db.get(UserProfile, payload.patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    # Check not already linked
    existing = db.execute(
        select(DoctorPatient).where(
            DoctorPatient.doctor_id == uuid.UUID(user.id),
            DoctorPatient.patient_id == payload.patient_id,
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Patient already added.")

    link = DoctorPatient(doctor_id=uuid.UUID(user.id), patient_id=payload.patient_id)
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.delete("/doctor-patients/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_patient(patient_id: uuid.UUID, user: Auth, db: DB) -> None:
    """Remove a patient from the current doctor's list."""
    _require_role(db, user.id, UserRole.doctor)

    link = db.execute(
        select(DoctorPatient).where(
            DoctorPatient.doctor_id == uuid.UUID(user.id),
            DoctorPatient.patient_id == patient_id,
        )
    ).scalar_one_or_none()
    if link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relationship not found.")

    db.delete(link)
    db.commit()


@router.get("/my-doctors", response_model=list[DoctorPatientRead])
def list_my_doctors(user: Auth, db: DB) -> list[DoctorPatient]:
    """List doctors assigned to the current patient."""
    _require_role(db, user.id, UserRole.patient)
    return db.execute(
        select(DoctorPatient).where(DoctorPatient.patient_id == uuid.UUID(user.id))
    ).scalars().all()
