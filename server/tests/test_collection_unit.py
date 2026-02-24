import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4
from datetime import datetime
from app.services.collection_service import CollectionService
from app.schemas.item import StoryCreate, StoryResponse

@pytest.fixture
def mock_repo():
    with patch("app.services.collection_service.CollectionRepository") as MockRepo:
        yield MockRepo.return_value

@pytest.fixture
def service(mock_repo):
    return CollectionService()

def test_add_story_success(service, mock_repo):
    # Arrange
    user_id = str(uuid4())
    story_in = StoryCreate(
        title="Dune",
        media_type="movie",
        external_id="123",
        source="tmdb",
        poster_path="/path.jpg"
    )
    expected_response = StoryResponse(
        id=uuid4(),
        user_id=uuid4(),
        created_at=datetime.utcnow(),
        **story_in.model_dump(exclude={"created_at"})
    )

    mock_repo.count_user_stories.return_value = 5
    mock_repo.create_story.return_value = expected_response

    # Act
    result = service.add_story(user_id, story_in)

    # Assert
    assert result.title == "Dune"
    mock_repo.count_user_stories.assert_not_called()
    mock_repo.create_story.assert_called_once()

def test_add_story_limit_reached(service, mock_repo):
    # Arrange
    user_id = str(uuid4())
    story_in = StoryCreate(
        title="Dune", 
        media_type="movie", 
        external_id="123", 
        source="tmdb"
    )

    mock_repo.count_user_stories.return_value = 10  # Limit reached

    # Act & Assert
    with pytest.raises(Exception) as excinfo:
        service.add_story(user_id, story_in, is_anonymous=True)

    assert "Guest limit reached" in str(excinfo.value)
    mock_repo.create_story.assert_not_called()
