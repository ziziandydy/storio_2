import logging
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.core.supabase import get_supabase_client
from app.core.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer()

def get_language(accept_language: str = Header("zh-TW")) -> str:
    """
    Parses the Accept-Language header to determine the preferred language.
    Defaults to 'zh-TW' if not provided or invalid.
    Supported: 'zh-TW', 'en-US'.
    """
    if not accept_language:
        return "zh-TW"
    
    # Simple check for now (can be improved with parsing q-values)
    if "en" in accept_language.lower():
        return "en-US"
    return "zh-TW"

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Verifies the Supabase JWT and returns the User object.
    """
    token = credentials.credentials
    try:
        # Verify the token using Supabase Auth
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user_response.user
    except Exception as e:
        logger.error("Token validation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
