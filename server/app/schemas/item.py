from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

class StoryBase(BaseModel):
    title: str
    media_type: str = Field(pattern="^(movie|book|tv)$")
    subtype: Optional[str] = None
    year: Optional[int] = None
    external_id: str
    poster_path: Optional[str] = None
    source: str
    rating: int = 0
    notes: Optional[str] = None

class StoryCreate(StoryBase):
    created_at: Optional[datetime] = None

class StoryInstance(BaseModel):
    id: UUID
    created_at: datetime
    rating: int
    notes: Optional[str] = None
    viewing_number: int = 1

class StoryResponse(StoryBase):
    id: UUID
    user_id: UUID
    viewing_number: Optional[int] = 1
    created_at: datetime
    # related_instances: List[StoryInstance] = []

    class Config:
        from_attributes = True

class SearchResponse(BaseModel):
    results: List[StoryBase]
    page: int
    total_results: int

class Review(BaseModel):
    author: str
    content: str
    rating: Optional[float] = None

class MediaAsset(BaseModel):
    type: str  # image, video, link, quote
    url: Optional[str] = None
    thumbnail: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None

class StreamingProvider(BaseModel):
    provider_name: str
    logo_path: str
    type: str # 'flatrate', 'rent', 'buy'

class ItemDetailResponse(StoryBase):
    overview: Optional[str] = None
    synopsis: Optional[str] = None
    genres: List[str] = []
    status: Optional[str] = None # Released, Planned, etc.
    revenue: Optional[int] = None
    budget: Optional[int] = None
    original_language: Optional[str] = None
    # Book specific fields
    isbn: Optional[str] = None
    subtitle: Optional[str] = None
    page_count: Optional[int] = None
    
    streaming_providers: List[StreamingProvider] = []
    reviews: List[Review] = []
    top_reviews: List[Review] = []
    cast: List[str] = []
    directors: List[str] = []
    authors: List[str] = []
    publisher: Optional[str] = None
    production_companies: List[str] = []
    origin_country: Optional[str] = None # ISO Code
    original_language: Optional[str] = None
    spoken_languages: List[str] = []
    quotes: List[str] = []
    related_media: List[MediaAsset] = []
    runtime: Optional[str] = None
    public_rating: Optional[float] = None
    backdrop_path: Optional[str] = None

class StoryCheckResponse(BaseModel):
    exists: bool
    instances: List[StoryInstance]
