from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(url: str) -> str:
    """Map Supabase-style URIs to the psycopg3 SQLAlchemy driver."""
    if url.startswith("postgres://"):
        url = "postgresql+psycopg://" + url.removeprefix("postgres://")
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url.removeprefix("postgresql://")
    elif url.startswith("postgresql+psycopg2://"):
        url = "postgresql+psycopg://" + url.removeprefix("postgresql+psycopg2://")

    if "supabase.com" in url and "sslmode=" not in url:
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}sslmode=require"

    return url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # JWT secret for signing/verifying auth tokens
    jwt_secret: str = "dev-secret-change-me"
    # OpenAI — used to issue ephemeral Realtime tokens for the check-up voice agent
    openai_api_key: str = ""
    # SQLAlchemy / Alembic — Postgres connection URI (Supabase or local CLI)
    database_url: str = (
        "postgresql+psycopg://postgres:postgres@127.0.0.1:54322/postgres"
    )
    # Comma-separated list of allowed CORS origins
    cors_origins: str = "http://localhost:5173"

    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_database_url(cls, value: str) -> str:
        return normalize_database_url(value)

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def sqlalchemy_connect_args(self) -> dict:
        # Required for Supabase transaction pooler (PgBouncer).
        if "pooler.supabase.com" in self.database_url:
            return {"prepare_threshold": None}
        return {}


@lru_cache
def get_settings() -> Settings:
    return Settings()
