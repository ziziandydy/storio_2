import asyncio

import pytest

from app.schemas.item import ItemDetailResponse, SeasonInfo
from app.services.recap_backfill import (
    backfill_rows,
    extract_metadata,
    needs_backfill,
    normalize_book_category,
)


def make_row(**overrides):
    row = {
        "id": "id-1",
        "external_id": "x1",
        "media_type": "movie",
        "seasons": None,
        "runtime_minutes": None,
        "episode_total": None,
        "genres": None,
        "page_count": None,
    }
    row.update(overrides)
    return row


def make_details(media_type="movie", **kw):
    return ItemDetailResponse(
        title="T", media_type=media_type, external_id="x1", source="tmdb", **kw
    )


# ---------- normalize_book_category ----------

@pytest.mark.parametrize("path,expected", [
    ("Fiction / Mystery & Detective / General", "Mystery & Detective"),
    ("Young Adult Fiction / Dystopian", "Dystopian"),
    ("Business & Economics / Personal Finance / General", "Personal Finance"),
    ("Self-Help / Motivational & Inspirational", "Motivational & Inspirational"),
    ("Juvenile Fiction / Fantasy / Dragons, Unicorns & Mythical Creatures", "Dragons, Unicorns & Mythical Creatures"),
    ("Fiction / General", None),
    ("Fiction", None),
    ("nonfiction", None),
    ("", None),
])
def test_normalize_book_category(path, expected):
    assert normalize_book_category(path) == expected


# ---------- needs_backfill ----------

def test_needs_backfill_complete_movie_is_false():
    assert needs_backfill(make_row(runtime_minutes=120, genres=["Drama"])) is False


def test_needs_backfill_movie_missing_genres_is_true():
    assert needs_backfill(make_row(runtime_minutes=120)) is True


def test_needs_backfill_tv_missing_episode_total_is_true():
    row = make_row(media_type="tv", runtime_minutes=45, genres=["Drama"])
    assert needs_backfill(row) is True


def test_needs_backfill_book_only_looks_at_page_count():
    assert needs_backfill(make_row(media_type="book")) is True
    assert needs_backfill(make_row(media_type="book", page_count=300)) is False  # 沒有 genres 也不再補抓


# ---------- extract_metadata ----------

def test_extract_movie_runtime_and_genres():
    details = make_details(runtime="129m", genres=["Drama", "Crime"])
    assert extract_metadata(details, make_row()) == {"runtime_minutes": 129, "genres": ["Drama", "Crime"]}


def test_extract_runtime_unparseable_is_omitted():
    assert "runtime_minutes" not in extract_metadata(make_details(runtime="? pages"), make_row())
    assert "runtime_minutes" not in extract_metadata(make_details(runtime=None), make_row())


def _seasons():
    return [
        SeasonInfo(season_number=1, name="S1", episode_count=8),
        SeasonInfo(season_number=2, name="S2", episode_count=10),
    ]


def test_extract_tv_episode_total_for_selected_seasons():
    details = make_details("tv", runtime="45m", seasons=_seasons())
    row = make_row(media_type="tv", seasons=[2])
    assert extract_metadata(details, row)["episode_total"] == 10


def test_extract_tv_episode_total_without_seasons_sums_all():
    details = make_details("tv", runtime="45m", seasons=_seasons())
    assert extract_metadata(details, make_row(media_type="tv"))["episode_total"] == 18


def test_extract_tv_episode_count_missing_omits_episode_total():
    seasons = [SeasonInfo(season_number=1, name="S1", episode_count=None)]
    details = make_details("tv", runtime="45m", seasons=seasons)
    assert "episode_total" not in extract_metadata(details, make_row(media_type="tv"))


def test_extract_book_page_count_and_normalized_genres():
    details = make_details(
        "book", page_count=352,
        genres=["Fiction / General", "Fiction / Mystery & Detective / General", "Fiction / Mystery & Detective / Traditional"],
    )
    result = extract_metadata(details, make_row(media_type="book"))
    assert result == {"page_count": 352, "genres": ["Mystery & Detective", "Traditional"]}


def test_extract_book_with_only_generic_categories_omits_genres():
    details = make_details("book", page_count=200, genres=["Fiction / General"])
    assert extract_metadata(details, make_row(media_type="book")) == {"page_count": 200}


