import os
os.environ.setdefault("SUPABASE_ANON_KEY", "fake_key")

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_current_user
from app.main import app
from app.schemas.recap import RecapResponse
from app.services.recap_service import NotEnoughStories, RecapForbidden

client = TestClient(app)
AUTH = {"Authorization": "Bearer test_token"}


@pytest.fixture
def user():
    mock_user = MagicMock()
    mock_user.id = str(uuid4())
    mock_user.is_anonymous = False
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield mock_user
    app.dependency_overrides.clear()


def recap_payload(year=2026):
    return RecapResponse(
        year=year, is_partial=True, total_count=3, metadata_pending=0,
        opening={"year": year}, total={"count": 3, "minutes": 0, "items_with_data": 0, "estimated": False},
        closing={},
    )


@patch("app.api.v1.endpoints.collection.RecapService")
def test_recap_returns_service_result(mock_cls, user):
    service = mock_cls.return_value
    service.build_recap = AsyncMock(return_value=recap_payload())

    response = client.get("/api/v1/collection/recap?year=2026", headers=AUTH)

    assert response.status_code == 200
    body = response.json()
    assert body["year"] == 2026
    assert body["opening"] == {"year": 2026}
    assert body["closing"] == {}
    args = service.build_recap.call_args[0]
    assert args[0] == user.id and args[1] == 2026


@pytest.mark.parametrize("query", ["", "?year=1900", "?year=abc"])
def test_recap_rejects_missing_or_invalid_year(query, user):
    assert client.get(f"/api/v1/collection/recap{query}", headers=AUTH).status_code == 422


@patch("app.api.v1.endpoints.collection.RecapService")
def test_recap_not_enough_stories_is_404_with_needed(mock_cls, user):
    mock_cls.return_value.build_recap = AsyncMock(side_effect=NotEnoughStories(needed=2, count=1))

    response = client.get("/api/v1/collection/recap?year=2026", headers=AUTH)

    assert response.status_code == 404
    detail = response.json()["detail"]
    assert detail["code"] == "recap_not_enough"
    assert detail["needed"] == 2 and detail["count"] == 1


@patch("app.api.v1.endpoints.collection.RecapService")
def test_recap_forbidden_is_403(mock_cls, user):
    mock_cls.return_value.build_recap = AsyncMock(side_effect=RecapForbidden())

    assert client.get("/api/v1/collection/recap?year=2020", headers=AUTH).status_code == 403


@patch("app.api.v1.endpoints.collection.RecapService")
def test_recap_years_route_is_not_shadowed_by_story_id(mock_cls, user):
    mock_cls.return_value.list_years.return_value = {
        "threshold": 3,
        "years": [{"year": 2026, "count": 5}],
        "current": {"year": 2026, "count": 5},
    }

    response = client.get("/api/v1/collection/recap/years", headers=AUTH)

    assert response.status_code == 200
    assert response.json() == {
        "threshold": 3,
        "years": [{"year": 2026, "count": 5}],
        "current": {"year": 2026, "count": 5},
    }


@patch("app.api.v1.endpoints.collection.RecapService")
def test_recap_route_is_not_shadowed_by_story_id(mock_cls, user):
    mock_cls.return_value.build_recap = AsyncMock(return_value=recap_payload())
    # 若 /{story_id} 先註冊，"recap" 會被當成 UUID 而回 422
    assert client.get("/api/v1/collection/recap?year=2026", headers=AUTH).status_code != 422


def test_recap_requires_authorization():
    app.dependency_overrides.clear()
    assert client.get("/api/v1/collection/recap?year=2026").status_code in (401, 403)


@patch("app.api.v1.endpoints.collection.RecapService")
def test_recap_is_rate_limited_to_ten_per_minute(mock_cls, user):
    mock_cls.return_value.build_recap = AsyncMock(return_value=recap_payload())
    headers = {**AUTH, "X-Forwarded-For": "10.9.0.1"}

    statuses = [client.get("/api/v1/collection/recap?year=2026", headers=headers).status_code for _ in range(11)]

    assert statuses[:10] == [200] * 10
    assert statuses[10] == 429


@patch("app.api.v1.endpoints.collection.RecapService")
def test_anonymous_user_can_view_recap(mock_cls, user):
    user.is_anonymous = True
    mock_cls.return_value.build_recap = AsyncMock(return_value=recap_payload())

    assert client.get("/api/v1/collection/recap?year=2026", headers=AUTH).status_code == 200
