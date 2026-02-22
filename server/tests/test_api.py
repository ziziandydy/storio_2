from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from app.main import app
from app.schemas.item import StoryBase

MOCK_STORIES = [
    StoryBase(title="Integration Test Movie", media_type="movie", external_id="1", source="tmdb", poster_path=None),
    StoryBase(title="Integration Test Book", media_type="book", external_id="2", source="google_books", poster_path=None)
]

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

@patch("app.services.search_service.SearchService.search_multi", new_callable=AsyncMock)
def test_search_endpoint(mock_search):
    # Arrange
    mock_search.return_value = MOCK_STORIES
    
    # Act
    response = client.get("/api/v1/search/?q=Test")
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) == 2
    assert data["results"][0]["title"] == "Integration Test Movie"
    
    # Verify the mock was called correctly
    mock_search.assert_called_once_with(query="Test", language="zh-TW")

def test_search_validation_empty():
    # FastAPI should handle validation (min_length=1)
    response = client.get("/api/v1/search/?q=")
    assert response.status_code == 422
