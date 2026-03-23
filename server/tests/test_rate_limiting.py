"""
Rate limiting integration tests.
Validates: standard search 30/min limit, AI search 10/min limit.

每個測試使用獨立 IP（X-Forwarded-For），避免跨測試狀態污染。
slowapi 預設使用 MemoryStorage，同一 process 內計數累積。
"""
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# --- Helpers ---

def search(ip: str, q: str = "test"):
    return client.get(
        f"/api/v1/search/?q={q}",
        headers={"X-Forwarded-For": ip},
    )


def ai_search(ip: str):
    return client.post(
        "/api/v1/search/ai",
        json={"query": "action movies", "media_type": "movie"},
        headers={"X-Forwarded-For": ip},
    )


# --- Standard Search: 30/minute ---

@patch("app.services.search_service.SearchService.search_multi", new_callable=AsyncMock, return_value=[])
def test_search_allows_within_limit(mock_search):
    """30 次請求應全部通過（非 429）"""
    ip = "10.1.0.1"
    for i in range(30):
        resp = search(ip)
        assert resp.status_code != 429, f"第 {i+1} 次請求不應被 rate limit"


@patch("app.services.search_service.SearchService.search_multi", new_callable=AsyncMock, return_value=[])
def test_search_blocks_over_limit(mock_search):
    """第 31 次請求應被拒絕（429）"""
    ip = "10.1.0.2"
    for _ in range(30):
        search(ip)
    resp = search(ip)
    assert resp.status_code == 429


# --- AI Search: 10/minute ---

@patch("app.services.search_service.SearchService.search_by_intent", new_callable=AsyncMock, return_value=[])
@patch("app.services.semantic_search_service.SemanticSearchService.parse_intent", new_callable=AsyncMock)
def test_ai_search_allows_within_limit(mock_intent, mock_search):
    """10 次 AI 搜尋應全部通過（非 429）"""
    mock_intent.return_value = AsyncMock(query="action", media_type="movie", genres=[], year_range=None)
    ip = "10.1.1.1"
    for i in range(10):
        resp = ai_search(ip)
        assert resp.status_code != 429, f"第 {i+1} 次 AI 搜尋不應被 rate limit"


@patch("app.services.search_service.SearchService.search_by_intent", new_callable=AsyncMock, return_value=[])
@patch("app.services.semantic_search_service.SemanticSearchService.parse_intent", new_callable=AsyncMock)
def test_ai_search_blocks_over_limit(mock_intent, mock_search):
    """第 11 次 AI 搜尋應被拒絕（429）"""
    mock_intent.return_value = AsyncMock(query="action", media_type="movie", genres=[], year_range=None)
    ip = "10.1.1.2"
    for _ in range(10):
        ai_search(ip)
    resp = ai_search(ip)
    assert resp.status_code == 429


# --- AI limit 比標準搜尋更嚴格 ---

@patch("app.services.search_service.SearchService.search_by_intent", new_callable=AsyncMock, return_value=[])
@patch("app.services.search_service.SearchService.search_multi", new_callable=AsyncMock, return_value=[])
@patch("app.services.semantic_search_service.SemanticSearchService.parse_intent", new_callable=AsyncMock)
def test_ai_limit_stricter_than_search(mock_intent, mock_search_multi, mock_search_by_intent):
    """AI 搜尋 10 次到限後，同 IP 的標準搜尋仍有額度"""
    mock_intent.return_value = AsyncMock(query="action", media_type="movie", genres=[], year_range=None)
    ip = "10.1.2.1"

    # 打滿 AI 限額
    for _ in range(10):
        ai_search(ip)
    assert ai_search(ip).status_code == 429

    # 同一 IP 標準搜尋（不同計數器）不應被限制
    assert search(ip).status_code != 429


# --- Rate Limit 回應格式 ---

@patch("app.services.search_service.SearchService.search_multi", new_callable=AsyncMock, return_value=[])
def test_rate_limit_response_has_detail(mock_search):
    """429 回應應包含 detail 或 error 欄位"""
    ip = "10.1.3.1"
    for _ in range(30):
        search(ip)
    resp = search(ip)
    assert resp.status_code == 429
    body = resp.json()
    assert "error" in body or "detail" in body
