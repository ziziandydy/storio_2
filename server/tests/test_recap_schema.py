import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.repositories.collection_repo import CollectionRepository
from app.schemas.item import StoryCreate, StoryResponse

NEW_FIELDS = ("runtime_minutes", "episode_total", "genres", "page_count")


@pytest.fixture
def mock_supabase():
    with patch("app.repositories.collection_repo.get_supabase_client") as mock_get_client:
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        yield mock_client


def _db_row(**overrides):
    row = {
        "id": str(uuid4()),
        "user_id": str(uuid4()),
        "title": "Dune",
        "media_type": "movie",
        "subtype": "movie",
        "external_id": "123",
        "source": "tmdb",
        "created_at": "2026-01-01T00:00:00Z",
        "rating": 0,
    }
    row.update(overrides)
    return row


def test_story_response_old_row_has_new_fields_none():
    story = StoryResponse(**_db_row())
    for field in NEW_FIELDS:
        assert getattr(story, field) is None


def _repo_with_insert(mock_supabase):
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table
    mock_table.insert.return_value.execute.return_value = MagicMock(data=[_db_row()])
    return CollectionRepository(), mock_table


def test_create_story_omits_none_metadata(mock_supabase):
    repo, table = _repo_with_insert(mock_supabase)

    repo.create_story(str(uuid4()), StoryCreate(title="Dune", media_type="movie", external_id="123", source="tmdb"))

    sent = table.insert.call_args[0][0]
    for field in NEW_FIELDS:
        assert field not in sent


def test_create_story_writes_provided_metadata(mock_supabase):
    repo, table = _repo_with_insert(mock_supabase)

    repo.create_story(
        str(uuid4()),
        StoryCreate(
            title="Dune", media_type="movie", external_id="123", source="tmdb",
            runtime_minutes=129, genres=["Drama"],
        ),
    )

    sent = table.insert.call_args[0][0]
    assert sent["runtime_minutes"] == 129
    assert sent["genres"] == ["Drama"]
    assert "episode_total" not in sent
    assert "page_count" not in sent


def test_update_recap_metadata_whitelists_keys(mock_supabase):
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table
    chain = mock_table.update.return_value.eq.return_value.eq.return_value
    chain.execute.return_value = MagicMock(data=[{}])
    repo = CollectionRepository()
    user_id, story_id = str(uuid4()), str(uuid4())

    repo.update_recap_metadata(user_id, story_id, {"runtime_minutes": 90, "rating": 10})

    mock_table.update.assert_called_once_with({"runtime_minutes": 90})
    eq_args = [
        mock_table.update.return_value.eq.call_args[0],
        mock_table.update.return_value.eq.return_value.eq.call_args[0],
    ]
    assert ("user_id", user_id) in eq_args


def test_update_recap_metadata_accepts_fetch_timestamp(mock_supabase):
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table
    repo = CollectionRepository()

    repo.update_recap_metadata("u", "s", {"metadata_fetched_at": "2026-11-10T12:00:00+00:00", "rating": 1})

    mock_table.update.assert_called_once_with({"metadata_fetched_at": "2026-11-10T12:00:00+00:00"})


def test_create_story_never_sends_fetch_timestamp(mock_supabase):
    repo, table = _repo_with_insert(mock_supabase)

    repo.create_story(str(uuid4()), StoryCreate(title="Dune", media_type="movie", external_id="123", source="tmdb"))

    assert "metadata_fetched_at" not in table.insert.call_args[0][0]


def test_update_recap_metadata_ignores_empty_update(mock_supabase):
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table
    repo = CollectionRepository()

    repo.update_recap_metadata(str(uuid4()), str(uuid4()), {"rating": 10})

    mock_table.update.assert_not_called()


def test_get_recap_rows_maps_tv_and_selects_needed_columns(mock_supabase):
    mock_table = MagicMock()
    mock_supabase.table.return_value = mock_table
    select_chain = mock_table.select.return_value.eq.return_value
    select_chain.execute.return_value = MagicMock(data=[
        {"id": "1", "title": "One Piece", "media_type": "movie", "subtype": "tv", "genres": ["Animation"]},
        {"id": "2", "title": "Dune", "media_type": "movie", "subtype": "movie"},
    ])
    repo = CollectionRepository()

    rows = repo.get_recap_rows("user-1")

    assert [r["media_type"] for r in rows] == ["tv", "movie"]
    selected = mock_table.select.call_args[0][0]
    for col in ("id", "external_id", "title", "media_type", "year", "poster_path", "rating", "notes",
                "created_at", "archived_date", "seasons", "metadata_fetched_at", *NEW_FIELDS):
        assert col in selected
    mock_table.select.return_value.eq.assert_called_once_with("user_id", "user-1")
