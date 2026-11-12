from app.services.recap_titles import (
    GENRE_FAMILIES,
    PAIR_TITLES,
    SINGLE_TITLES,
    TITLES,
    genre_families,
    ranked_families,
    select_title,
)


def row(media_type="movie", genres=None, year=None):
    return {"media_type": media_type, "genres": genres, "year": year}


def rows_of(n, **kw):
    return [row(**kw) for _ in range(n)]


def title_id(rows, year=2026):
    result = select_title(rows, year)
    return result["id"] if result else None


# ---------- 資料完整性 ----------

def test_every_title_is_bilingual_and_unique():
    ids = list(TITLES)
    assert len(ids) == len(set(ids))
    zh_names = [t["zh"] for t in TITLES.values()]
    assert len(zh_names) == len(set(zh_names))
    for title_id_, names in TITLES.items():
        assert names["zh"].strip() and names["en"].strip(), title_id_


def test_title_tables_reference_existing_ids_and_families():
    for family, tid in SINGLE_TITLES.items():
        assert family in GENRE_FAMILIES and tid in TITLES
    for pair, tid in PAIR_TITLES.items():
        assert len(pair) == 2 and tid in TITLES
        assert all(f in GENRE_FAMILIES for f in pair)
    assert set(SINGLE_TITLES) == set(GENRE_FAMILIES)  # 每個家族都有單一稱號
    assert len(TITLES) == len(SINGLE_TITLES) + len(PAIR_TITLES) + 5  # 另有 5 個保底稱號


def test_forever_young_is_gone():
    assert "forever_young" not in TITLES
    assert all("童心未泯" != t["zh"] for t in TITLES.values())


# ---------- 類別家族 ----------

def test_genre_families_maps_combined_tv_genres_to_both_families():
    assert genre_families(["Sci-Fi & Fantasy"]) == {"scifi", "fantasy"}
    assert genre_families(["Action & Adventure"]) == {"action", "adventure"}


def test_genre_families_separates_scifi_and_fantasy_for_movies():
    assert genre_families(["Science Fiction"]) == {"scifi"}
    assert genre_families(["Fantasy"]) == {"fantasy"}


def test_genre_families_family_needs_exact_name():
    assert genre_families(["Family"]) == {"family"}
    assert genre_families(["Kids"]) == {"family"}
    assert genre_families(["Family Life"]) == set()
    assert genre_families(["Family & Relationships"]) == set()


def test_genre_families_other_mappings():
    assert genre_families(["War & Politics"]) == {"war"}
    assert genre_families(["Music"]) == {"music"}
    assert genre_families(["Classics"]) == {"literary"}
    assert genre_families(["Mystery & Detective"]) == {"mystery"}
    assert genre_families(["Thrillers & Suspense"]) == {"thriller"}
    assert genre_families(["Reality"]) == set()
    assert genre_families([]) == set()
    assert genre_families(["HORROR"]) == {"horror"}


def test_ranked_families_orders_by_count_then_specificity():
    # scifi 與 drama 同為 3 部：越專門的 scifi 優先
    rows = rows_of(3, genres=["Science Fiction"]) + rows_of(3, genres=["Drama"])
    assert ranked_families(rows)[0] == ("scifi", 3)
    assert ranked_families(rows)[1] == ("drama", 3)


def test_ranked_families_counts_each_work_once_per_family():
    rows = [row(genres=["Sci-Fi & Fantasy", "Fantasy"])]  # fantasy 只計 1
    assert dict(ranked_families(rows)) == {"fantasy": 1, "scifi": 1}


# ---------- 選取：單一家族 ----------

def test_fewer_than_five_rows_has_no_title():
    assert select_title(rows_of(4, genres=["Horror"]), 2026) is None


def test_scifi_and_fantasy_are_separate_titles():
    assert title_id(rows_of(5, genres=["Science Fiction"])) == "star_voyager"
    assert title_id(rows_of(5, genres=["Fantasy"])) == "spellbound_traveler"


