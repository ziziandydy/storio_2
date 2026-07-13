"""
測試 ItemDetailResponse 的 entity refs（cast_refs/director_refs/genre_refs/company_refs）。

對應 openspec/changes/add-person-search 的 Requirement:
"Details Response Carries Entity Refs"——details response 在既有字串欄位之外，
additive 提供 *_refs 欄位（TMDB numeric ID），既有字串欄位內容不得改變。
"""
import pytest
from unittest.mock import MagicMock, AsyncMock
import httpx
from app.services.search_service import SearchService

# --- Mock TMDB Movie Detail Response ---
MOCK_TMDB_MOVIE_DETAIL = {
    "id": 438631,
    "title": "Dune",
    "overview": "A noble family becomes embroiled in a war for control of the galaxy's most valuable asset.",
    "release_date": "2021-10-20",
    "poster_path": "/poster.jpg",
    "backdrop_path": "/backdrop.jpg",
    "status": "Released",
    "revenue": 400000000,
    "budget": 165000000,
    "original_language": "en",
    "vote_average": 8.0,
    "genres": [
        {"id": 878, "name": "科幻"},
        {"id": 12, "name": "冒險"},
    ],
    "production_companies": [
        {"id": 923, "name": "Legendary Pictures"},
        {"id": 491, "name": "Villeneuve Films"},
    ],
    "production_countries": [{"iso_3166_1": "US"}],
    "spoken_languages": [],
    "credits": {
        "cast": [
            {"id": 3223, "name": "Timothée Chalamet"},
            {"id": 74568, "name": "Rebecca Ferguson"},
            {"id": 2037, "name": "Zendaya"},
            {"id": 17419, "name": "Oscar Isaac"},
            {"id": 1892, "name": "Josh Brolin"},
            {"id": 99999, "name": "Should Be Excluded (6th)"},
        ],
        "crew": [
            {"id": 137427, "name": "Denis Villeneuve", "job": "Director"},
            {"id": 555, "name": "Some Producer", "job": "Producer"},
        ],
    },
    "reviews": {"results": []},
    "videos": {"results": []},
    "images": {"backdrops": [], "posters": []},
    "watch/providers": {"results": {}},
}

# --- Mock TMDB TV Detail Response (with created_by) ---
MOCK_TMDB_TV_DETAIL = {
    "id": 1399,
    "name": "Game of Thrones",
    "overview": "Seven noble families fight for control of the mythical land of Westeros.",
    "first_air_date": "2011-04-17",
    "poster_path": "/poster_tv.jpg",
    "backdrop_path": "/backdrop_tv.jpg",
    "status": "Ended",
    "vote_average": 8.4,
    "original_language": "en",
    "genres": [{"id": 10765, "name": "Sci-Fi & Fantasy"}],
    "production_companies": [{"id": 76043, "name": "Revolution Sun Studios"}],
    "origin_country": ["US"],
    "spoken_languages": [],
    "created_by": [
        {"id": 9813, "name": "David Benioff"},
        {"id": 228068, "name": "D.B. Weiss"},
    ],
    "credits": {
        "cast": [{"id": 22970, "name": "Peter Dinklage"}],
        "crew": [{"id": 44797, "name": "Alan Taylor", "job": "Director"}],
    },
    "reviews": {"results": []},
    "videos": {"results": []},
    "images": {"backdrops": [], "posters": []},
    "watch/providers": {"results": {}},
}

# --- Mock Google Books Detail Response ---
MOCK_GBOOKS_DETAIL = {
    "id": "abc123",
    "volumeInfo": {
        "title": "沙丘",
        "authors": ["Frank Herbert"],
        "publishedDate": "1965",
        "imageLinks": {"thumbnail": "http://books.google.com/thumb.jpg"},
        "categories": ["Fiction"],
    },
    "saleInfo": {},
    "accessInfo": {},
}


def _mock_client(payload: dict) -> AsyncMock:
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_response.json.return_value = payload
    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.get.return_value = mock_response
    return mock_client


@pytest.mark.asyncio
async def test_movie_details_include_entity_refs():
    mock_client = _mock_client(MOCK_TMDB_MOVIE_DETAIL)

    result = await SearchService.get_item_details(mock_client, "movie", "438631")

    assert result is not None

    # 既有字串欄位維持不變
    assert result.cast == [
        "Timothée Chalamet", "Rebecca Ferguson", "Zendaya", "Oscar Isaac", "Josh Brolin"
    ]
    assert result.directors == ["Denis Villeneuve"]
    assert result.genres == ["科幻", "冒險"]
    assert result.production_companies == ["Legendary Pictures", "Villeneuve Films"]

    # 新增 refs 欄位：{id, name} 陣列，帶 TMDB numeric id
    assert [r.model_dump() for r in result.cast_refs] == [
        {"id": 3223, "name": "Timothée Chalamet"},
        {"id": 74568, "name": "Rebecca Ferguson"},
        {"id": 2037, "name": "Zendaya"},
        {"id": 17419, "name": "Oscar Isaac"},
        {"id": 1892, "name": "Josh Brolin"},
    ]
    assert [r.model_dump() for r in result.director_refs] == [
        {"id": 137427, "name": "Denis Villeneuve"},
    ]
    assert [r.model_dump() for r in result.genre_refs] == [
        {"id": 878, "name": "科幻"},
        {"id": 12, "name": "冒險"},
    ]
    assert [r.model_dump() for r in result.company_refs] == [
        {"id": 923, "name": "Legendary Pictures"},
        {"id": 491, "name": "Villeneuve Films"},
    ]


@pytest.mark.asyncio
async def test_tv_details_director_refs_include_created_by():
    mock_client = _mock_client(MOCK_TMDB_TV_DETAIL)

    result = await SearchService.get_item_details(mock_client, "tv", "1399")

    assert result is not None

    # 既有字串欄位：directors 含 Director + created_by（不變行為）
    assert result.directors == ["Alan Taylor", "David Benioff", "D.B. Weiss"]

    # director_refs 同步含 Director + created_by 的 id
    assert [r.model_dump() for r in result.director_refs] == [
        {"id": 44797, "name": "Alan Taylor"},
        {"id": 9813, "name": "David Benioff"},
        {"id": 228068, "name": "D.B. Weiss"},
    ]

    assert [r.model_dump() for r in result.cast_refs] == [
        {"id": 22970, "name": "Peter Dinklage"},
    ]
    assert [r.model_dump() for r in result.genre_refs] == [
        {"id": 10765, "name": "Sci-Fi & Fantasy"},
    ]
    assert [r.model_dump() for r in result.company_refs] == [
        {"id": 76043, "name": "Revolution Sun Studios"},
    ]


@pytest.mark.asyncio
async def test_book_details_authors_stay_plain_strings_no_refs():
    mock_client = _mock_client(MOCK_GBOOKS_DETAIL)

    result = await SearchService.get_item_details(mock_client, "book", "abc123")

    assert result is not None

    # authors 維持純字串陣列，不需要 refs
    assert result.authors == ["Frank Herbert"]
    assert result.cast == ["Frank Herbert"]

    # 書籍沒有 ID 來源，refs 欄位維持 additive 預設空陣列
    assert result.cast_refs == []
    assert result.director_refs == []
    assert result.genre_refs == []
    assert result.company_refs == []
