import pytest
from unittest.mock import MagicMock, AsyncMock
import httpx
from app.services.search_service import SearchService
from app.schemas.item import StoryBase

# Mock Responses
MOCK_TMDB_RESPONSE = {
    "results": [
        {
            "id": 123,
            "title": "Dune: Part Two",
            "media_type": "movie",
            "poster_path": "/path_to_poster.jpg"
        }
    ]
}

MOCK_GBOOKS_RESPONSE = {
    "items": [
        {
            "id": "abc1234",
            "volumeInfo": {
                "title": "Dune",
                "imageLinks": {
                    "thumbnail": "http://books.google.com/thumbnail.jpg"
                }
            }
        }
    ]
}

@pytest.mark.asyncio
async def test_search_tmdb_parsing():
    # Arrange: Mock the httpx client
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = MOCK_TMDB_RESPONSE
    
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.get.return_value = mock_response

    # Act
    results = await SearchService.search_tmdb(mock_client, "Dune")

    # Assert
    assert len(results) == 1
    assert results[0].title == "Dune: Part Two"
    assert results[0].source == "tmdb"
    assert "https://image.tmdb.org" in results[0].poster_path

@pytest.mark.asyncio
async def test_search_google_books_parsing():
    # Arrange
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = MOCK_GBOOKS_RESPONSE
    
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.get.return_value = mock_response

    # Act
    results = await SearchService.search_google_books(mock_client, "Dune")

    # Assert
    assert len(results) == 1
    assert results[0].title == "Dune"
    assert results[0].source == "google_books"
    # Ensure http is upgraded to https
    assert results[0].poster_path.startswith("https://")