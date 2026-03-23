from fastapi import APIRouter, HTTPException, Depends
import httpx
from app.schemas.item import ItemDetailResponse
from app.services.search_service import SearchService
from app.api.deps import get_language

router = APIRouter()

HTTPX_TIMEOUT = httpx.Timeout(connect=5.0, read=15.0, write=5.0, pool=5.0)


@router.get("/{media_type}/{external_id}", response_model=ItemDetailResponse)
async def get_details(media_type: str, external_id: str, language: str = Depends(get_language)):
    """
    Get detailed information for a specific movie or book.
    """
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
        details = await SearchService.get_item_details(client, media_type, external_id, language)
        if not details:
            raise HTTPException(status_code=404, detail="Item details not found")
        return details
