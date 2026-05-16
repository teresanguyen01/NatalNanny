from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import checkup, dashboard, health, me, users
from .routers.messaging import router as messaging_router
from .routers.messaging import ws_router as messaging_ws_router

settings = get_settings()

app = FastAPI(
    title="NatalNanny API",
    description="Post-natal rPPG analysis and maternal care platform.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(me.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(checkup.router, prefix="/api")
# REST messaging routes under /api
app.include_router(messaging_router, prefix="/api")
# WebSocket endpoint at /ws/messaging/{thread_id} (no /api prefix)
app.include_router(messaging_ws_router)

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
