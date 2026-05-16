import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, Index, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SessionStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class CheckupSession(Base):
    __tablename__ = "checkup_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus, name="session_status"),
        nullable=False,
        default=SessionStatus.pending,
    )
    stats: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    rppg_raw: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # Brownie points are set on session completion. Algorithm is a stub (TODO).
    brownie_points: Mapped[float | None] = mapped_column(Float, nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        # Covers: 30-day brownie chart, streak calculation, calendar panel
        Index("ix_checkup_sessions_user_completed", "user_id", "completed_at"),
    )