# ---------- backfill_rows ----------

class Recorder:
    def __init__(self, result=None, delay=0.0, fail_for=()):
        self.result = result if result is not None else {"runtime_minutes": 100, "genres": ["Drama"]}
        self.delay = delay
        self.fail_for = fail_for
        self.fetch_calls = []
        self.saves = []
        self.running = 0
        self.max_running = 0

    async def fetch(self, row):
        self.fetch_calls.append(row["external_id"])
        self.running += 1
        self.max_running = max(self.max_running, self.running)
        try:
            if self.delay:
                await asyncio.sleep(self.delay)
            if row["external_id"] in self.fail_for:
                raise RuntimeError("TMDB down")
            return dict(self.result)
        finally:
            self.running -= 1

    async def save(self, row_id, fields):
        self.saves.append((row_id, fields))


@pytest.mark.asyncio
async def test_rewatch_rows_fetch_once_but_save_each():
    rows = [make_row(id="a", external_id="same"), make_row(id="b", external_id="same")]
    rec = Recorder()

    pending = await backfill_rows(rows, rec.fetch, rec.save)

    assert pending == 0
    assert rec.fetch_calls == ["same"]
    assert sorted(i for i, _ in rec.saves) == ["a", "b"]
    assert all(r["runtime_minutes"] == 100 and r["genres"] == ["Drama"] for r in rows)


@pytest.mark.asyncio
async def test_existing_values_are_not_overwritten():
    rows = [make_row(runtime_minutes=100)]
    rec = Recorder(result={"runtime_minutes": 999, "genres": ["Drama"]})

    await backfill_rows(rows, rec.fetch, rec.save)

    assert rows[0]["runtime_minutes"] == 100
    assert rows[0]["genres"] == ["Drama"]
    assert rec.saves == [("id-1", {"genres": ["Drama"]})]


@pytest.mark.asyncio
async def test_failed_fetch_is_no_data_and_does_not_affect_others():
    rows = [make_row(id="a", external_id="bad"), make_row(id="b", external_id="good")]
    rec = Recorder(fail_for=("bad",))

    pending = await backfill_rows(rows, rec.fetch, rec.save)

    assert pending == 0
    assert rows[0]["runtime_minutes"] is None
    assert rows[1]["runtime_minutes"] == 100


@pytest.mark.asyncio
async def test_fetch_returning_none_is_no_data():
    rows = [make_row()]

    async def fetch(row):
        return None

    rec = Recorder()
    assert await backfill_rows(rows, fetch, rec.save) == 0
    assert rec.saves == []


@pytest.mark.asyncio
async def test_budget_exceeded_reports_pending_without_error():
    rows = [make_row(id=str(i), external_id=f"e{i}") for i in range(3)]
    rec = Recorder(delay=1.0)

    pending = await backfill_rows(rows, rec.fetch, rec.save, budget_seconds=0.05)

    assert pending == 3
    assert rec.saves == []


@pytest.mark.asyncio
async def test_concurrency_is_limited():
    rows = [make_row(id=str(i), external_id=f"e{i}") for i in range(6)]
    rec = Recorder(delay=0.02)

    await backfill_rows(rows, rec.fetch, rec.save, concurrency=2)

    assert rec.max_running <= 2
    assert len(rec.saves) == 6


@pytest.mark.asyncio
async def test_save_failure_is_logged_and_does_not_stop_other_rows(caplog):
    rows = [make_row(id="a", external_id="e1"), make_row(id="b", external_id="e2")]
    rec = Recorder()

    async def flaky_save(row_id, fields):
        if row_id == "a":
            raise RuntimeError("DB down")
        await rec.save(row_id, fields)

    pending = await backfill_rows(rows, rec.fetch, flaky_save)

    assert pending == 0
    assert [i for i, _ in rec.saves] == ["b"]
    assert any("補抓寫回失敗" in r.getMessage() for r in caplog.records)


@pytest.mark.asyncio
async def test_nothing_to_backfill_makes_no_calls():
    rows = [make_row(runtime_minutes=100, genres=["Drama"])]
    rec = Recorder()

    assert await backfill_rows(rows, rec.fetch, rec.save) == 0
    assert rec.fetch_calls == []
