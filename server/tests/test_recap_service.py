import asyncio
import threading
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.schemas.item import ItemDetailResponse
from app.services.recap_service import NotEnoughStories, RecapForbidden, RecapService

TODAY = date(2026, 11, 10)


def make_row(**overrides):
    row = {
        "id": "id-1",
        "external_id": "x1",
        "title": "Title",
        "media_type": "movie",
        "year": None,
        "poster_path": None,
        "rating": 0,
        "notes": None,
        "created_at": "2026-03-05T00:00:00+00:00",
        "archived_date": "2026-03-05",
        "seasons": None,
        "runtime_minutes": 100,
        "episode_total": None,
        "genres": ["Drama"],
        "page_count": None,
    }
    row.update(overrides)
    return row


@pytest.fixture
def repo():
    with patch("app.services.recap_service.CollectionRepository") as cls:
        instance = MagicMock()
        cls.return_value = instance
        yield instance


async def no_fetch(row):
    return None


def service():
    return RecapService(token="t")


@pytest.mark.asyncio
async def test_fewer_than_three_rows_in_year_raises_with_needed(repo):
    repo.get_recap_rows.return_value = [
        make_row(id="a"), make_row(id="b"),
        make_row(id="old", archived_date="2025-06-01"),  # 他年，不計入
    ]
    with pytest.raises(NotEnoughStories) as exc:
        await service().build_recap("u1", 2026, TODAY, fetch=no_fetch)
    assert exc.value.needed == 1
    assert exc.value.count == 2


@pytest.mark.asyncio
async def test_forbidden_year_raises_before_reading_rows(repo):
    with patch("app.services.recap_service.can_view_recap_year", return_value=False):
        with pytest.raises(RecapForbidden):
            await service().build_recap("u1", 2026, TODAY, fetch=no_fetch)
    repo.get_recap_rows.assert_not_called()


@pytest.mark.asyncio
async def test_scenes_present_or_none_by_data(repo):
    repo.get_recap_rows.return_value = [
        make_row(id="a", media_type="movie", runtime_minutes=120, genres=None),
        make_row(id="b", media_type="movie", runtime_minutes=100, genres=None),
        make_row(id="c", media_type="book", page_count=400, runtime_minutes=None, genres=None),
        make_row(id="other-year", archived_date="2025-06-01"),
    ]
    result = await service().build_recap("u1", 2026, TODAY, fetch=no_fetch)

    repo.get_recap_rows.assert_called_once_with("u1")
    assert result.year == 2026
    assert result.total_count == 3
    assert result.opening == {"year": 2026}
    assert result.closing == {}
    assert result.movies["count"] == 2 and result.movies["minutes"] == 220
    assert result.series is None
    assert result.books["count"] == 1 and result.books["pages"] == 400
    assert result.total["count"] == 3
    assert result.genres is None  # 類別資料不足
    assert result.eras is None and result.title is None
    assert result.first_last is not None  # ≥ 2 列
    assert result.reflection is None and result.top_rated is None


@pytest.mark.asyncio
async def test_scene_posters_are_split_by_media_type(repo):
    repo.get_recap_rows.return_value = [
        make_row(id="a", media_type="movie", poster_path="/m1.jpg", archived_date="2026-03-01"),
        make_row(id="b", media_type="movie", poster_path="/m2.jpg", archived_date="2026-03-02"),
        make_row(id="c", media_type="book", poster_path="/b1.jpg", archived_date="2026-03-03", runtime_minutes=None, page_count=300),
    ]
    result = await service().build_recap("u1", 2026, TODAY, fetch=no_fetch)

    assert result.movies["posters"] == ["/m2.jpg", "/m1.jpg"]
    assert result.books["posters"] == ["/b1.jpg"]
    assert set(result.total["posters"]) == {"/m1.jpg", "/m2.jpg", "/b1.jpg"}
    assert len(result.total["posters"]) <= 6