def test_single_family_titles():
    assert title_id(rows_of(5, genres=["Animation"])) == "dream_painter"
    assert title_id(rows_of(5, genres=["Comedy"])) == "joy_maker"
    assert title_id(rows_of(5, genres=["Drama"])) == "heart_collector"
    assert title_id(rows_of(5, genres=["Documentary"])) == "truth_seeker"
    assert title_id(rows_of(5, genres=["Romance"])) == "romantic"


def test_genre_match_is_case_insensitive():
    assert title_id(rows_of(5, genres=["HORROR"])) == "midnight_wanderer"
    assert title_id(rows_of(5, genres=["horror"])) == "midnight_wanderer"


def test_result_shape_has_id_zh_en():
    result = select_title(rows_of(5, genres=["Horror"]), 2026)
    assert result == {"id": "midnight_wanderer", **TITLES["midnight_wanderer"], "posters": []}


# ---------- 選取：混搭 ----------

def test_combined_tv_genre_gives_dimension_hopper():
    assert title_id(rows_of(5, media_type="tv", genres=["Sci-Fi & Fantasy"])) == "dimension_hopper"


def test_combined_action_adventure_gives_fearless():
    assert title_id(rows_of(5, media_type="tv", genres=["Action & Adventure"])) == "fearless"


def test_top_two_families_mix_into_pair_title():
    rows = rows_of(3, genres=["Animation", "Comedy"]) + rows_of(2, genres=["Animation", "Action"])
    # animation 5、comedy 3、action 2 → 前兩名 animation＋comedy
    assert title_id(rows) == "cartoon_jester"


def test_pair_title_is_order_independent():
    fantasy_first = rows_of(3, genres=["Fantasy"]) + rows_of(2, genres=["Science Fiction"])
    scifi_first = rows_of(3, genres=["Science Fiction"]) + rows_of(2, genres=["Fantasy"])
    assert title_id(fantasy_first) == title_id(scifi_first) == "dimension_hopper"


def test_second_family_with_only_one_work_does_not_mix():
    rows = rows_of(4, genres=["Horror"]) + rows_of(1, genres=["Comedy"])
    assert title_id(rows) == "midnight_wanderer"  # 不是 scream_laugher


def test_pair_without_defined_title_falls_back_to_first_family():
    rows = rows_of(3, genres=["Western"]) + rows_of(2, genres=["Music"])
    assert title_id(rows) == "frontier_drifter"


def test_tie_broken_by_specificity_not_alphabet():
    rows = rows_of(3, genres=["Science Fiction"]) + rows_of(3, genres=["Drama"])
    assert title_id(rows) == "cosmic_thinker"  # scifi 第一、drama 第二


def test_common_drama_pairs_have_their_own_titles():
    # dev 真實資料顯示「劇情＋驚悚」最常見，不可全部落到單一的情感收藏家
    assert title_id(rows_of(3, genres=["Drama"]) + rows_of(2, genres=["Thriller"])) == "tension_watcher"
    assert title_id(rows_of(3, genres=["Drama"]) + rows_of(2, genres=["Mystery"])) == "plot_detective"
    assert title_id(rows_of(3, genres=["Drama"]) + rows_of(2, genres=["Comedy"])) == "bittersweet_heart"


def test_distinct_pairs_give_distinct_titles():
    combos = [
        ("Science Fiction", "Fantasy"), ("Animation", "Comedy"), ("Horror", "Thriller"),
        ("Crime", "Mystery"), ("Drama", "Romance"), ("Action", "Adventure"),
        ("Comedy", "Family"), ("Documentary", "History"), ("Fantasy", "Romance"),
        ("Animation", "Action"),
    ]
    ids = {title_id(rows_of(3, genres=[a]) + rows_of(2, genres=[b])) for a, b in combos}
    assert len(ids) >= 8


# ---------- 書的類別 ----------

def test_book_category_mystery_and_detective():
    assert title_id(rows_of(5, media_type="book", genres=["Mystery & Detective"])) == "puzzle_solver"


def test_book_family_life_is_not_family_title():
    assert title_id(rows_of(5, media_type="book", genres=["Family Life"])) == "bookworm"


