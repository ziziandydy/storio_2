"""年度 Recap 稱號：規則式、決定性、不呼叫 AI；所有稱號皆為正面。

演算法（第一個命中者勝）：
1. 作品數 < 5 → 沒有稱號。
2. 至少 3 部有類別資料時看類別：把類別歸成「家族」（科幻與奇幻分開；TMDB 影集的合併類別同時算兩個家族），
   數出前兩名家族；第二名至少 2 部才混搭。有混搭稱號用混搭，否則用第一名的單一稱號。
3. 類別資料不足或沒有任何類別對應到家族：作品平均老 ≥ 20 年 → 老靈魂；否則看最多的媒體類型；其餘 → 故事守護者。

文案為草案，待 Tu 審閱。
"""
import re
from collections import Counter
from typing import Dict, FrozenSet, List, Optional, Set, Tuple

from app.services.recap_stats import story_age

# 類別家族 → 正規式（對小寫化後的類別名稱 re.search）。
# family／kids 用整串比對，避免誤中書類別 "Family Life"、"Family & Relationships"。
GENRE_FAMILIES: Dict[str, Tuple[str, ...]] = {
    "action": (r"\baction",),
    "adventure": (r"\badventure",),
    "animation": (r"\banimation",),
    "comedy": (r"\bcomedy",),
    "crime": (r"\bcrime",),
    "documentary": (r"\bdocumentary",),
    "drama": (r"\bdrama",),
    "family": (r"^(family|kids)$",),
    "fantasy": (r"\bfantasy",),
    "history": (r"\bhistory",),
    "horror": (r"\bhorror",),
    "music": (r"^music",),
    "mystery": (r"\bmystery",),
    "romance": (r"\bromance",),
    "scifi": (r"science fiction", r"sci-fi", r"\bdystopian"),
    "thriller": (r"\bthriller",),
    "war": (r"^war\b",),
    "western": (r"\bwestern",),
    "selfhelp": (r"self-help", r"inspiration", r"personal growth", r"motivational", r"personal success"),
    "business": (r"\bbusiness", r"\bfinance", r"\bmoney", r"\beconomics", r"\binvesting"),
    "literary": (r"^classics$", r"\bliterary", r"\bliterature", r"ancient & classical"),
}
_COMPILED = {family: [re.compile(p) for p in patterns] for family, patterns in GENRE_FAMILIES.items()}

# 同數量時越專門越優先，避免被 Drama／Action 這類泛類別吃掉
FAMILY_PRIORITY: List[str] = [
    "horror", "scifi", "fantasy", "animation", "mystery", "crime", "thriller", "war", "western",
    "documentary", "history", "music", "romance", "comedy", "family",
    "selfhelp", "business", "literary", "drama", "action", "adventure",
]
_PRIORITY_INDEX = {family: i for i, family in enumerate(FAMILY_PRIORITY)}

# (家族, 稱號 id, 中文, 英文)
_SINGLE_DEFS = [
    ("action", "adrenaline_chaser", "熱血先鋒", "The Adrenaline Chaser"),
    ("adventure", "pathfinder", "冒險探路人", "The Pathfinder"),
    ("animation", "dream_painter", "繪夢旅人", "The Dream Painter"),
    ("comedy", "joy_maker", "快樂製造機", "The Joy Maker"),
    ("crime", "crime_watcher", "罪案觀察家", "The Crime Watcher"),
    ("documentary", "truth_seeker", "真實探索者", "The Truth Seeker"),
    ("drama", "heart_collector", "情感收藏家", "The Heart Collector"),
    ("family", "warm_hearth", "溫暖守護者", "The Warm Hearth"),
    ("fantasy", "spellbound_traveler", "魔法旅人", "The Spellbound Traveler"),
    ("history", "time_archaeologist", "時光考古家", "The Time Archaeologist"),
    ("horror", "midnight_wanderer", "午夜漫遊者", "The Midnight Wanderer"),
    ("music", "melody_keeper", "旋律收藏家", "The Melody Keeper"),
    ("mystery", "puzzle_solver", "謎題解碼員", "The Puzzle Solver"),
    ("romance", "romantic", "浪漫派", "The Romantic"),
    ("scifi", "star_voyager", "星際旅人", "The Star Voyager"),
    ("thriller", "edge_sitter", "心跳加速者", "The Edge-Sitter"),
    ("war", "war_witness", "戰場見證者", "The War Witness"),
    ("western", "frontier_drifter", "荒野浪人", "The Frontier Drifter"),
    ("selfhelp", "self_builder", "自我成長實踐家", "The Self-Builder"),
    ("business", "wealth_thinker", "財富思考家", "The Wealth Thinker"),
    ("literary", "literary_soul", "文學靈魂", "The Literary Soul"),
]

