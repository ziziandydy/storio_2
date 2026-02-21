from supabase import create_client, Client
from app.core.config import settings

def get_supabase_client() -> Client:
    # Use Service Role Key if available (Backend Admin Mode)
    # Otherwise fallback to Anon Key (RLS Mode)
    key = settings.SUPABASE_ANON_KEY
    mode = "ANON"
    
    if settings.SUPABASE_SERVICE_ROLE_KEY and settings.SUPABASE_SERVICE_ROLE_KEY != "YOUR_SUPABASE_SERVICE_ROLE_KEY":
        key = settings.SUPABASE_SERVICE_ROLE_KEY
        mode = "SERVICE_ROLE"
        
    # Debug log (Safely masked)
    print(f"DEBUG: Supabase Client initialized in {mode} mode. Key prefix: {key[:10]}...")
        
    if not settings.SUPABASE_URL or not key:
        raise ValueError("Supabase URL and Key must be set in .env")
    
    return create_client(settings.SUPABASE_URL, key)
