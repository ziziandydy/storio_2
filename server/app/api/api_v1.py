from fastapi import APIRouter
from app.api.v1.endpoints import search, collection, details, ai

api_router = APIRouter()
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(collection.router, prefix="/collection", tags=["collection"])
api_router.include_router(details.router, prefix="/details", tags=["details"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