# (家族 A, 家族 B, 稱號 id, 中文, 英文)；兩個家族不分先後
_PAIR_DEFS = [
    ("scifi", "fantasy", "dimension_hopper", "跨次元旅人", "The Dimension Hopper"),
    ("scifi", "action", "space_warrior", "星際戰士", "The Space Warrior"),
    ("scifi", "thriller", "dystopia_watcher", "反烏托邦觀察員", "The Dystopia Watcher"),
    ("scifi", "drama", "cosmic_thinker", "宇宙思想家", "The Cosmic Thinker"),
    ("scifi", "animation", "galactic_animator", "銀河動畫迷", "The Galactic Animator"),
    ("scifi", "adventure", "star_sea_explorer", "星海探險家", "The Star-Sea Explorer"),
    ("fantasy", "adventure", "epic_adventurer", "史詩冒險家", "The Epic Adventurer"),
    ("fantasy", "animation", "storybook_wizard", "魔法繪夢者", "The Storybook Wizard"),
    ("fantasy", "romance", "fairytale_believer", "童話信徒", "The Fairytale Believer"),
    ("fantasy", "drama", "legend_bard", "傳說吟遊者", "The Legend Bard"),
    ("animation", "comedy", "cartoon_jester", "歡樂動畫迷", "The Cartoon Jester"),
    ("animation", "action", "hero_at_heart", "熱血動漫魂", "The Hero at Heart"),
    ("animation", "family", "movie_night_regular", "闔家動畫夜", "The Movie-Night Regular"),
    ("animation", "adventure", "dream_chaser", "夢想冒險團", "The Dream Chaser"),
    ("animation", "drama", "gentle_animator", "治癒系動畫迷", "The Gentle Animator"),
    ("horror", "thriller", "nightmare_seeker", "午夜驚魂客", "The Nightmare Seeker"),
    ("horror", "mystery", "dark_sleuth", "暗夜解謎人", "The Dark Sleuth"),
    ("horror", "comedy", "scream_laugher", "笑著尖叫的人", "The Scream-Laugher"),
    ("crime", "mystery", "detective_notebook", "偵探筆記本", "The Detective's Notebook"),
    ("crime", "thriller", "alley_tracker", "暗巷追兇者", "The Alley Tracker"),
    ("crime", "drama", "noir_storyteller", "黑色故事家", "The Noir Storyteller"),
    ("action", "thriller", "edge_runner", "腎上腺素飆升者", "The Edge-of-Seat Runner"),
    ("action", "comedy", "action_jester", "爆笑動作迷", "The Action Jester"),
    ("action", "adventure", "fearless", "無畏冒險者", "The Fearless"),
    ("drama", "romance", "love_story_keeper", "愛情故事收藏家", "The Love-Story Keeper"),
    ("drama", "history", "chronicler", "歲月說書人", "The Chronicler"),
    ("drama", "war", "wartime_witness", "烽火見證人", "The Wartime Witness"),
    ("drama", "thriller", "tension_watcher", "張力觀察家", "The Tension Watcher"),
    ("drama", "mystery", "plot_detective", "解謎劇迷", "The Plot Detective"),
    ("drama", "comedy", "bittersweet_heart", "悲喜交集派", "The Bittersweet Heart"),
    ("comedy", "romance", "romcom_devotee", "甜蜜喜劇迷", "The Rom-Com Devotee"),
    ("comedy", "family", "family_laugher", "歡樂一家人", "The Family Laugher"),
    ("documentary", "history", "archivist", "歷史研究員", "The Archivist"),
    ("mystery", "thriller", "brain_teaser", "燒腦懸疑迷", "The Brain-Teaser"),
    ("literary", "history", "reader_of_ages", "古今讀書人", "The Reader of Ages"),
    ("selfhelp", "business", "growth_investor", "人生成長投資家", "The Growth Investor"),
]

