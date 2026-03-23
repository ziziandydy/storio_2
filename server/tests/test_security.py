"""
Security hardening tests.
Covers: input validation, key leak prevention, exception safety.
Rate limit integration tests are in test_rate_limiting.py.
"""
import unittest.mock as mock
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# --- Input Length Validation ---

def test_search_query_too_long_returns_422():
    """超過 200 字元的查詢應被拒絕（422）"""
    long_query = "a" * 201
    response = client.get(f"/api/v1/search/?q={long_query}")
    assert response.status_code == 422


def test_search_query_max_length_accepted():
    """恰好 200 字元的查詢應通過驗證（非 422）"""
    query = "a" * 200
    response = client.get(f"/api/v1/search/?q={query}")
    assert response.status_code != 422


def test_ai_search_query_too_long_returns_422():
    """AI 搜尋超過 200 字元的查詢應被拒絕（422）"""
    response = client.post("/api/v1/search/ai", json={
        "query": "a" * 201,
        "media_type": "movie"
    })
    assert response.status_code == 422


def test_ai_search_empty_query_returns_422():
    """AI 搜尋空字串查詢應被拒絕（422）"""
    response = client.post("/api/v1/search/ai", json={
        "query": "",
        "media_type": "movie"
    })
    assert response.status_code == 422


# --- Key Leak Prevention ---

def test_supabase_client_does_not_print_key(capsys):
    """supabase client 初始化不應在 stdout 輸出任何 key 相關字串"""
    with mock.patch("app.core.supabase.create_client", return_value=mock.MagicMock()):
        from app.core import supabase as supabase_module
        # 重置模組以觸發初始化邏輯
        supabase_module.get_supabase_client()

    captured = capsys.readouterr()
    assert captured.out == "", f"Unexpected stdout output: {captured.out!r}"


# --- Exception Safety ---

def test_invalid_token_returns_generic_message():
    """無效 token 應返回通用訊息，不洩漏內部錯誤詳情"""
    response = client.get("/api/v1/collection/", headers={
        "Authorization": "Bearer invalid.token.here"
    })
    assert response.status_code == 401
    detail = response.json().get("detail", "")
    assert detail == "Invalid authentication credentials", \
        f"Unexpected error detail leaked: {detail!r}"


def test_cors_methods_not_wildcard():
    """CORS allow_methods 不應為萬用字元 *"""
    # 透過 OPTIONS preflight 確認只允許特定方法
    response = client.options("/api/v1/search/", headers={
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "PATCH",
    })
    # PATCH 不在允許清單中，預期不回傳 PATCH
    allow_header = response.headers.get("access-control-allow-methods", "")
    assert "*" not in allow_header, "CORS allow_methods should not be wildcard"
