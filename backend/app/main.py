import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings

logger = logging.getLogger(__name__)
from .routers import auth, checkup, dashboard, doctor_patients, health, me, users
from .routers.messaging import router as messaging_router
from .routers.messaging import ws_router as messaging_ws_router
from .routers import rppg
from .routers import voice_checkup
from .routers import tts
from .routers import health_documents
from .routers import rag_chat

settings = get_settings()

# Global scheduler instance
scheduler: AsyncIOScheduler = None


def start_reminder_scheduler():
    """Initialize and start APScheduler for SMS reminders."""
    global scheduler

    from app.db.session import SessionLocal
    from app.services.twilio_service import TwilioService
    from app.services.reminder_service import ReminderService

    settings = get_settings()

    # Only start if Twilio configured
    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        logger.warning("Twilio not configured - reminder scheduler disabled")
        return

    scheduler = AsyncIOScheduler()

    def run_reminder_check():
        """Execute reminder check with DB session."""
        db = SessionLocal()
        try:
            twilio = TwilioService(settings)
            reminder_service = ReminderService(db, settings, twilio)
            summary = reminder_service.check_and_send_reminders()
            logger.info(f"Reminder check: {summary}")
        except Exception as e:
            logger.error(f"Reminder check error: {e}", exc_info=True)
        finally:
            db.close()

    scheduler.add_job(
        run_reminder_check,
        trigger=IntervalTrigger(minutes=15),
        id="check_daily_reminders",
        name="Check and send daily check-in reminders",
        max_instances=1,  # Prevent overlapping runs
    )

    scheduler.start()
    logger.info("Reminder scheduler started - checking every 15 minutes")


def stop_reminder_scheduler():
    """Gracefully shut down scheduler."""
    global scheduler
    if scheduler:
        scheduler.shutdown(wait=True)
        logger.info("Reminder scheduler stopped")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    logger.info("Starting NatalNanny API")
    start_reminder_scheduler()
    yield
    logger.info("Shutting down NatalNanny API")
    stop_reminder_scheduler()


app = FastAPI(
    title="NatalNanny API",
    description="Post-natal rPPG analysis and maternal care platform.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(me.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(checkup.router, prefix="/api")
app.include_router(rppg.router, prefix="/api")
app.include_router(voice_checkup.router, prefix="/api")
app.include_router(tts.router, prefix="/api")
app.include_router(doctor_patients.router, prefix="/api")
# REST messaging routes under /api
app.include_router(messaging_router, prefix="/api")
# WebSocket endpoint at /ws/messaging/{thread_id} (no /api prefix)
app.include_router(messaging_ws_router)
# Health documents and RAG chat
app.include_router(health_documents.router, prefix="/api")
app.include_router(rag_chat.router, prefix="/api")

# Production: mount the built React SPA and serve the index for all unmatched client routes.
# Uncomment once `npm run build` has been run in frontend/:
#
# from pathlib import Path
# from fastapi.staticfiles import StaticFiles
# from fastapi.responses import FileResponse
#
# FRONTEND_DIST = Path(__file__).parent.parent.parent / "frontend" / "dist"
# app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")
#
# @app.get("/{full_path:path}", include_in_schema=False)
# def spa_fallback(full_path: str):
#     return FileResponse(FRONTEND_DIST / "index.html")
