import httpx
from functools import lru_cache
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from .config import Settings, get_settings

bearer_scheme = HTTPBearer()


class CurrentUser(BaseModel):
    id: str
    email: str


@lru_cache(maxsize=1)
def _get_jwks(supabase_url: str) -> dict:
    """Fetch and cache the JWKS (JSON Web Key Set) from Supabase."""
    if not supabase_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SUPABASE_URL is not configured on the server.",
        )

    jwks_url = f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"

    try:
        response = httpx.get(jwks_url, timeout=10.0)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not fetch Supabase JWKS: {exc}",
        ) from exc


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> CurrentUser:
    token = credentials.credentials

    jwks = _get_jwks(settings.supabase_url)

    try:
        # Decode without verification first to get the key ID
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        # Find the matching key in JWKS
        key = None
        for jwk in jwks.get("keys", []):
            if jwk.get("kid") == kid:
                key = jwt.algorithms.RSAAlgorithm.from_jwk(jwk)
                break

        if not key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token signing key not found in JWKS.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verify and decode with the public key
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience="authenticated",
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user_id: str | None = payload.get("sub")
    email: str | None = payload.get("email")

    if not user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload missing required fields.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return CurrentUser(id=user_id, email=email)
