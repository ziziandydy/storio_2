import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4, UUID
from app.repositories.collection_repo import CollectionRepository
from app.schemas.item import StoryCreate

@pytest.fixture
def mock_supabase():
    with patch("app.repositories.collection_repo.get_supabase_client") as mock_get_client:
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        yield mock_client

def test_create_story_inserts_into_collections_table(mock_supabase):
    # Arrange
    user_id = str(uuid4())
    
    # Mock the chain: client.table("collections").insert(...).execute()
    # IMPORTANT: Configure mocks BEFORE initializing CollectionRepository
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table
    
    mock_insert = MagicMock()
    mock_table.insert.return_value = mock_insert
    
    mock_response = MagicMock()
    mock_response.data = [{
        "id": str(uuid4()),
        "user_id": user_id,
        "title": "Dune",
        "media_type": "movie",
        "external_id": "123",
        "source": "tmdb",
        "created_at": "2024-01-01T00:00:00Z",
        "rating": 0
    }]
    mock_insert.execute.return_value = mock_response

    # Initialize repo after mocks are set up
    repo = CollectionRepository()
    
    story_in = StoryCreate(
        title="Dune",
        media_type="movie",
        external_id="123",
        source="tmdb"
    )

    # Act
    result = repo.create_story(user_id, story_in)
    
    # Assert
    # 關鍵驗證：Repository 是否使用了 "collections" 這個表名？
    # 根據之前的發現，code 是 "collections"，db schema 是 "collections"，所以應該要匹配
    mock_supabase.table.assert_called_with("collections")
    
    # 驗證 insert 參數是否包含 user_id
    insert_call_args = mock_table.insert.call_args[0][0]
    assert insert_call_args["user_id"] == user_id
    assert insert_call_args["title"] == "Dune"


# --- datetime 容錯 (REL-2) ---

def test_get_collection_stats_raises_when_created_at_is_none(mock_supabase):
    """created_at 為 None 時，get_collection_stats 不應拋出 TypeError，應跳過該筆資料"""
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table
    mock_response = MagicMock()
    mock_response.data = [
        {"created_at": "2024-01-15T10:00:00+00:00"},
        {"created_at": None},                          # ← 觸發 TypeError
        {"created_at": "2024-02-01T08:00:00+00:00"},
    ]
    mock_table.select.return_value.eq.return_value.execute.return_value = mock_response

    repo = CollectionRepository()
    # 目前會拋出 TypeError：fromisoformat argument must be str
    result = repo.get_collection_stats("user-123")
    assert isinstance(result, dict)
    assert "last_30_days" in result


def test_get_collection_stats_raises_when_created_at_malformed(mock_supabase):
    """created_at 格式異常時，get_collection_stats 不應拋出 ValueError，應跳過該筆資料"""
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table
    mock_response = MagicMock()
    mock_response.data = [
        {"created_at": "2024-01-15T10:00:00+00:00"},
        {"created_at": "not-a-date"},                  # ← 觸發 ValueError
    ]
    mock_table.select.return_value.eq.return_value.execute.return_value = mock_response

    repo = CollectionRepository()
    result = repo.get_collection_stats("user-123")
    assert isinstance(result, dict)
    assert result["last_30_days"] >= 0


# --- 分季收藏：seasons 欄位讀寫（design doc: 2026-08-01-seasons-design.md）---

def test_create_story_persists_seasons(mock_supabase):
    user_id = str(uuid4())
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table
    mock_insert = MagicMock()
    mock_table.insert.return_value = mock_insert
    mock_response = MagicMock()
    mock_response.data = [{
        "id": str(uuid4()),
        "user_id": user_id,
        "title": "One Piece",
        "media_type": "tv",
        "external_id": "37854",
        "source": "tmdb",
        "created_at": "2026-07-30T00:00:00Z",
        "rating": 0,
        "seasons": [4, 5, 6],
    }]
    mock_insert.execute.return_value = mock_response

    repo = CollectionRepository()
    story_in = StoryCreate(
        title="One Piece", media_type="tv", external_id="37854",
        source="tmdb", seasons=[4, 5, 6],
    )

    result = repo.create_story(user_id, story_in)

    insert_call_args = mock_table.insert.call_args[0][0]
    assert insert_call_args["seasons"] == [4, 5, 6]
    assert result.seasons == [4, 5, 6]


