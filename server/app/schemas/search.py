from pydantic import BaseModel, Field
from typing import Optional, List

class AISearchRequest(BaseModel):
    query: str
    media_type: Optional[str] = Field(default="movie", pattern="^(movie|book|tv|all)$")

class TMDBDiscoverParams(BaseModel):
    with_genres: Optional[str] = None
    with_keywords: Optional[str] = None
    with_cast: Optional[str] = None
    with_crew: Optional[str] = None
    primary_release_year: Optional[int] = None
    sort_by: Optional[str] = Field(default="popularity.desc")

class GoogleBooksSearchParams(BaseModel):
    q: Optional[str] = None
    subject: Optional[str] = None
    inauthor: Optional[str] = None

class AISearchIntent(BaseModel):
    is_semantic: bool
    media_type: str = Field(pattern="^(movie|book|tv)$")
    tmdb_params: Optional[TMDBDiscoverParams] = None
    google_books_params: Optional[GoogleBooksSearchParams] = None
    fallback_query: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0)
    explanation: Optional[str] = None