@pytest.mark.asyncio
async def test_genre_scene_posters_only_include_top_genre_works(repo):
    repo.get_recap_rows.return_value = [
        make_row(id="a", genres=["Drama"], poster_path="/d1.jpg", archived_date="2026-03-01"),
        make_row(id="b", genres=["drama", "Crime"], poster_path="/d2.jpg", archived_date="2026-03-02"),
        make_row(id="c", genres=["Comedy"], poster_path="/c1.jpg", archived_date="2026-03-03"),
    ]
    result = await service().build_recap("u1", 2026, TODAY, fetch=no_fetch)

    assert result.genres["top"][0]["name"] == "Drama"
    assert result.genres["posters"] == ["/d2.jpg", "/d1.jpg"]


@pytest.mark.asyncio
async def test_peak_month_posters_only_include_that_months_works(repo):
    repo.get_recap_rows.return_value = [
        make_row(id="a", poster_path="/m1.jpg", archived_date="2026-03-01"),
        make_row(id="b", poster_path="/m2.jpg", archived_date="2026-03-02"),
        make_row(id="c", poster_path="/m3.jpg", archived_date="2026-03-03"),
        make_row(id="d", poster_path="/jul.jpg", archived_date="2026-07-01"),
    ]
    result = await service().build_recap("u1", 2026, TODAY, fetch=no_fetch)

    assert result.peak_month["month"] == 3
    assert result.peak_month["posters"] == ["/m3.jpg", "/m2.jpg", "/m1.jpg"]


@pytest.mark.asyncio
async def test_works_without_posters_give_empty_lists_not_errors(repo):
    repo.get_recap_rows.return_value = [make_row(id=str(i)) for i in range(3)]
    result = await service().build_recap("u1", 2026, TODAY, fetch=no_fetch)

    assert result.total["posters"] == []
    assert result.movies["posters"] == []


@pytest.mark.asyncio
async def test_series_episodes_and_minutes_do_not_double_count_legacy_whole_show_row(repo):
    repo.get_recap_rows.return_value = [
        make_row(id="legacy", media_type="tv", external_id="show1", seasons=None, episode_total=72, runtime_minutes=22),
        make_row(id="s3", media_type="tv", external_id="show1", seasons=[3], episode_total=24, runtime_minutes=22),
        make_row(id="m", media_type="movie", external_id="m1"),
    ]
    result = await service().build_recap("u1", 2026, TODAY, fetch=no_fetch)

    assert result.series["count"] == 2
    assert result.series["episodes"] == 24
    assert result.series["minutes"] == 24 * 22
    assert result.total["minutes"] == 24 * 22 + 100


@pytest.mark.asyncio
async def test_season_by_season_rows_sum_each_seasons_own_episodes(repo):
    repo.get_recap_rows.return_value = [
        make_row(id=f"s{n}", media_type="tv", external_id="show1", seasons=[n], episode_total=eps, runtime_minutes=22)
        for n, eps in [(1, 24), (2, 24), (3, 22)]
    ]
    result = await service().build_recap("u1", 2026, TODAY, fetch=no_fetch)

    assert result.series["episodes"] == 70
    assert result.series["minutes"] == 70 * 22


@pytest.mark.asyncio
async def test_no_runtime_or_pages_gives_zero_minutes_not_error(repo):
    repo.get_recap_rows.return_value = [
        make_row(id=str(i), runtime_minutes=None, genres=None) for i in range(3)
    ]
    result = await service().build_recap("u1", 2026, TODAY, fetch=no_fetch)
    assert result.total["minutes"] == 0
    assert result.total["items_with_data"] == 0


@pytest.mark.asyncio
async def test_monthly_scenes_need_two_active_months(repo):
    repo.get_recap_rows.return_value = [
        make_row(id=str(i), archived_date="2026-03-05") for i in range(3)
    ]
    one_month = await service().build_recap("u1", 2026, TODAY, fetch=no_fetch)
    assert one_month.monthly is None and one_month.months_active is None
    assert one_month.peak_month == {"month": 3, "count": 3, "posters": []}

    repo.get_recap_rows.return_value = [
        make_row(id="a", archived_date="2026-03-05"),
        make_row(id="b", archived_date="2026-03-06"),
        make_row(id="c", archived_date="2026-07-01"),
    ]
    two_months = await service().build_recap("u1", 2026, TODAY, fetch=no_fetch)
    assert two_months.monthly["counts"][2] == 2 and len(two_months.monthly["counts"]) == 12
    assert two_months.months_active == {"count": 2, "posters": []}