def test_get_instances_by_external_id_selects_seasons(mock_supabase):
    user_id = str(uuid4())
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table
    mock_response = MagicMock()
    mock_response.data = [
        {"id": str(uuid4()), "created_at": "2026-07-15T00:00:00Z", "rating": 4, "notes": "S1-S3", "seasons": [1, 2, 3]},
        {"id": str(uuid4()), "created_at": "2026-07-30T00:00:00Z", "rating": 5, "notes": "S4-S6", "seasons": [4, 5, 6]},
    ]
    mock_table.select.return_value.eq.return_value.eq.return_value.order.return_value.execute.return_value = mock_response

    repo = CollectionRepository()
    instances = repo.get_instances_by_external_id(user_id, "37854")

    select_arg = mock_table.select.call_args[0][0]
    assert "seasons" in select_arg
    assert instances[0]["seasons"] == [1, 2, 3]
    assert instances[1]["seasons"] == [4, 5, 6]


# --- Monthly Recap 依 archived_date 篩選（修復 8/1 新增 archived_date=7/31 資料未出現在七月回顧的 bug）---

def test_get_monthly_stats_filters_by_archived_date_not_created_at(mock_supabase):
    """查詢月份時應以 archived_date 為主要篩選欄位，而非只看 created_at。

    重現情境：使用者在 8/1 新增一筆收藏，archived_date 選 7/31（created_at 卻是 8/1），
    查詢 2026-07 時這筆資料必須被撈回來（因為 archived_date 落在七月）。
    """
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table
    mock_response = MagicMock()
    mock_response.data = [
        {
            "id": "item-1",
            "external_id": "1",
            "title": "Archived Late July",
            "media_type": "movie",
            "subtype": "movie",
            "poster_path": None,
            "created_at": "2026-08-01T09:00:00Z",   # 實際建立時間在八月
            "archived_date": "2026-07-31",           # 使用者選定的收藏日在七月
        },
    ]
    mock_table.select.return_value.eq.return_value.or_.return_value.execute.return_value = mock_response

    repo = CollectionRepository()
    result = repo.get_monthly_stats("user-123", "2026-07")

    # 查詢條件必須用 or_() 同時涵蓋 archived_date 範圍（而非單純 created_at 範圍），
    # 否則這筆 archived_date=7/31 / created_at=8/1 的資料查七月時會被漏掉。
    or_call_args = mock_table.select.return_value.eq.return_value.or_.call_args[0][0]
    assert "archived_date.gte.2026-07-01" in or_call_args
    assert "archived_date.lte.2026-07-31" in or_call_args

    assert len(result["items"]) == 1
    assert result["summary"]["movie"] == 1


def test_get_monthly_stats_item_date_prefers_archived_date_over_created_at(mock_supabase):
    """回傳項目的日期欄位（用於 Monthly Recap 模板內的月曆格排版）應優先反映 archived_date，
    否則即使查詢正確撈到資料，Calendar Recap 模板仍會把該筆錯誤放到 8/1 而非 7/31。"""
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table
    mock_response = MagicMock()
    mock_response.data = [
        {
            "id": "item-1",
            "external_id": "1",
            "title": "Archived Late July",
            "media_type": "movie",
            "subtype": "movie",
            "poster_path": None,
            "created_at": "2026-08-01T09:00:00Z",
            "archived_date": "2026-07-31",
        },
        {
            "id": "item-2",
            "external_id": "2",
            "title": "Legacy Item Without Archived Date",
            "media_type": "book",
            "subtype": None,
            "poster_path": None,
            "created_at": "2026-07-15T09:00:00Z",
            "archived_date": None,
        },
    ]
    mock_table.select.return_value.eq.return_value.or_.return_value.execute.return_value = mock_response

    repo = CollectionRepository()
    result = repo.get_monthly_stats("user-123", "2026-07")

    by_id = {item["id"]: item for item in result["items"]}
    assert by_id["item-1"]["created_at"] == "2026-07-31"
    assert by_id["item-2"]["created_at"] == "2026-07-15T09:00:00Z"
