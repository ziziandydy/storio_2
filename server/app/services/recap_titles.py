"""年度 Recap 稱號：規則式、決定性、不呼叫 AI；所有稱號皆為正面。

規則依序比對，第一個符合者勝出：先看第一名類別，再看故事年齡，最後看數量最多的媒體類型。
文案為草案，待 Tu 審閱。
"""
import re
from typing import Dict, List, Optional, Tuple

from app.services.recap_stats import story_age, top_genres

TITLES: Dict[str, Dict[str, str]] = {
    "midnight_wanderer": {"zh": "午夜漫遊者", "en": "The Midnight Wanderer"},
    "star_voyager": {"zh": "星際旅人", "en": "The Star Voyager"},
    "joy_maker": {"zh": "快樂製造機", "en": "The Joy Maker"},
    "heart_collector": {"zh": "情感收藏家", "en": "The Heart Collector"},
    "forever_young": {"zh": "童心未泯", "en": "The Forever Young"},
    "explorer": {"zh": "探索者", "en": "The Explorer"},
    "romantic": {"zh": "浪漫派", "en": "The Romantic"},
    "old_soul": {"zh": "老靈魂", "en": "The Old Soul"},
    "bookworm": {"zh": "書海漫遊者", "en": "The Bookworm"},
    "series_voyager": {"zh": "追劇旅人", "en": "The Series Voyager"},
    "cinephile": {"zh": "銀幕常客", "en": "The Cinephile"},
    "story_keeper": {"zh": "故事守護者", "en": "The Story Keeper"},
}

# 第一名類別規則（依序）。關鍵字以「單字開頭」比對，不分大小寫：
# thriller 可比對 Thrillers & Suspense；mystery 可比對書類別 Mystery & Detective。
GENRE_RULES: List[Tuple[str, Tuple[str, ...]]] = [
    ("midnight_wanderer", ("horror", "thriller", "mystery")),
    ("star_voyager", ("science fiction", "sci-fi", "fantasy")),
    ("joy_maker", ("comedy",)),
    ("heart_collector", ("drama",)),
    ("forever_young", ("animation",)),
    ("explorer", ("documentary", "history")),
    ("romantic", ("romance",)),
]

OLD_SOUL_MIN_AGE = 20
MIN_ROWS = 5
MEDIA_RULES = {"movie": "cinephile", "tv": "series_voyager", "book": "bookworm"}
MEDIA_PRIORITY = {"movie": 3, "tv": 2, "book": 1}  # 同數量時 movie > tv > book


def _matches(genre_name: str, keywords: Tuple[str, ...]) -> bool:
    name = genre_name.casefold()
    return any(re.search(rf"\b{re.escape(kw)}", name) for kw in keywords)


def _result(title_id: str) -> dict:
    return {"id": title_id, **TITLES[title_id]}


def select_title(rows: List[dict], year: int) -> Optional[dict]:
    if len(rows) < MIN_ROWS:
        return None

    genres = top_genres(rows, limit=1)
    if genres:
        for title_id, keywords in GENRE_RULES:
            if _matches(genres[0]["name"], keywords):
                return _result(title_id)

    age = story_age(rows, year)
    if age and age["age"] >= OLD_SOUL_MIN_AGE:
        return _result("old_soul")

    counts: Dict[str, int] = {}
    for row in rows:
        media_type = row.get("media_type")
        if media_type in MEDIA_RULES:
            counts[media_type] = counts.get(media_type, 0) + 1
    if counts:
        best = max(counts, key=lambda m: (counts[m], MEDIA_PRIORITY[m]))
        return _result(MEDIA_RULES[best])

    return _result("story_keeper")
