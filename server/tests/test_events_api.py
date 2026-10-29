"""
POST /api/v1/events 測試：驗證、平台判斷、去重、限流、UTC 日。
寫入一律攔截 EventRepository.insert_event，不連真實 Supabase。
"""
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

from app.api.deps import get_optional_user
from app.core.supabase import get_supabase_client
from app.main import app
from app.repositories.event_repo import EventRepository
from app.services.event_service import platform_from_origin

client = TestClient(app)

USER = SimpleNamespace(id="11111111-1111-1111-1111-111111111111")


@pytest.fixture
def rows(monkeypatch):
    """攔截 repository 寫入，回傳收到的列。"""
    captured = []
    monkeypatch.setattr(EventRepository, "insert_event", lambda self, row: captured.append(row))
    yield captured
    app.dependency_overrides.clear()


def as_user():
    app.dependency_overrides[get_optional_user] = lambda: USER


def as_guest():
    app.dependency_overrides[get_optional_user] = lambda: None


def post(body, headers=None):
    return client.post("/api/v1/events", json=body, headers=headers or {})


def test_valid_event_with_token_returns_204(rows):
    as_user()
    resp = post({"event": "detail_view"})
    assert resp.status_code == 204
    assert len(rows) == 1
    assert rows[0]["user_id"] == USER.id
    assert rows[0]["visitor_id"] is None
    assert rows[0]["is_suspected_bot"] is False


def test_unknown_event_returns_422(rows):
    as_user()
    assert post({"event": "purchase"}).status_code == 422
    assert rows == []


def test_add_collection_rejected_from_api(rows):
    as_user()
    assert post({"event": "add_collection"}).status_code == 422
    assert rows == []


def test_token_ignores_visitor_id(rows):
    as_user()
    resp = post({"event": "browse", "visitor_id": str(uuid4())})
    assert resp.status_code == 204
    assert rows[0]["visitor_id"] is None


def test_no_token_open_with_visitor_id(rows):
    as_guest()
    vid = uuid4()
    resp = post({"event": "open", "visitor_id": str(vid), "is_suspected_bot": True, "bot_reason": "user_agent"})
    assert resp.status_code == 204
    assert rows[0]["visitor_id"] == str(vid)
    assert rows[0]["is_suspected_bot"] is True
    assert rows[0]["bot_reason"] == "user_agent"
    assert rows[0]["user_id"] is None


def test_no_token_non_open_rejected(rows):
    as_guest()
    assert post({"event": "search", "visitor_id": str(uuid4())}).status_code == 401
    assert rows == []


def test_no_token_missing_visitor_id_rejected(rows):
    as_guest()
    assert post({"event": "open"}).status_code == 422
    assert rows == []


@pytest.mark.parametrize("body", [
    {"event": "open", "visitor_id": "not-a-uuid"},
    {"event": "open", "visitor_id": str(uuid4()), "bot_reason": "x"},
])
def test_invalid_visitor_payload_422(rows, body):
    as_guest()
    assert post(body).status_code == 422
    assert rows == []


def test_invalid_token_returns_401(rows):
    bad = MagicMock()
    bad.auth.get_user.side_effect = Exception("bad token")
    app.dependency_overrides[get_supabase_client] = lambda: bad
    resp = post({"event": "open"}, headers={"Authorization": "Bearer bad"})
    assert resp.status_code == 401
    assert rows == []


@pytest.mark.parametrize("origin,expected", [
    ("capacitor://localhost", "ios"),
    ("https://localhost", "android"),
    ("https://storio.andismtu.com", "web"),
    (None, "web"),
])
def test_platform_from_origin(origin, expected):
    assert platform_from_origin(origin) == expected


def test_endpoint_platform_from_origin_header(rows):
    as_user()
    resp = post({"event": "open"}, headers={"Origin": "capacitor://localhost"})
    assert resp.status_code == 204
    assert rows[0]["platform"] == "ios"


def _repo_with_insert_error(code):
    mock_client = MagicMock()
    err = APIError({"code": code, "message": "boom"})
    mock_client.table.return_value.insert.return_value.execute.side_effect = err
    return mock_client


def test_duplicate_event_returns_204(monkeypatch):
    # 23505（去重唯一索引）視為成功；其他錯誤要往上拋
    monkeypatch.setattr(
        "app.repositories.event_repo.get_supabase_client", lambda: _repo_with_insert_error("23505")
    )
    EventRepository().insert_event({"event": "open"})

    monkeypatch.setattr(
        "app.repositories.event_repo.get_supabase_client", lambda: _repo_with_insert_error("500")
    )
    with pytest.raises(APIError):
        EventRepository().insert_event({"event": "open"})


def test_events_rate_limit(rows):
    as_user()
    headers = {"X-Forwarded-For": "10.9.0.1"}
    for i in range(60):
        assert post({"event": "browse"}, headers).status_code != 429, f"第 {i+1} 次不應被限流"
    assert post({"event": "browse"}, headers).status_code == 429


def test_day_is_utc(rows, monkeypatch):
    fixed = datetime(2026, 10, 29, 23, 30, tzinfo=timezone(timedelta(hours=-8)))
    fake = MagicMock()
    # now 要遵守傳入的 tz，才能驗證實作用的是 UTC
    fake.now.side_effect = lambda tz=None: fixed.astimezone(tz)
    monkeypatch.setattr("app.services.event_service.datetime", fake)
    as_user()
    assert post({"event": "open"}).status_code == 204
    assert rows[0]["day"] == "2026-10-30"


def test_row_contains_only_allowed_keys(rows):
    as_user()
    post({"event": "open"})
    assert set(rows[0].keys()) == {
        "day", "event", "platform", "user_id", "visitor_id", "is_suspected_bot", "bot_reason",
    }
