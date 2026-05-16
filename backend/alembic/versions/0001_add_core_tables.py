"""add core tables: user_profiles, health_records, checkup_sessions, messaging

Revision ID: 0001_add_core_tables
Revises: 560a072cb656
Create Date: 2026-05-16

Tables created:
  - user_profiles        (mascot_health, timestamps)
  - health_records       (JSONB data, user FK)
  - checkup_sessions     (status enum, stats JSONB, brownie_points, rppg_raw)
  - message_threads      (type enum, last_message_at)
  - thread_participants  (thread_id + user_id composite PK)
  - messages             (sender_type enum, content, read_at)
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_add_core_tables"
down_revision: Union[str, None] = "560a072cb656"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enums ────────────────────────────────────────────────────────────────
    session_status = postgresql.ENUM(
        "pending", "in_progress", "completed", "cancelled",
        name="session_status",
        create_type=True,
    )
    thread_type = postgresql.ENUM(
        "user", "agent",
        name="thread_type",
        create_type=True,
    )
    sender_type = postgresql.ENUM(
        "user", "agent",
        name="sender_type",
        create_type=True,
    )
    session_status.create(op.get_bind(), checkfirst=True)
    thread_type.create(op.get_bind(), checkfirst=True)
    sender_type.create(op.get_bind(), checkfirst=True)

    # ── user_profiles ─────────────────────────────────────────────────────────
    op.create_table(
        "user_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False,
                  comment="Mirrors auth.users.id from Supabase"),
        sa.Column("mascot_health", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    # ── health_records ────────────────────────────────────────────────────────
    op.create_table(
        "health_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False,
                  server_default="'{}'::jsonb"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )
    op.create_index("ix_health_records_user_id", "health_records", ["user_id"])

    # ── checkup_sessions ──────────────────────────────────────────────────────
    op.create_table(
        "checkup_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.Enum("pending", "in_progress", "completed", "cancelled",
                                    name="session_status", create_type=False),
                  nullable=False, server_default="pending"),
        sa.Column("stats", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("rppg_raw", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("brownie_points", sa.Float(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Composite index covering: 30-day brownie chart, streak, calendar queries
    op.create_index(
        "ix_checkup_sessions_user_completed",
        "checkup_sessions",
        ["user_id", "completed_at"],
    )

    # ── message_threads ───────────────────────────────────────────────────────
    op.create_table(
        "message_threads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("type", sa.Enum("user", "agent", name="thread_type", create_type=False),
                  nullable=False),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    # ── thread_participants ───────────────────────────────────────────────────
    op.create_table(
        "thread_participants",
        sa.Column("thread_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("message_threads.id", ondelete="CASCADE"),
                  primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
    )
    op.create_index("ix_thread_participants_user", "thread_participants", ["user_id"])

    # ── messages ──────────────────────────────────────────────────────────────
    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("thread_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("message_threads.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True), nullable=True,
                  comment="Null when sender_type is agent"),
        sa.Column("sender_type", sa.Enum("user", "agent", name="sender_type", create_type=False),
                  nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_messages_thread_id", "messages", ["thread_id"])


def downgrade() -> None:
    op.drop_table("messages")
    op.drop_index("ix_thread_participants_user", table_name="thread_participants")
    op.drop_table("thread_participants")
    op.drop_table("message_threads")
    op.drop_index("ix_checkup_sessions_user_completed", table_name="checkup_sessions")
    op.drop_table("checkup_sessions")
    op.drop_index("ix_health_records_user_id", table_name="health_records")
    op.drop_table("health_records")
    op.drop_table("user_profiles")

    op.execute("DROP TYPE IF EXISTS sender_type")
    op.execute("DROP TYPE IF EXISTS thread_type")
    op.execute("DROP TYPE IF EXISTS session_status")
