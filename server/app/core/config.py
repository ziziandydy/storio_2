from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Storio 2 API"
    API_V1_STR: str = "/api/v1"
    
    # External APIs
    TMDB_API_KEY: Optional[str] = None
    TMDB_ACCESS_TOKEN: Optional[str] = None # Added support for v4 token
    GOOGLE_BOOKS_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None

    # CORS
    DEV_CORS_ORIGIN: Optional[str] = None
    FRONTEND_URL: Optional[str] = None
    CORS_ORIGINS: Optional[str] = None

    # Supabase
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    DATABASE_URL: Optional[str] = None
    SUPABASE_PUBLISHABLE_KEY: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
