"""年度 Recap 事件：recap_opened、recap_shared（含年份與場景數）。寫入一律攔截 EventRepository.insert_event。"""
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_optional_user
from app.main import app
from app.repositories.event_repo import EventRepository

client = TestClient(app)
USER = SimpleNamespace(id="11111111-1111-1111-1111-111111111111")


@pytest.fixture
def rows(monkeypatch):
    captured = []
    monkeypatch.setattr(EventRepository, "insert_event", lambda self, row: captured.append(row))
    monkeypatch.setattr(EventRepository, "count_visitor_events", lambda self, day: 0, raising=False)
    yield captured
    app.dependency_overrides.clear()


def as_user():
    app.dependency_overrides[get_optional_user] = lambda: USER


def as_guest():
    app.dependency_overrides[get_optional_user] = lambda: None


def post(body):
    return client.post("/api/v1/events", json=body)


def test_recap_opened_records_year(rows):
    as_user()
    assert post({"event": "recap_opened", "year": 2026}).status_code == 204
    assert rows[0]["event"] == "recap_opened"
    assert rows[0]["year"] == 2026
    assert rows[0]["user_id"] == USER.id
    assert "scene_count" not in rows[0]


def test_recap_shared_records_year_and_scene_count(rows):
    as_user()
    assert post({"event": "recap_shared", "year": 2026, "scene_count": 12}).status_code == 204
    assert rows[0]["event"] == "recap_shared"
    assert rows[0]["year"] == 2026
    assert rows[0]["scene_count"] == 12


def test_recap_opened_without_year_is_422(rows):
    as_user()
    assert post({"event": "recap_opened"}).status_code == 422
    assert rows == []


def test_recap_shared_without_scene_count_is_422(rows):
    as_user()
    assert post({"event": "recap_shared", "year": 2026}).status_code == 422
    assert rows == []


def test_recap_shared_without_year_is_422(rows):
    as_user()
    assert post({"event": "recap_shared", "scene_count": 3}).status_code == 422


@pytest.mark.parametrize("body", [
    {"event": "recap_opened", "year": 1900},
    {"event": "recap_opened", "year": 2101},
    {"event": "recap_shared", "year": 2026, "scene_count": 0},
    {"event": "recap_shared", "year": 2026, "scene_count": 16},
])
def test_recap_values_out_of_range_are_422(rows, body):
    as_user()
    assert post(body).status_code == 422
    assert rows == []


def test_recap_event_without_token_is_401(rows):
    as_guest()
    assert post({"event": "recap_opened", "year": 2026}).status_code == 401
    assert rows == []


def test_non_recap_event_ignores_year_and_scene_count(rows):
    as_user()
    assert post({"event": "detail_view", "year": 2026, "scene_count": 5}).status_code == 204
    assert "year" not in rows[0]
    assert "scene_count" not in rows[0]


def test_existing_events_rows_are_unchanged(rows):
    as_user()
    post({"event": "share"})
    assert "year" not in rows[0] and "scene_count" not in rows[0]


def test_unknown_event_and_add_collection_still_rejected(rows):
    as_user()
    assert post({"event": "purchase"}).status_code == 422
    assert post({"event": "add_collection"}).status_code == 422
