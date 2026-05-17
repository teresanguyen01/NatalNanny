"""Replace SMS reminders with email reminders

Revision ID: 500a84a57b9d
Revises: 60ecd9a2217e
Create Date: 2026-05-17 12:13:25.923150

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '500a84a57b9d'
down_revision: Union[str, None] = '60ecd9a2217e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add email notification fields to user_profiles
    op.add_column('user_profiles', sa.Column('email', sa.String(length=320), nullable=True, comment='Denormalized from Supabase auth for performance'))
    op.add_column('user_profiles', sa.Column('email_reminders_enabled', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('user_profiles', sa.Column('last_email_sent_date', sa.Date(), nullable=True))

    # Drop old SMS reminder fields
    op.drop_column('user_profiles', 'last_reminder_sent_date')
    op.drop_column('user_profiles', 'sms_reminders_enabled')


def downgrade() -> None:
    # Restore SMS reminder fields
    op.add_column('user_profiles', sa.Column('sms_reminders_enabled', sa.BOOLEAN(), server_default='true', autoincrement=False, nullable=False))
    op.add_column('user_profiles', sa.Column('last_reminder_sent_date', sa.DATE(), autoincrement=False, nullable=True))

    # Drop email notification fields
    op.drop_column('user_profiles', 'last_email_sent_date')
    op.drop_column('user_profiles', 'email_reminders_enabled')
    op.drop_column('user_profiles', 'email')
