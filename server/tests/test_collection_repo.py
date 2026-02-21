import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4, UUID
from app.repositories.collection_repo import CollectionRepository
from app.schemas.item import StoryCreate

@pytest.fixture
def mock_supabase():
    with patch("app.repositories.collection_repo.get_supabase_client") as mock_get_client:
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        yield mock_client

def test_create_story_inserts_into_collections_table(mock_supabase):
    # Arrange
    user_id = str(uuid4())
    
    # Mock the chain: client.table("collections").insert(...).execute()
    # IMPORTANT: Configure mocks BEFORE initializing CollectionRepository
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table
    
    mock_insert = MagicMock()
    mock_table.insert.return_value = mock_insert
    
    mock_response = MagicMock()
    mock_response.data = [{
        "id": str(uuid4()),
        "user_id": user_id,
        "title": "Dune",
        "media_type": "movie",
        "external_id": "123",
        "source": "tmdb",
        "created_at": "2024-01-01T00:00:00Z",
        "rating": 0
    }]
    mock_insert.execute.return_value = mock_response

    # Initialize repo after mocks are set up
    repo = CollectionRepository()
    
    story_in = StoryCreate(
        title="Dune",
        media_type="movie",
        external_id="123",
        source="tmdb"
    )

    # Act
    result = repo.create_story(user_id, story_in)
    
    # Assert
    # 關鍵驗證：Repository 是否使用了 "collections" 這個表名？
    # 根據之前的發現，code 是 "collections"，db schema 是 "collections"，所以應該要匹配
    mock_supabase.table.assert_called_with("collections")
    
    # 驗證 insert 參數是否包含 user_id
    insert_call_args = mock_table.insert.call_args[0][0]
    assert insert_call_args["user_id"] == user_id
    assert insert_call_args["title"] == "Dune"
