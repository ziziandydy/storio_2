import pytest
from fastapi.testclient import TestClient
from fastapi.security import HTTPAuthorizationCredentials
from unittest.mock import MagicMock
from app.main import app
from app.api.deps import get_current_user, security
from app.services.collection_service import CollectionService
from uuid import uuid4

@pytest.fixture
def mock_service():
    mock = MagicMock(spec=CollectionService)
    return mock

def test_api_add_collection_success():
    # Arrange
    user_id = str(uuid4())
    mock_user = type('obj', (object,), {'id': user_id, 'is_anonymous': False})
    
    # Override the Auth dependency
    app.dependency_overrides[get_current_user] = lambda: mock_user
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
    mock_user = type('obj', (object,), {'id': user_id, 'is_anonymous': False})
    app.dependency_overrides[get_current_user] = lambda: mock_user
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


# ---- add_collection 事件記錄 ----

def _setup_auth(user_id):
    mock_user = type('obj', (object,), {'id': user_id, 'is_anonymous': False})
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[security] = lambda: HTTPAuthorizationCredentials(scheme="Bearer", credentials="mock_token")


def _story_payload():
    return {
        "title": "Inception",
        "media_type": "movie",
        "external_id": "555",
        "source": "tmdb",
        "poster_path": "/inception.jpg",
    }


def _story_result(payload, user_id):
    return {
        **payload,
        "id": str(uuid4()),
        "user_id": user_id,
        "created_at": "2024-01-01T00:00:00Z",
        "rating": 0,
    }


def test_add_collection_records_event():
    user_id = str(uuid4())
    _setup_auth(user_id)
    client = TestClient(app)
    payload = _story_payload()

    with pytest.MonkeyPatch.context() as mp:
        svc = MagicMock()
        svc.add_story.return_value = _story_result(payload, user_id)
        mp.setattr("app.api.v1.endpoints.collection.CollectionService", MagicMock(return_value=svc))
        MockEventService = MagicMock()
        mp.setattr("app.api.v1.endpoints.collection.EventService", MockEventService)

        response = client.post(
            "/api/v1/collection/", json=payload, headers={"Origin": "capacitor://localhost"}
        )

        assert response.status_code == 200
        MockEventService.return_value.record_safely.assert_called_once_with(
            "add_collection", "ios", user_id=user_id
        )

    app.dependency_overrides = {}


def test_add_collection_survives_event_failure(caplog):
    user_id = str(uuid4())
    _setup_auth(user_id)
    client = TestClient(app)
    payload = _story_payload()

    with pytest.MonkeyPatch.context() as mp:
        svc = MagicMock()
        svc.add_story.return_value = _story_result(payload, user_id)
        mp.setattr("app.api.v1.endpoints.collection.CollectionService", MagicMock(return_value=svc))
        # 讓寫入失敗（insert_event 被取代，不會建立真實 Supabase client）
        mp.setattr(
            "app.repositories.event_repo.EventRepository.insert_event",
            MagicMock(side_effect=RuntimeError("db down")),
        )

        with caplog.at_level("ERROR"):
            response = client.post("/api/v1/collection/", json=payload)

        assert response.status_code == 200
        assert response.json()["title"] == "Inception"
        assert any(r.levelname == "ERROR" for r in caplog.records)

    app.dependency_overrides = {}


def test_failed_add_does_not_record_event():
    from fastapi import HTTPException
    user_id = str(uuid4())
    _setup_auth(user_id)
    client = TestClient(app)

    with pytest.MonkeyPatch.context() as mp:
        svc = MagicMock()
        svc.add_story.side_effect = HTTPException(status_code=409, detail="exists")
        mp.setattr("app.api.v1.endpoints.collection.CollectionService", MagicMock(return_value=svc))
        MockEventService = MagicMock()
        mp.setattr("app.api.v1.endpoints.collection.EventService", MockEventService)

        response = client.post("/api/v1/collection/", json=_story_payload())

        assert response.status_code == 409
        MockEventService.return_value.record_safely.assert_not_called()

    app.dependency_overrides = {}