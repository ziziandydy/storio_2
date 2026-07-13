"""
Group 3：人名偵測 + 精準參數（pid/cid/gid/author）測試。

涵蓋 search_tmdb 的兩段式邏輯（search/multi -> 人物 fallback discover）、
_discover_tmdb 精準查詢、search_multi 的路由規則（author 優先 / pid|cid|gid 略過
Google Books / 自由輸入時 TMDB 與 Google Books 並行），以及
search_google_books_with_author_boost 的合併去重。

全程不 mock 或觸及 SemanticSearchService / AIRecommendationService —— 這是純
關鍵字搜尋路徑,不涉及任何 LLM 呼叫。
"""
import pytest
from unittest.mock import MagicMock, AsyncMock
import httpx
from app.services.search_service import SearchService


def make_response(payload: dict) -> MagicMock:
    """建立一個模擬 httpx.Response，raise_for_status 為 no-op，json() 回傳指定 payload。"""
    resp = MagicMock()
    resp.raise_for_status.return_value = None
    resp.json.return_value = payload
    return resp


def make_routed_client(routes: dict) -> AsyncMock:
    """
    建立一個 mock httpx.AsyncClient，依 URL 中的關鍵字回傳對應 payload。
    routes: {url 關鍵字: payload dict}，依序比對，第一個符合的關鍵字生效。
    """
    async def _get(url, params=None, headers=None, **kwargs):
        for keyword, payload in routes.items():
            if keyword in url:
                return make_response(payload)
        return make_response({"results": []})

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.get = AsyncMock(side_effect=_get)
    return mock_client


# --- 測試 1：人名偵測成功 ---

@pytest.mark.asyncio
async def test_search_tmdb_person_detection_falls_back_to_discover():
    mock_client = make_routed_client({
        "search/multi": {
            "results": [
                {"id": 525, "media_type": "person", "name": "Christopher Nolan"}
            ]
        },
        "discover/movie": {
            "results": [
                {"id": 1, "title": "Inception", "release_date": "2010-07-16", "poster_path": "/inception.jpg"}
            ]
        },
        "discover/tv": {"results": []},
    })

    results = await SearchService.search_tmdb(mock_client, "Christopher Nolan")

    assert len(results) == 1
    assert results[0].title == "Inception"
    assert results[0].media_type == "movie"
    assert results[0].source == "tmdb"

    # 應該打了 search/multi + discover/movie + discover/tv 三次
    called_urls = [call.args[0] if call.args else call.kwargs.get("url") for call in mock_client.get.call_args_list]
    assert any("search/multi" in u for u in called_urls)
    assert any("discover/movie" in u for u in called_urls)
    assert any("discover/tv" in u for u in called_urls)


# --- 測試 2：標題命中優先 ---

@pytest.mark.asyncio
async def test_search_tmdb_title_hit_skips_person_fallback():
    mock_client = make_routed_client({
        "search/multi": {
            "results": [
                {"id": 693134, "media_type": "movie", "title": "Dune: Part Two", "release_date": "2024-02-28", "poster_path": "/dune2.jpg"},
                {"id": 525, "media_type": "person", "name": "Someone Else"},
            ]
        },
        "discover/movie": {"results": [{"id": 999, "title": "SHOULD NOT APPEAR", "release_date": "2020-01-01"}]},
        "discover/tv": {"results": []},
    })

    results = await SearchService.search_tmdb(mock_client, "Dune")

    assert len(results) == 1
    assert results[0].title == "Dune: Part Two"
    assert results[0].media_type == "movie"

    # discover 不應被呼叫（標題已命中，不做人物 fallback）
    called_urls = [call.args[0] if call.args else call.kwargs.get("url") for call in mock_client.get.call_args_list]
    assert not any("discover" in u for u in called_urls)
    assert mock_client.get.call_count == 1


# --- 測試 3：精準參數 pid 直查 ---

