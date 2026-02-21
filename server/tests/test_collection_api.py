import pytest
from fastapi.testclient import TestClient
from fastapi.security import HTTPAuthorizationCredentials
from unittest.mock import MagicMock
from app.main import app
from app.api.deps import get_current_user_id, security
from app.services.collection_service import CollectionService
from uuid import uuid4

@pytest.fixture
def mock_service():
    mock = MagicMock(spec=CollectionService)
    return mock

def test_api_add_collection_success():
    # Arrange
    user_id = str(uuid4())
    
    # Override the Auth dependency
    app.dependency_overrides[get_current_user_id] = lambda: user_id
    app.dependency_overrides[security] = lambda: HTTPAuthorizationCredentials(scheme="Bearer", credentials="mock_token")
    
    client = TestClient(app)
    
    payload = {
        "title": "Inception",
        "media_type": "movie",
        "external_id": "555",
        "source": "tmdb",
        "poster_path": "/inception.jpg"
    }
    
    # Patch the Service Class where it is used in the module
    with pytest.MonkeyPatch.context() as mp:
        mock_service_instance = MagicMock()
        mock_service_instance.add_story.return_value = {
            **payload,
            "id": str(uuid4()),
            "user_id": user_id,
            "created_at": "2024-01-01T00:00:00Z",
            "rating": 0
        }
        
        # Mock the constructor to return our mock instance
        MockServiceClass = MagicMock(return_value=mock_service_instance)
        mp.setattr("app.api.v1.endpoints.collection.CollectionService", MockServiceClass)

        # Act
        response = client.post("/api/v1/collection/", json=payload)

        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Inception"
        mock_service_instance.add_story.assert_called_once()
    
    # Cleanup overrides
    app.dependency_overrides = {}

def test_api_get_collection():
    # Arrange
    user_id = str(uuid4())
    app.dependency_overrides[get_current_user_id] = lambda: user_id
    app.dependency_overrides[security] = lambda: HTTPAuthorizationCredentials(scheme="Bearer", credentials="mock_token")
    client = TestClient(app)

    with pytest.MonkeyPatch.context() as mp:
        mock_service_instance = MagicMock()
        mock_service_instance.get_my_collection.return_value = []
        
        MockServiceClass = MagicMock(return_value=mock_service_instance)
        mp.setattr("app.api.v1.endpoints.collection.CollectionService", MockServiceClass)

        # Act
        response = client.get("/api/v1/collection/")

        # Assert
        assert response.status_code == 200
        assert response.json() == []
    
    app.dependency_overrides = {}