"""Server-side provider validation architecture."""
from __future__ import annotations

import logging
from typing import TypedDict
from app.core.config import settings

logger = logging.getLogger(__name__)

class ValidatedProviderIdentity(TypedDict):
    provider_user_id: str
    email: str | None
    first_name: str | None
    last_name: str | None

def validate_google_token(token: str) -> ValidatedProviderIdentity:
    """Validate Google ID token server-side."""
    if not settings.GOOGLE_CLIENT_ID:
        logger.error("Google authentication attempted but GOOGLE_CLIENT_ID is not configured.")
        raise NotImplementedError("Google authentication is not fully configured on the server.")
        
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests
    except ImportError as e:
        logger.error("Google auth library missing: pip install google-auth")
        raise NotImplementedError("Google authentication library missing.") from e

    try:
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), settings.GOOGLE_CLIENT_ID)
        
        # ID token is valid. Get the user's Google Account ID.
        userid = idinfo['sub']
        return ValidatedProviderIdentity(
            provider_user_id=userid,
            email=idinfo.get("email"),
            first_name=idinfo.get("given_name"),
            last_name=idinfo.get("family_name")
        )
    except ValueError as e:
        raise ValueError("Invalid Google token.") from e

def validate_apple_token(token: str) -> ValidatedProviderIdentity:
    """Validate Apple ID token server-side."""
    if not settings.APPLE_CLIENT_ID:
        logger.error("Apple authentication attempted but APPLE_CLIENT_ID is not configured.")
        raise NotImplementedError("Apple authentication is not fully configured on the server.")
        
    try:
        import jwt
        from jwt import PyJWKClient
    except ImportError as e:
        logger.error("JWT library missing: pip install PyJWT")
        raise NotImplementedError("JWT library missing.") from e

    try:
        # Fetch Apple's public keys
        jwks_client = PyJWKClient("https://appleid.apple.com/auth/keys")
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        data = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.APPLE_CLIENT_ID,
            issuer="https://appleid.apple.com",
            options={"verify_exp": True}
        )
        
        return ValidatedProviderIdentity(
            provider_user_id=data["sub"],
            email=data.get("email"),
            first_name=None, # Apple only provides name on first auth in a separate payload, not the JWT
            last_name=None
        )
    except Exception as e:
        raise ValueError("Invalid Apple token.") from e
