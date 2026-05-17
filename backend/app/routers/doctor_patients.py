"""Doctor-patient relationship management endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import CurrentUser, get_current_user
from datetime import datetime, timezone

from app.models.doctor_patient import ConnectionStatus, DoctorPatient
from app.models.user import UserProfile, UserRole
from app.schemas.user import ConnectionRequestCreate, ConnectionWithStatus, DoctorPatientCreate, DoctorPatientRead

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


def _get_profile_with_role(db: Session, user_id: str) -> UserProfile:
    """Get profile and ensure it has a role assigned."""
    profile = db.get(UserProfile, uuid.UUID(user_id))
    if profile is None or profile.role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must select a role before managing connections.",
        )
    return profile


@router.get("/doctor-patients", response_model=list[DoctorPatientRead])
def list_my_patients(user: Auth, db: DB) -> list[DoctorPatient]:
    """List accepted patients for the current doctor."""
    _require_role(db, user.id, UserRole.doctor)
    return db.execute(
        select(DoctorPatient).where(
            DoctorPatient.doctor_id == uuid.UUID(user.id),
            DoctorPatient.status == ConnectionStatus.accepted,
        )
    ).scalars().all()


@router.post("/doctor-patients", response_model=DoctorPatientRead, status_code=status.HTTP_201_CREATED)
def add_patient(payload: DoctorPatientCreate, user: Auth, db: DB) -> DoctorPatient:
    """Add a patient to the current doctor's list. Creates an accepted connection (legacy endpoint)."""
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

    link = DoctorPatient(
        doctor_id=uuid.UUID(user.id),
        patient_id=payload.patient_id,
        status=ConnectionStatus.accepted,
        initiator_id=uuid.UUID(user.id),
    )
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
    """List accepted doctors assigned to the current patient."""
    _require_role(db, user.id, UserRole.patient)
    return db.execute(
        select(DoctorPatient).where(
            DoctorPatient.patient_id == uuid.UUID(user.id),
            DoctorPatient.status == ConnectionStatus.accepted,
        )
    ).scalars().all()


# ── Connection Request endpoints ──────────────────────────────────────────────


@router.post("/connection-requests", response_model=ConnectionWithStatus, status_code=status.HTTP_201_CREATED)
def send_connection_request(payload: ConnectionRequestCreate, user: Auth, db: DB) -> DoctorPatient:
    """Send a connection request to another user (bidirectional)."""
    current_profile = _get_profile_with_role(db, user.id)

    if payload.target_user_id == uuid.UUID(user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send a connection request to yourself.",
        )

    # Verify target exists and has opposite role
    target_profile = db.get(UserProfile, payload.target_user_id)
    if not target_profile or not target_profile.role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found or hasn't selected a role.",
        )

    # Verify opposite roles
    if current_profile.role == target_profile.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot connect users with the same role. Doctors can only connect with patients.",
        )

    # Determine doctor_id and patient_id based on roles
    if current_profile.role == UserRole.doctor:
        doctor_id = uuid.UUID(user.id)
        patient_id = payload.target_user_id
    else:
        doctor_id = payload.target_user_id
        patient_id = uuid.UUID(user.id)

    # Check for existing connection
    existing = db.execute(
        select(DoctorPatient).where(
            DoctorPatient.doctor_id == doctor_id,
            DoctorPatient.patient_id == patient_id,
        )
    ).scalar_one_or_none()

    if existing:
        if existing.status == ConnectionStatus.pending:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A connection request is already pending with this user.",
            )
        elif existing.status == ConnectionStatus.accepted:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A connection already exists with this user.",
            )
        elif existing.status == ConnectionStatus.rejected:
            # Allow re-request after 30 days
            days_since_rejection = (datetime.now(timezone.utc) - existing.created_at.replace(tzinfo=timezone.utc)).days
            if days_since_rejection < 30:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {30 - days_since_rejection} more days before sending another request.",
                )
            # Update existing connection
            existing.status = ConnectionStatus.pending
            existing.initiator_id = uuid.UUID(user.id)
            db.commit()
            db.refresh(existing)
            return existing

    # Create new connection request
    connection = DoctorPatient(
        doctor_id=doctor_id,
        patient_id=patient_id,
        status=ConnectionStatus.pending,
        initiator_id=uuid.UUID(user.id),
    )
    db.add(connection)
    db.commit()
    db.refresh(connection)
    return connection