@pytest.mark.asyncio
async def test_search_tmdb_with_pid_skips_search_multi():
    mock_client = make_routed_client({
        "discover/movie": {
            "results": [{"id": 27205, "title": "Inception", "release_date": "2010-07-16", "poster_path": "/inception.jpg"}]
        },
        "discover/tv": {"results": []},
        "search/multi": {"results": [{"id": 1, "media_type": "movie", "title": "SHOULD NOT BE CALLED"}]},
    })

    results = await SearchService.search_tmdb(mock_client, "任意字串", pid=525)

    assert len(results) == 1
    assert results[0].title == "Inception"

    called_urls = [call.args[0] if call.args else call.kwargs.get("url") for call in mock_client.get.call_args_list]
    assert not any("search/multi" in u for u in called_urls)
    assert any("discover/movie" in u for u in called_urls)

    # 驗證 with_people 有被帶入 discover/movie 的 params
    for call in mock_client.get.call_args_list:
        url = call.args[0] if call.args else call.kwargs.get("url")
        if "discover/movie" in url:
            params = call.kwargs.get("params", {})
            assert params.get("with_people") == 525


# --- 測試 4：精準參數 author ---

@pytest.mark.asyncio
async def test_search_multi_with_author_only_calls_google_books():
    mock_client = make_routed_client({})

    with pytest.MonkeyPatch.context() as mp:
        called_tmdb = {"count": 0}

        async def fake_search_tmdb(*args, **kwargs):
            called_tmdb["count"] += 1
            return []

        async def fake_search_google_books(client, query, language="zh-TW"):
            assert query == "inauthor:村上春樹"
            return []

        mp.setattr(SearchService, "search_tmdb", staticmethod(fake_search_tmdb))
        mp.setattr(SearchService, "search_google_books", staticmethod(fake_search_google_books))

        results = await SearchService.search_multi(query="村上春樹", author="村上春樹")

        assert called_tmdb["count"] == 0
        assert results == []


# --- 測試 5：cid/gid 對書籍回空（只查 TMDB discover，不查 Google Books） ---

@pytest.mark.asyncio
async def test_search_multi_with_cid_skips_google_books():
    with pytest.MonkeyPatch.context() as mp:
        gbooks_called = {"count": 0}

        async def fake_discover_tmdb(client, language="zh-TW", region="TW", with_people=None, with_companies=None, with_genres=None):
            assert with_companies == 123
            return []

        async def fake_search_tmdb(client, query, language="zh-TW", region="TW", pid=None, cid=None, gid=None):
            assert cid == 123
            return await SearchService._discover_tmdb(client, language, region, with_companies=cid)

        async def fake_search_google_books(client, query, language="zh-TW"):
            gbooks_called["count"] += 1
            return []

        mp.setattr(SearchService, "_discover_tmdb", staticmethod(fake_discover_tmdb))
        mp.setattr(SearchService, "search_tmdb", staticmethod(fake_search_tmdb))
        mp.setattr(SearchService, "search_google_books", staticmethod(fake_search_google_books))

        results = await SearchService.search_multi(query="x", cid=123)

        assert gbooks_called["count"] == 0
        assert results == []


# --- 測試 6：自由輸入 inauthor 合併去重 ---

@pytest.mark.asyncio
async def test_search_google_books_with_author_boost_dedupes():
    from app.schemas.item import StoryBase

    freetext_results = [
        StoryBase(title="挪威的森林", media_type="book", external_id="dup-id", source="google_books"),
        StoryBase(title="其他書", media_type="book", external_id="unique-freetext", source="google_books"),
    ]
    author_results = [
        StoryBase(title="挪威的森林（作者版）", media_type="book", external_id="dup-id", source="google_books"),
        StoryBase(title="1Q84", media_type="book", external_id="unique-author", source="google_books"),
    ]

    with pytest.MonkeyPatch.context() as mp:
        async def fake_search_google_books(client, query, language="zh-TW"):
            return freetext_results

        async def fake_search_google_books_by_author(client, author, language="zh-TW"):
            return author_results

        mp.setattr(SearchService, "search_google_books", staticmethod(fake_search_google_books))
        mp.setattr(SearchService, "search_google_books_by_author", staticmethod(fake_search_google_books_by_author))

        mock_client = AsyncMock(spec=httpx.AsyncClient)
        merged = await SearchService.search_google_books_with_author_boost(mock_client, "村上春樹")

        external_ids = [r.external_id for r in merged]
        assert external_ids.count("dup-id") == 1
        assert "unique-freetext" in external_ids
        assert "unique-author" in external_ids
        assert len(merged) == 3