_FALLBACK_DEFS = [
    ("old_soul", "老靈魂", "The Old Soul"),
    ("bookworm", "書海漫遊者", "The Bookworm"),
    ("series_voyager", "追劇旅人", "The Series Voyager"),
    ("cinephile", "銀幕常客", "The Cinephile"),
    ("story_keeper", "故事守護者", "The Story Keeper"),
]

SINGLE_TITLES: Dict[str, str] = {family: tid for family, tid, _zh, _en in _SINGLE_DEFS}
PAIR_TITLES: Dict[FrozenSet[str], str] = {frozenset({a, b}): tid for a, b, tid, _zh, _en in _PAIR_DEFS}
TITLES: Dict[str, Dict[str, str]] = {
    **{tid: {"zh": zh, "en": en} for _f, tid, zh, en in _SINGLE_DEFS},
    **{tid: {"zh": zh, "en": en} for _a, _b, tid, zh, en in _PAIR_DEFS},
    **{tid: {"zh": zh, "en": en} for tid, zh, en in _FALLBACK_DEFS},
}

OLD_SOUL_MIN_AGE = 20
MIN_ROWS = 5
MIN_GENRE_ROWS = 3  # 至少幾部作品有類別資料才看類別
MIN_SECOND_FAMILY_COUNT = 2  # 第二名家族至少幾部才混搭
MEDIA_RULES = {"movie": "cinephile", "tv": "series_voyager", "book": "bookworm"}
MEDIA_PRIORITY = {"movie": 3, "tv": 2, "book": 1}  # 同數量時 movie > tv > book


def genre_families(genres: List[str]) -> Set[str]:
    """一部作品的所有類別對應到的家族集合；一個類別可屬多個家族（例如 Sci-Fi & Fantasy）。"""
    families: Set[str] = set()
    for name in genres or []:
        clean = (name or "").strip().casefold()
        if not clean:
            continue
        for family, patterns in _COMPILED.items():
            if any(p.search(clean) for p in patterns):
                families.add(family)
    return families


def ranked_families(rows: List[dict]) -> List[Tuple[str, int]]:
    """各家族的作品數（每部作品對每個家族只計 1），依數量多 → 專門程度排序（決定性）。"""
    counts: Counter = Counter()
    for row in rows:
        for family in genre_families(row.get("genres") or []):
            counts[family] += 1
    return sorted(counts.items(), key=lambda kv: (-kv[1], _PRIORITY_INDEX[kv[0]]))


def _result(title_id: str) -> dict:
    return {"id": title_id, **TITLES[title_id]}


def select_title(rows: List[dict], year: int) -> Optional[dict]:
    if len(rows) < MIN_ROWS:
        return None

    if sum(1 for r in rows if r.get("genres")) >= MIN_GENRE_ROWS:
        ranked = ranked_families(rows)
        if ranked:
            top1 = ranked[0][0]
            if len(ranked) > 1 and ranked[1][1] >= MIN_SECOND_FAMILY_COUNT:
                pair = frozenset({top1, ranked[1][0]})
                if pair in PAIR_TITLES:
                    return _result(PAIR_TITLES[pair])
            return _result(SINGLE_TITLES[top1])

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
