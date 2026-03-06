from typing import List
import httpx
from fastapi import APIRouter, Query, HTTPException, Depends
from app.schemas.item import SearchResponse, StoryBase, ItemDetailResponse
from app.schemas.search import AISearchRequest
from app.services.search_service import SearchService
from app.services.semantic_search_service import SemanticSearchService
from app.api.deps import get_language

router = APIRouter()

@router.get("/trending/movies", response_model=List[StoryBase])
async def trending_movies(language: str = Depends(get_language)):
    """
    Get trending movies (Top 20 from this week).
    """
    async with httpx.AsyncClient() as client:
        return await SearchService.get_trending_movies(client, language)

@router.get("/trending/series", response_model=List[StoryBase])
async def trending_series(language: str = Depends(get_language)):
    """
    Get trending TV series (Top 20 from this week).
    """
    async with httpx.AsyncClient() as client:
        return await SearchService.get_trending_series(client, language)

@router.get("/trending/books", response_model=List[StoryBase])
async def trending_books(language: str = Depends(get_language)):
    """
    Get trending/recommended books (Top 20).
    """
    async with httpx.AsyncClient() as client:
        return await SearchService.get_trending_books(client, language)

@router.get("/details/{media_type}/{external_id}", response_model=ItemDetailResponse)
async def get_details(
    media_type: str, 
    external_id: str, 
    language: str = Depends(get_language),
    region: str = Query("TW", description="ISO 3166-1 region code for streaming providers")
):
    """
    Get detailed information for a specific movie or book.
    """
    async with httpx.AsyncClient() as client:
        details = await SearchService.get_item_details(client, media_type, external_id, language, region)
        if not details:
            raise HTTPException(status_code=404, detail="Item details not found")
        return details

@router.get("/", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, description="Search query for movies or books"),
    page: int = 1,
    language: str = Depends(get_language)
):
    """
    Search for movies and books (Standard).
    """
    results = await SearchService.search_multi(query=q, language=language)
    return SearchResponse(results=results, page=page, total_results=len(results))

@router.post("/ai", response_model=SearchResponse)
async def search_ai(
    request: AISearchRequest,
    page: int = 1,
    language: str = Depends(get_language)
):
    """
    Semantic Search using AI intent parsing.
    """
    # 1. Parse intent using the service
    intent = await SemanticSearchService.parse_intent(request.query, request.media_type)
    
    # 2. Call TMDB/Google Books with parsed structured parameters
    async with httpx.AsyncClient() as client:
        results = await SearchService.search_by_intent(client, intent, language)
        
    return SearchResponse(results=results, page=1, total_results=len(results))