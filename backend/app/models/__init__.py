# Import all model modules so Alembic autogenerate sees every table.
from app.models import admin, checkin, doctor_patient, messaging, user  # noqa: F401