def test_book_business_and_selfhelp_mix():
    rows = rows_of(3, media_type="book", genres=["Personal Finance"]) + rows_of(
        2, media_type="book", genres=["Inspiration & Personal Growth"]
    )
    assert title_id(rows) == "growth_investor"


# ---------- 類別資料不足 → 保底 ----------

def test_too_few_rows_with_genres_uses_fallback():
    rows = rows_of(2, genres=["Horror"]) + rows_of(3)
    assert title_id(rows) == "cinephile"


def test_genres_that_map_to_no_family_use_fallback():
    assert title_id(rows_of(5, genres=["Reality"])) == "cinephile"


def test_old_average_release_year_is_old_soul_without_genres():
    assert title_id(rows_of(5, year=2005)) == "old_soul"


def test_media_type_fallbacks_and_tie_priority():
    assert title_id(rows_of(5, media_type="book", year=2024)) == "bookworm"
    tv_heavy = rows_of(3, media_type="tv", year=2024) + rows_of(2, media_type="movie", year=2024)
    assert title_id(tv_heavy) == "series_voyager"
    mixed = rows_of(2, media_type="movie") + rows_of(2, media_type="tv") + rows_of(1, media_type="book")
    assert title_id(mixed) == "cinephile"


def test_unknown_media_type_falls_back_to_story_keeper():
    assert title_id(rows_of(5, media_type="other")) == "story_keeper"


def test_selection_is_deterministic():
    data = rows_of(3, genres=["Drama"], year=2001) + rows_of(2, genres=["Comedy"], year=2003)
    assert select_title(data, 2026) == select_title(list(data), 2026)


# ---------- 稱號的來源海報 ----------

def titled_row(poster, genres=None, media_type="movie", year=None, date="2026-03-05"):
    return {"media_type": media_type, "genres": genres, "year": year, "poster_path": poster, "archived_date": date}


def test_genre_title_posters_are_the_works_that_made_the_title():
    rows = [
        titled_row("/d1.jpg", ["Drama"], date="2026-01-01"),
        titled_row("/d2.jpg", ["Drama"], date="2026-02-01"),
        titled_row("/d3.jpg", ["Drama"], date="2026-03-01"),
        titled_row("/c1.jpg", ["Comedy"], date="2026-04-01"),
        titled_row("/d4.jpg", ["Drama"], date="2026-05-01"),
    ]
    posters = select_title(rows, 2026)["posters"]
    assert "/d1.jpg" in posters and "/d2.jpg" in posters and "/d3.jpg" in posters
    assert "/c1.jpg" not in posters  # 喜劇不是這個稱號的來源


def test_pair_title_posters_come_from_both_families():
    rows = (
        [titled_row(f"/dr{i}.jpg", ["Drama"]) for i in range(3)]
        + [titled_row(f"/th{i}.jpg", ["Thriller"]) for i in range(3)]
        + [titled_row("/other.jpg", ["Documentary"])]
    )
    result = select_title(rows, 2026)
    if result["id"] in PAIR_TITLES.values():
        assert any(p.startswith("/dr") for p in result["posters"])
        assert any(p.startswith("/th") for p in result["posters"])


def test_old_soul_posters_are_the_oldest_works_first():
    rows = [titled_row(f"/y{y}.jpg", year=y) for y in (1975, 1982, 1990, 2001, 2003, 2005)]
    result = select_title(rows, 2026)
    assert result["id"] == "old_soul"
    assert result["posters"][:3] == ["/y1975.jpg", "/y1982.jpg", "/y1990.jpg"]


def test_media_title_posters_come_from_that_media_type():
    rows = [titled_row(f"/b{i}.jpg", media_type="book") for i in range(4)] + [titled_row("/m.jpg", media_type="movie")]
    result = select_title(rows, 2026)
    assert all(p.startswith("/b") for p in result["posters"])


def test_title_posters_are_empty_list_when_no_row_has_a_poster_and_capped_at_six():
    assert select_title([titled_row(None, ["Drama"]) for _ in range(5)], 2026)["posters"] == []
    many = [titled_row(f"/p{i}.jpg", ["Drama"], date=f"2026-01-{i + 1:02d}") for i in range(9)]
    assert len(select_title(many, 2026)["posters"]) == 6
