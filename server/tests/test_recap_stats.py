from app.services import recap_stats as rs


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
        "archived_date": None,
        "seasons": None,
        "runtime_minutes": None,
        "episode_total": None,
        "genres": None,
        "page_count": None,
    }
    row.update(overrides)
    return row


# ---------- 年份歸屬 ----------

def test_year_uses_archived_date_over_created_at():
    row = make_row(archived_date="2025-12-31", created_at="2026-01-01T03:00:00+00:00")
    assert rs.year_of(row) == 2025


def test_effective_date_falls_back_to_created_at_date_part():
    row = make_row(archived_date=None, created_at="2026-03-05T00:00:00+00:00")
    assert rs.effective_date(row) == "2026-03-05"


def test_row_without_any_date_has_no_year_and_is_excluded():
    row = make_row(archived_date=None, created_at=None)
    assert rs.year_of(row) is None
    assert rs.rows_in_year([row], 2026) == []


def test_rows_in_year_filters_by_year():
    rows = [
        make_row(id="a", archived_date="2026-01-01"),
        make_row(id="b", archived_date="2025-12-31"),
    ]
    assert [r["id"] for r in rs.rows_in_year(rows, 2026)] == ["a"]


# ---------- 時間估算 ----------

def test_estimate_movie_minutes():
    assert rs.estimate_minutes(make_row(media_type="movie", runtime_minutes=120)) == 120


def test_estimate_tv_is_runtime_times_episodes():
    assert rs.estimate_minutes(make_row(media_type="tv", runtime_minutes=45, episode_total=10)) == 450


def test_estimate_tv_without_episode_total_is_none():
    assert rs.estimate_minutes(make_row(media_type="tv", runtime_minutes=45)) is None


def test_estimate_book_uses_forty_pages_per_hour():
    # 1200 頁 ÷ 40 頁/小時 = 30 小時
    assert rs.estimate_minutes(make_row(media_type="book", page_count=1200)) == 1800


def test_estimate_without_data_is_none():
    assert rs.estimate_minutes(make_row(media_type="movie")) is None
    assert rs.estimate_minutes(make_row(media_type="book")) is None


def test_time_summary_counts_only_rows_with_data():
    rows = [make_row(runtime_minutes=120), make_row(runtime_minutes=None)]
    assert rs.time_summary(rows) == {"count": 2, "minutes": 120, "items_with_data": 1, "estimated": False}


def test_time_summary_marks_estimated_when_book_or_tv_contributes():
    rows = [make_row(media_type="book", page_count=40)]
    summary = rs.time_summary(rows)
    assert summary["minutes"] == 60
    assert summary["estimated"] is True


def test_time_summary_with_no_data_is_zero_not_fake():
    summary = rs.time_summary([make_row(), make_row()])
    assert summary == {"count": 2, "minutes": 0, "items_with_data": 0, "estimated": False}


def test_rewatch_counts_each_row():
    rows = [make_row(id="a", external_id="same", runtime_minutes=100),
            make_row(id="b", external_id="same", runtime_minutes=100)]
    summary = rs.time_summary(rows)
    assert summary["count"] == 2
    assert summary["minutes"] == 200


# ---------- 類別 ----------

def test_top_genres_counts_every_genre_case_insensitively():
    rows = [
        make_row(genres=["Drama", "Crime"]),
        make_row(genres=["drama"]),
        make_row(genres=["Comedy"]),
    ]
    assert rs.top_genres(rows) == [
        {"name": "Drama", "count": 2},
        {"name": "Comedy", "count": 1},
        {"name": "Crime", "count": 1},
    ]


def test_top_genres_tie_broken_alphabetically_and_limited_to_three():
    rows = [make_row(genres=["D"]), make_row(genres=["C"]), make_row(genres=["B"]), make_row(genres=["A"])]
    result = rs.top_genres(rows)
    assert [g["name"] for g in result] == ["A", "B", "C"]


def test_top_genres_needs_three_rows_with_genres():
    rows = [make_row(genres=["Drama"]), make_row(genres=["Drama"]), make_row(genres=None)]
    assert rs.top_genres(rows) is None


# ---------- 故事年齡 ----------

def test_story_age_is_year_minus_average_release_year():
    rows = [make_row(year=y) for y in (2009, 2009, 2009, 2009, 2009)]
    assert rs.story_age(rows, 2026) == {"avg_year": 2009, "age": 17, "favorite_decade": 2000}


def test_story_age_favorite_decade_is_most_common():
    rows = [make_row(year=y) for y in (1999, 1994, 2003, 2001, 1995)]
    assert rs.story_age(rows, 2026)["favorite_decade"] == 1990


def test_story_age_decade_tie_prefers_more_recent():
    rows = [make_row(year=y) for y in (1990, 1991, 2010, 2011, 2000)]
    assert rs.story_age(rows, 2026)["favorite_decade"] == 2010


def test_story_age_needs_five_rows_with_year():
    rows = [make_row(year=2000) for _ in range(4)] + [make_row(year=None)]
    assert rs.story_age(rows, 2026) is None


def test_stats_are_deterministic():
    rows = [make_row(genres=["Drama", "Comedy"], year=2001 + i) for i in range(6)]
    assert rs.top_genres(rows) == rs.top_genres(list(rows))
    assert rs.story_age(rows, 2026) == rs.story_age(list(rows), 2026)