@router.get("/connection-requests/received", response_model=list[ConnectionWithStatus])
def list_received_connection_requests(user: Auth, db: DB) -> list[DoctorPatient]:
    """List pending connection requests where current user is the recipient."""
    current_profile = _get_profile_with_role(db, user.id)

    if current_profile.role == UserRole.doctor:
        # Doctor receives requests from patients
        connections = db.execute(
            select(DoctorPatient).where(
                DoctorPatient.doctor_id == uuid.UUID(user.id),
                DoctorPatient.status == ConnectionStatus.pending,
                DoctorPatient.initiator_id != uuid.UUID(user.id),
            )
        ).scalars().all()
    else:
        # Patient receives requests from doctors
        connections = db.execute(
            select(DoctorPatient).where(
                DoctorPatient.patient_id == uuid.UUID(user.id),
                DoctorPatient.status == ConnectionStatus.pending,
                DoctorPatient.initiator_id != uuid.UUID(user.id),
            )
        ).scalars().all()

    return connections


@router.get("/connection-requests/sent", response_model=list[ConnectionWithStatus])
def list_sent_connection_requests(user: Auth, db: DB) -> list[DoctorPatient]:
    """List pending connection requests sent by current user."""
    current_profile = _get_profile_with_role(db, user.id)

    if current_profile.role == UserRole.doctor:
        # Doctor's sent requests
        connections = db.execute(
            select(DoctorPatient).where(
                DoctorPatient.doctor_id == uuid.UUID(user.id),
                DoctorPatient.status == ConnectionStatus.pending,
                DoctorPatient.initiator_id == uuid.UUID(user.id),
            )
        ).scalars().all()
    else:
        # Patient's sent requests
        connections = db.execute(
            select(DoctorPatient).where(
                DoctorPatient.patient_id == uuid.UUID(user.id),
                DoctorPatient.status == ConnectionStatus.pending,
                DoctorPatient.initiator_id == uuid.UUID(user.id),
            )
        ).scalars().all()

    return connections


@router.post("/connection-requests/{connection_id}/accept", response_model=ConnectionWithStatus)
def accept_connection_request(connection_id: str, user: Auth, db: DB) -> DoctorPatient:
    """Accept a pending connection request. connection_id format: doctor_id:patient_id"""
    _get_profile_with_role(db, user.id)

    # Parse connection_id
    try:
        parts = connection_id.split(":")
        if len(parts) != 2:
            raise ValueError("Invalid format")
        doctor_id = uuid.UUID(parts[0])
        patient_id = uuid.UUID(parts[1])
    except (ValueError, IndexError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid connection_id format. Expected: doctor_id:patient_id",
        )

    # Get connection
    connection = db.execute(
        select(DoctorPatient).where(
            DoctorPatient.doctor_id == doctor_id,
            DoctorPatient.patient_id == patient_id,
        )
    ).scalar_one_or_none()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found.",
        )

    if connection.status != ConnectionStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connection is not in pending status.",
        )

    # Verify user is recipient (not initiator)
    if connection.initiator_id == uuid.UUID(user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot accept your own connection request.",
        )

    # Verify user is part of the connection
    if connection.doctor_id != uuid.UUID(user.id) and connection.patient_id != uuid.UUID(user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this connection.",
        )

    connection.status = ConnectionStatus.accepted
    db.commit()
    db.refresh(connection)
    return connection


@router.post("/connection-requests/{connection_id}/reject", response_model=ConnectionWithStatus)
def reject_connection_request(connection_id: str, user: Auth, db: DB) -> DoctorPatient:
    """Reject a pending connection request. connection_id format: doctor_id:patient_id"""
    _get_profile_with_role(db, user.id)

    # Parse connection_id
    try:
        parts = connection_id.split(":")
        if len(parts) != 2:
            raise ValueError("Invalid format")
        doctor_id = uuid.UUID(parts[0])
        patient_id = uuid.UUID(parts[1])
    except (ValueError, IndexError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid connection_id format. Expected: doctor_id:patient_id",
        )

    # Get connection
    connection = db.execute(
        select(DoctorPatient).where(
            DoctorPatient.doctor_id == doctor_id,
            DoctorPatient.patient_id == patient_id,
        )
    ).scalar_one_or_none()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found.",
        )

    if connection.status != ConnectionStatus.pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connection is not in pending status.",
        )

    # Verify user is recipient (not initiator)
    if connection.initiator_id == uuid.UUID(user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot reject your own connection request.",
        )

    # Verify user is part of the connection
    if connection.doctor_id != uuid.UUID(user.id) and connection.patient_id != uuid.UUID(user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this connection.",
        )

    connection.status = ConnectionStatus.rejected
    db.commit()
    db.refresh(connection)
    return connection