@pytest.mark.asyncio
async def test_is_partial_only_for_current_year(repo):
    repo.get_recap_rows.return_value = [
        make_row(id=str(i), archived_date=f"2025-0{i + 1}-05") for i in range(3)
    ] + [make_row(id=f"n{i}", archived_date=f"2026-0{i + 1}-05") for i in range(3)]
    assert (await service().build_recap("u1", 2026, TODAY, fetch=no_fetch)).is_partial is True
    assert (await service().build_recap("u1", 2025, TODAY, fetch=no_fetch)).is_partial is False


@pytest.mark.asyncio
async def test_backfill_fills_missing_data_and_saves_with_user_id(repo):
    repo.get_recap_rows.return_value = [
        make_row(id="a", external_id="e1", runtime_minutes=None),
        make_row(id="b", external_id="e2"),
        make_row(id="c", external_id="e3"),
    ]

    async def fetch(row):
        return {"runtime_minutes": 90}

    result = await service().build_recap("u1", 2026, TODAY, fetch=fetch)

    assert result.metadata_pending == 0
    assert result.movies["minutes"] == 90 + 100 + 100
    repo.update_recap_metadata.assert_called_once()
    user_arg, row_arg, fields = repo.update_recap_metadata.call_args.args
    assert (user_arg, row_arg) == ("u1", "a")
    assert fields["runtime_minutes"] == 90 and "metadata_fetched_at" in fields


@pytest.mark.asyncio
async def test_recently_fetched_rows_are_not_fetched_again(repo):
    recently = datetime.now(timezone.utc).isoformat()
    repo.get_recap_rows.return_value = [
        make_row(id=str(i), external_id=f"e{i}", runtime_minutes=None, metadata_fetched_at=recently)
        for i in range(3)
    ]
    calls = []

    async def fetch(row):
        calls.append(row["id"])
        return {"runtime_minutes": 90}

    await service().build_recap("u1", 2026, TODAY, fetch=fetch)

    assert calls == []


@pytest.mark.asyncio
async def test_default_fetch_wires_search_service_in_english_and_applies_result(repo):
    repo.get_recap_rows.return_value = [
        make_row(id="a", external_id="e1", runtime_minutes=None),
        make_row(id="b", external_id="e2"),
        make_row(id="c", external_id="e3"),
    ]
    details = ItemDetailResponse(
        title="T", media_type="movie", external_id="e1", source="tmdb", runtime="90m", genres=["Drama"]
    )
    with patch("app.services.recap_service.SearchService.get_item_details", new_callable=AsyncMock) as get_details:
        get_details.return_value = details
        result = await service().build_recap("u1", 2026, TODAY)

    get_details.assert_awaited_once()
    args = get_details.await_args.args
    assert args[1:] == ("movie", "e1", "en-US")
    assert result.movies["minutes"] == 90 + 100 + 100
    fields = repo.update_recap_metadata.call_args.args[2]
    assert fields["runtime_minutes"] == 90


@pytest.mark.asyncio
async def test_default_fetch_without_details_leaves_row_unchanged(repo):
    repo.get_recap_rows.return_value = [
        make_row(id="a", external_id="e1", runtime_minutes=None),
        make_row(id="b", external_id="e2"),
        make_row(id="c", external_id="e3"),
    ]
    with patch("app.services.recap_service.SearchService.get_item_details", new_callable=AsyncMock) as get_details:
        get_details.return_value = None
        result = await service().build_recap("u1", 2026, TODAY)

    assert result.movies["minutes"] == 200  # a 無資料不計入
    repo.update_recap_metadata.assert_not_called()


@pytest.mark.asyncio
async def test_budget_exceeded_still_returns_with_pending(repo):
    repo.get_recap_rows.return_value = [
        make_row(id=str(i), external_id=f"e{i}", runtime_minutes=None) for i in range(3)
    ]

    async def slow_fetch(row):
        await asyncio.sleep(1.0)
        return {"runtime_minutes": 90}

    result = await service().build_recap("u1", 2026, TODAY, fetch=slow_fetch, budget_seconds=0.05)

    assert result.metadata_pending == 3
    assert result.total["items_with_data"] == 0
    repo.update_recap_metadata.assert_not_called()


