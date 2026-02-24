import pytest
import os
os.environ["SUPABASE_ANON_KEY"] = "fake_key"

from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_current_user
from unittest.mock import patch, MagicMock
from uuid import uuid4

client = TestClient(app)

@patch('app.services.collection_service.CollectionService.get_monthly_stats')
def test_get_monthly_stats_success(mock_get_monthly_stats):
    # Setup mocks
    mock_user = MagicMock()
    mock_user.id = str(uuid4())
    
    # Override FastAPI dependency
    app.dependency_overrides[get_current_user] = lambda: mock_user
    
    # Mock service response
    mock_response = {
        "summary": {"movie": 2, "book": 1, "tv": 0},
        "items": [
            {"id": "1", "title": "Movie 1", "media_type": "movie"},
            {"id": "2", "title": "Movie 2", "media_type": "movie"},
            {"id": "3", "title": "Book 1", "media_type": "book"}
        ]
    }
    mock_get_monthly_stats.return_value = mock_response

    # Execute request
    response = client.get(
        "/api/v1/collection/stats/monthly?month=2026-02",
        headers={"Authorization": "Bearer test_token"}
    )

    # Assertions
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["movie"] == 2
    assert len(data["items"]) == 3
    mock_get_monthly_stats.assert_called_once_with(mock_user.id, "2026-02")
    
    # Clean up override
    app.dependency_overrides.clear()
