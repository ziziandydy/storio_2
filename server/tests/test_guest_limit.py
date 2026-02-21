import pytest
from fastapi import HTTPException, status
from unittest.mock import MagicMock
from app.services.collection_service import CollectionService
from app.schemas.item import StoryCreate

def test_guest_limit_reached():
    # Arrange
    # Mock the repository
    mock_repo = MagicMock()
    mock_repo.count_user_stories.return_value = 10
    
    # Create service with mocked repo
    service = CollectionService()
    service.repo = mock_repo
    
    user_id = "test_user"
    story_in = StoryCreate(
        title="Dune 2",
        media_type="movie",
        external_id="123",
        source="tmdb"
    )
    
    # Act & Assert
    with pytest.raises(HTTPException) as excinfo:
        service.add_story(user_id, story_in)
    
    assert excinfo.value.status_code == status.HTTP_403_FORBIDDEN
    assert "Guest limit reached" in excinfo.value.detail
    mock_repo.create_story.assert_not_called()

def test_guest_limit_not_reached():
    # Arrange
    mock_repo = MagicMock()
    mock_repo.count_user_stories.return_value = 9
    
    service = CollectionService()
    service.repo = mock_repo
    
    user_id = "test_user"
    story_in = StoryCreate(
        title="Dune 2",
        media_type="movie",
        external_id="123",
        source="tmdb"
    )
    
    # Act
    service.add_story(user_id, story_in)
    
    # Assert
    mock_repo.create_story.assert_called_once()