@pytest.mark.asyncio
async def test_get_recap_rows_does_not_block_the_event_loop_thread(repo):
    loop_thread = threading.current_thread()
    seen = {}

    def fake_get_rows(user_id):
        seen["thread"] = threading.current_thread()
        return [make_row(id=str(i)) for i in range(3)]

    repo.get_recap_rows.side_effect = fake_get_rows

    await service().build_recap("u1", 2026, TODAY, fetch=no_fetch)

    assert seen["thread"] is not loop_thread


def test_list_years_threshold_sorted_desc(repo):
    repo.get_recap_rows.return_value = (
        [make_row(id=f"a{i}", archived_date="2024-05-01") for i in range(2)]
        + [make_row(id=f"b{i}", archived_date="2025-05-01") for i in range(3)]
        + [make_row(id=f"c{i}", archived_date="2026-05-01") for i in range(5)]
    )
    result = service().list_years("u1", today=TODAY)
    assert result["threshold"] == 3
    assert result["years"] == [{"year": 2026, "count": 5}, {"year": 2025, "count": 3}]


def test_list_years_reports_current_year_count_even_below_threshold(repo):
    repo.get_recap_rows.return_value = (
        [make_row(id="a", archived_date="2026-05-01")]
        + [make_row(id=f"b{i}", archived_date="2025-05-01") for i in range(4)]
    )
    result = service().list_years("u1", today=TODAY)
    assert result["current"] == {"year": 2026, "count": 1}
    assert [y["year"] for y in result["years"]] == [2025]  # 當年不足門檻，不在清單


def test_list_years_current_year_with_no_stories_is_zero(repo):
    repo.get_recap_rows.return_value = []
    assert service().list_years("u1", today=TODAY)["current"] == {"year": 2026, "count": 0}


def test_list_years_current_year_at_threshold_is_listed_and_current(repo):
    repo.get_recap_rows.return_value = [make_row(id=str(i), archived_date="2026-05-01") for i in range(3)]
    result = service().list_years("u1", today=TODAY)
    assert result["current"] == {"year": 2026, "count": 3}
    assert result["years"] == [{"year": 2026, "count": 3}]


def test_list_years_current_year_follows_today_argument(repo):
    repo.get_recap_rows.return_value = [make_row(id="a", archived_date="2027-01-05")]
    assert service().list_years("u1", today=date(2027, 1, 10))["current"] == {"year": 2027, "count": 1}


def test_list_years_excludes_forbidden_years(repo):
    repo.get_recap_rows.return_value = (
        [make_row(id=f"b{i}", archived_date="2025-05-01") for i in range(3)]
        + [make_row(id=f"c{i}", archived_date="2026-05-01") for i in range(3)]
    )
    with patch("app.services.recap_service.can_view_recap_year", side_effect=lambda u, y: y != 2025):
        assert service().list_years("u1", today=TODAY)["years"] == [{"year": 2026, "count": 3}]


@pytest.mark.asyncio
async def test_total_posters_cover_as_many_works_as_possible_capped_at_48_most_recent_first(repo):
    rows = [
        make_row(id=f"r{i}", external_id=f"e{i}", poster_path=f"/p{i:03d}.jpg",
                 archived_date=f"2026-{(i % 12) + 1:02d}-{(i % 27) + 1:02d}")
        for i in range(60)
    ]
    repo.get_recap_rows.return_value = rows
    result = await service().build_recap("u1", 2026, TODAY, fetch=no_fetch)
    assert len(result.total["posters"]) == 48
    assert len(set(result.total["posters"])) == 48  # 不重複
    # 其他場景仍然只給少量海報（它們是「該類別的代表」，不是全部）
    assert len(result.movies["posters"]) <= 6


@pytest.mark.asyncio
async def test_total_posters_use_every_work_when_fewer_than_the_cap(repo):
    rows = [make_row(id=f"r{i}", external_id=f"e{i}", poster_path=f"/p{i}.jpg") for i in range(20)]
    repo.get_recap_rows.return_value = rows
    result = await service().build_recap("u1", 2026, TODAY, fetch=no_fetch)
    assert len(result.total["posters"]) == 20