# ---------- 月份節奏 ----------

def test_monthly_counts_by_effective_date_month():
    rows = [make_row(archived_date="2026-03-02"), make_row(archived_date="2026-03-30"), make_row(archived_date="2026-07-01")]
    counts = rs.monthly_counts(rows)
    assert len(counts) == 12
    assert counts[2] == 2 and counts[6] == 1 and sum(counts) == 3


def test_months_active_needs_two_months():
    assert rs.months_active([0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 0, 0]) == {"count": 2}
    assert rs.months_active([0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0]) is None


def test_peak_month_needs_two_items():
    assert rs.peak_month([1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]) is None


def test_peak_month_tie_picks_earlier_month():
    counts = [0, 0, 2, 0, 2, 0, 0, 0, 0, 0, 0, 0]
    assert rs.peak_month(counts) == {"month": 3, "count": 2}


# ---------- 年度之最 ----------

def test_top_rated_counts_highest_rating_and_limits_items_to_three():
    rows = [make_row(rating=r, archived_date=f"2026-01-{i + 1:02d}", title=f"T{i}")
            for i, r in enumerate([0, 0, 8, 10, 10, 10, 10])]
    result = rs.top_rated(rows)
    assert result["rating"] == 10
    assert result["count"] == 4
    assert len(result["items"]) == 3
    assert result["items"][0]["title"] == "T6"  # 最近的優先


def test_top_rated_all_unrated_is_none():
    assert rs.top_rated([make_row(rating=0), make_row(rating=0)]) is None


# ---------- 開始與結束 ----------

def test_first_last_needs_two_rows():
    assert rs.first_last([make_row()]) is None


def test_first_last_orders_by_date_then_created_at():
    rows = [
        make_row(title="mid", archived_date="2026-05-01"),
        make_row(title="last", archived_date="2026-09-01"),
        make_row(title="first", archived_date="2026-02-01"),
    ]
    result = rs.first_last(rows)
    assert result["first"]["title"] == "first" and result["first"]["date"] == "2026-02-01"
    assert result["last"]["title"] == "last"


def test_first_last_same_day_uses_created_at():
    rows = [
        make_row(title="later", archived_date="2026-05-01", created_at="2026-05-01T10:00:00+00:00"),
        make_row(title="earlier", archived_date="2026-05-01", created_at="2026-05-01T08:00:00+00:00"),
    ]
    result = rs.first_last(rows)
    assert result["first"]["title"] == "earlier" and result["last"]["title"] == "later"


# ---------- 心得 ----------

def test_reflection_ignores_blank_notes():
    assert rs.pick_reflection([make_row(notes="   "), make_row(notes=None)]) is None


def test_reflection_prefers_highest_rating():
    rows = [
        make_row(id="short9", notes="好看", rating=9),
        make_row(id="long7", notes="這部電影很長很長的心得內容", rating=7),
    ]
    result = rs.pick_reflection(rows)
    assert result["count"] == 2
    assert result["candidates"][0]["id"] == "short9"


def test_reflection_unrated_picks_longest():
    rows = [make_row(id="a", notes="短", rating=0), make_row(id="b", notes="比較長的心得", rating=0)]
    assert rs.pick_reflection(rows)["candidates"][0]["id"] == "b"


def test_reflection_text_truncated_to_forty_chars_with_ellipsis():
    result = rs.pick_reflection([make_row(notes="字" * 60)])
    assert result["candidates"][0]["text"] == "字" * 40 + "…"


def test_reflection_short_text_unchanged_and_candidates_capped_at_ten():
    rows = [make_row(id=str(i), notes=f"心得{i}") for i in range(12)]
    result = rs.pick_reflection(rows)
    assert result["count"] == 12
    assert len(result["candidates"]) == 10
    assert result["candidates"][0]["text"].startswith("心得")


# ---------- 海報清單 ----------

def test_recent_posters_skips_missing_dedupes_and_orders_recent_first():
    rows = [
        make_row(poster_path="/a.jpg", archived_date="2026-01-01"),
        make_row(poster_path=None, archived_date="2026-05-01"),
        make_row(poster_path="", archived_date="2026-04-01"),
        make_row(poster_path="/b.jpg", archived_date="2026-03-01"),
        make_row(poster_path="/a.jpg", archived_date="2026-06-01"),
    ]
    assert rs.recent_posters(rows) == ["/a.jpg", "/b.jpg"]


def test_recent_posters_respects_limit_and_defaults_to_six():
    rows = [make_row(poster_path=f"/p{i}.jpg", archived_date=f"2026-01-{i + 1:02d}") for i in range(8)]
    assert len(rs.recent_posters(rows)) == 6
    assert rs.recent_posters(rows, limit=2) == ["/p7.jpg", "/p6.jpg"]


def test_recent_posters_without_any_poster_is_empty_list():
    assert rs.recent_posters([make_row(), make_row(poster_path=None)]) == []


def test_rows_in_month_uses_effective_date_month():
    rows = [
        make_row(id="a", archived_date="2026-03-02"),
        make_row(id="b", archived_date="2026-07-01"),
        make_row(id="c", archived_date=None, created_at="2026-03-30T00:00:00+00:00"),
    ]
    assert [r["id"] for r in rs.rows_in_month(rows, 3)] == ["a", "c"]
    assert rs.rows_in_month(rows, 12) == []
