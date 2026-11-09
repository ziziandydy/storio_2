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
        service.add_story(user_id, story_in, is_anonymous=True)
    
    assert excinfo.value.status_code == status.HTTP_403_FORBIDDEN
    assert "Guest limit reached" in excinfo.value.detail
    mock_repo.create_story.assert_not_called()

def test_guest_limit_not_reached():
    # Arrange
    mock_repo = MagicMock()
    mock_repo.count_user_stories.return_value = 9
    mock_repo.check_duplicate.return_value = False  # 無重複收藏

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
    service.add_story(user_id, story_in, is_anonymous=True)
    
    # Assert
    mock_repo.create_story.assert_called_once()


def _story_in():
    return StoryCreate(title="Dune 2", media_type="movie", external_id="123", source="tmdb")


def test_add_story_returns_total_count():
    """新增後回應帶 total_count（第 1 部 → 1，第 2 部 → 2），原項目欄位不變"""
    mock_repo = MagicMock()
    mock_repo.check_duplicate.return_value = False
    created = MagicMock()
    created.title = "Dune 2"
    mock_repo.create_story.return_value = created

    service = CollectionService()
    service.repo = mock_repo

    mock_repo.count_user_stories.return_value = 1
    result = service.add_story("u", _story_in())
    assert result.total_count == 1
    assert result.title == "Dune 2"

    mock_repo.count_user_stories.return_value = 2
    result = service.add_story("u", _story_in())
    assert result.total_count == 2


def test_guest_11th_still_403():
    """訪客第 11 筆仍回 403（回歸）"""
    mock_repo = MagicMock()
    mock_repo.count_user_stories.return_value = 10
    service = CollectionService()
    service.repo = mock_repo
    with pytest.raises(HTTPException) as excinfo:
        service.add_story("u", _story_in(), is_anonymous=True)
    assert excinfo.value.status_code == status.HTTP_403_FORBIDDEN
    mock_repo.create_story.assert_not_called()
