from app.services.recap_titles import TITLES, select_title


def row(media_type="movie", genres=None, year=None):
    return {"media_type": media_type, "genres": genres, "year": year}


def rows_of(n, **kw):
    return [row(**kw) for _ in range(n)]


def test_titles_table_is_complete_and_bilingual():
    assert len(TITLES) == 12
    for title_id, names in TITLES.items():
        assert names["zh"].strip() and names["en"].strip(), title_id


def test_fewer_than_five_rows_has_no_title():
    assert select_title(rows_of(4, genres=["Horror"]), 2026) is None


def test_top_genre_horror_is_midnight_wanderer():
    result = select_title(rows_of(5, genres=["Horror"]), 2026)
    assert result["id"] == "midnight_wanderer"
    assert result["zh"] == TITLES["midnight_wanderer"]["zh"]
    assert result["en"] == TITLES["midnight_wanderer"]["en"]


def test_genre_match_is_case_insensitive():
    assert select_title(rows_of(5, genres=["HORROR"]), 2026)["id"] == "midnight_wanderer"


def test_book_category_mystery_and_detective_matches_midnight_wanderer():
    result = select_title(rows_of(5, media_type="book", genres=["Mystery & Detective"]), 2026)
    assert result["id"] == "midnight_wanderer"


def test_family_life_book_category_is_not_forever_young():
    result = select_title(rows_of(5, media_type="book", genres=["Family Life"]), 2026)
    assert result["id"] == "bookworm"


def test_genre_rules_in_order_first_top_genre_wins():
    assert select_title(rows_of(5, genres=["Science Fiction"]), 2026)["id"] == "star_voyager"
    assert select_title(rows_of(5, genres=["Comedy"]), 2026)["id"] == "joy_maker"
    assert select_title(rows_of(5, genres=["Drama"]), 2026)["id"] == "heart_collector"
    assert select_title(rows_of(5, genres=["Animation"]), 2026)["id"] == "forever_young"
    assert select_title(rows_of(5, genres=["Documentary"]), 2026)["id"] == "explorer"
    assert select_title(rows_of(5, genres=["Romance"]), 2026)["id"] == "romantic"


def test_old_average_release_year_is_old_soul():
    # 2026 − 2005 = 21 >= 20，且沒有類別資料
    assert select_title(rows_of(5, year=2005), 2026)["id"] == "old_soul"


def test_media_type_rules_without_genres():
    assert select_title(rows_of(5, media_type="book", year=2024), 2026)["id"] == "bookworm"
    tv_heavy = rows_of(3, media_type="tv", year=2024) + rows_of(2, media_type="movie", year=2024)
    assert select_title(tv_heavy, 2026)["id"] == "series_voyager"


def test_media_type_tie_prefers_movie_over_tv_over_book():
    mixed = rows_of(2, media_type="movie") + rows_of(2, media_type="tv") + rows_of(1, media_type="book")
    assert select_title(mixed, 2026)["id"] == "cinephile"


def test_unknown_media_type_falls_back_to_story_keeper():
    assert select_title(rows_of(5, media_type="other"), 2026)["id"] == "story_keeper"


def test_selection_is_deterministic():
    data = rows_of(3, genres=["Drama"], year=2001) + rows_of(2, genres=["Comedy"], year=2003)
    assert select_title(data, 2026) == select_title(list(data), 2026)
