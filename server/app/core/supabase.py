import logging
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_supabase_client() -> Client:
    key = settings.SUPABASE_ANON_KEY
    mode = "ANON"

    if settings.SUPABASE_SERVICE_ROLE_KEY and settings.SUPABASE_SERVICE_ROLE_KEY != "YOUR_SUPABASE_SERVICE_ROLE_KEY":
        key = settings.SUPABASE_SERVICE_ROLE_KEY
        mode = "SERVICE_ROLE"

    logger.info("Supabase Client initialized in %s mode", mode)

    if not settings.SUPABASE_URL or not key:
        raise ValueError("Supabase URL and Key must be set in .env")

    return create_client(settings.SUPABASE_URL, key)
