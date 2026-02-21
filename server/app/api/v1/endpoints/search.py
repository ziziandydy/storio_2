from typing import List
import httpx
from fastapi import APIRouter, Query, HTTPException
from app.schemas.item import SearchResponse, StoryBase, ItemDetailResponse
from app.services.search_service import SearchService

router = APIRouter()

@router.get("/trending/movies", response_model=List[StoryBase])
async def trending_movies():
    """
    Get trending movies (Top 20 from this week).
    """
    async with httpx.AsyncClient() as client:
        return await SearchService.get_trending_movies(client)

@router.get("/trending/series", response_model=List[StoryBase])
async def trending_series():
    """
    Get trending TV series (Top 20 from this week).
    """
    async with httpx.AsyncClient() as client:
        return await SearchService.get_trending_series(client)

@router.get("/trending/books", response_model=List[StoryBase])
async def trending_books():
    """
    Get trending/recommended books (Top 20).
    """
    async with httpx.AsyncClient() as client:
        return await SearchService.get_trending_books(client)

@router.get("/details/{media_type}/{external_id}", response_model=ItemDetailResponse)
async def get_details(media_type: str, external_id: str):
    """
    Get detailed information for a specific movie or book.
    """
    async with httpx.AsyncClient() as client:
        details = await SearchService.get_item_details(client, media_type, external_id)
        if not details:
            raise HTTPException(status_code=404, detail="Item details not found")
        return details

@router.get("/", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, description="Search query for movies or books"),
    page: int = 1
):
    """
    Search for movies and books.
    """
    results = await SearchService.search_multi(query=q)
    return SearchResponse(results=results, page=page, total_results=len(results))