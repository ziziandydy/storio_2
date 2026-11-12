"""圖片代理的快取標頭。

Regression: iOS WebKit 會把「沒有 CORS 標頭」的代理回應（例如沒帶 Origin 的圖片請求）快取下來，
之後帶 crossOrigin 的 <img> 重用同一份快取而 CORS 檢查失敗，海報一直破圖。
代理回應必須 Vary: Origin，讓快取依來源分開存。
"""
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app

URL = "https://image.tmdb.org/t/p/w500/a.jpg"


def fake_client():
    response = MagicMock()
    response.content = b"\xff\xd8\xff"
    response.headers = {"content-type": "image/jpeg"}
    response.raise_for_status = MagicMock()
    client = MagicMock()
    client.get = AsyncMock(return_value=response)
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=False)
    return client


def test_proxy_response_varies_on_origin_with_and_without_origin_header():
    with patch("app.api.v1.endpoints.proxy.httpx.AsyncClient", return_value=fake_client()):
        http = TestClient(app)
        without_origin = http.get("/api/v1/proxy/image", params={"url": URL})
        with_origin = http.get("/api/v1/proxy/image", params={"url": URL}, headers={"Origin": "http://localhost:3010"})
    assert without_origin.status_code == 200 and with_origin.status_code == 200
    assert "origin" in without_origin.headers.get("vary", "").lower()
    assert "origin" in with_origin.headers.get("vary", "").lower()


def test_proxy_response_is_still_cacheable():
    with patch("app.api.v1.endpoints.proxy.httpx.AsyncClient", return_value=fake_client()):
        response = TestClient(app).get("/api/v1/proxy/image", params={"url": URL})
    assert "max-age" in response.headers["cache-control"]
