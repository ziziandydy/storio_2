"""
限流 key（get_client_ip）：只信任代理附加在 X-Forwarded-For 最右邊的 IP，
client 自己帶的前段值不可影響計數。
"""
from types import SimpleNamespace
from uuid import uuid4

from fastapi.testclient import TestClient

from app.api.deps import get_optional_user
from app.core.limiter import get_client_ip
from app.main import app
from app.repositories.event_repo import EventRepository

client = TestClient(app)


def fake_request(headers, host="100.64.0.1"):
    return SimpleNamespace(headers=headers, client=SimpleNamespace(host=host))


def test_uses_rightmost_forwarded_ip():
    req = fake_request({"X-Forwarded-For": "6.6.6.6, 7.7.7.7, 203.0.113.9"})
    assert get_client_ip(req) == "203.0.113.9"


def test_single_forwarded_ip():
    assert get_client_ip(fake_request({"X-Forwarded-For": "203.0.113.9"})) == "203.0.113.9"


def test_falls_back_to_client_host():
    assert get_client_ip(fake_request({})) == "100.64.0.1"


def test_spoofed_leading_values_share_one_bucket(monkeypatch):
    """真實 IP 相同、前段偽造值不同的請求，必須共用同一個限流計數。"""
    monkeypatch.setattr(EventRepository, "insert_event", lambda self, row: None)
    monkeypatch.setattr(EventRepository, "count_visitor_events", lambda self, day: 0, raising=False)
    app.dependency_overrides[get_optional_user] = lambda: None
    vid = str(uuid4())
    codes = []
    for i in range(62):
        resp = client.post(
            "/api/v1/events",
            json={"event": "open", "visitor_id": vid},
            headers={"X-Forwarded-For": f"10.0.0.{i}, 203.0.113.9"},
        )
        codes.append(resp.status_code)
    assert 429 in codes
    app.dependency_overrides.clear()
