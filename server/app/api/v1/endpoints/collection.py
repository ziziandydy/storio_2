from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials
from app.schemas.item import StoryCreate, StoryResponse, StoryCheckResponse
from app.services.collection_service import CollectionService
from app.api.deps import get_current_user, security

router = APIRouter()

@router.get("/", response_model=List[StoryResponse])
def read_collection(
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Retrieve the current user's folio collection.
    """
    service = CollectionService(token=credentials.credentials)
    return service.get_my_collection(user.id)

@router.get("/check/{external_id}", response_model=StoryCheckResponse)
def check_story_in_collection(
    external_id: str,
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Check if a story is already in the user's folio.
    """
    service = CollectionService(token=credentials.credentials)
    return service.check_story_status(user.id, external_id)

@router.get("/stats", response_model=dict)
def get_collection_stats(
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Get collection statistics (last 7 days, 30 days, this year).
    """
    service = CollectionService(token=credentials.credentials)
    return service.get_stats(user.id)

@router.get("/{story_id}", response_model=StoryResponse)
def read_collection_item(
    story_id: UUID,
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Get details of a specific collection item.
    """
    service = CollectionService(token=credentials.credentials)
    return service.get_collection_item(user.id, story_id)

@router.post("/", response_model=StoryResponse)
def add_to_collection(
    story_in: StoryCreate,
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Add a new item to the folio.
    Max 10 items for Guest users.
    """
    service = CollectionService(token=credentials.credentials)
    return service.add_story(user.id, story_in, is_anonymous=user.is_anonymous)

@router.patch("/{story_id}", response_model=StoryResponse)
def update_collection_item(
    story_id: UUID,
    story_update: dict,
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Update a collection item (e.g., rating or notes).
    """
    service = CollectionService(token=credentials.credentials)
    return service.update_collection_item(user.id, story_id, story_update)

@router.delete("/{story_id}")
def remove_from_collection(
    story_id: UUID,
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Remove a story from the folio.
    """
    service = CollectionService(token=credentials.credentials)
    return service.remove_story(user.id, story_id)
