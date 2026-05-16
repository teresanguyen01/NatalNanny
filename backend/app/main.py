from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routers import health, me

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
