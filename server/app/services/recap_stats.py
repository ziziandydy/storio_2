"""年度 Recap 統計：全部為不碰 DB 的純函式，輸入為 CollectionRepository.get_recap_rows 的列 dict。

日期規則沿用 collection-date-model：優先 archived_date，為空退回 created_at 的日期部分，
一律用字串取年月，不做時區轉換。
"""
from collections import Counter
from typing import List, Optional

RECAP_THRESHOLD = 3  # 該年至少幾筆收藏才能產生 Recap
BOOK_PAGES_PER_HOUR = 40  # 書的閱讀速度估算（集中定義）


# ---------- 年份歸屬 ----------

def effective_date(row: dict) -> Optional[str]:
    """回傳 YYYY-MM-DD；archived_date 優先，退回 created_at 前 10 字元，皆空回 None。"""
    archived = row.get("archived_date")
    if archived:
        return str(archived)[:10]
    created = row.get("created_at")
    if created:
        return str(created)[:10]
    return None


def year_of(row: dict) -> Optional[int]:
    date = effective_date(row)
    if not date:
        return None
    try:
        return int(date[:4])
    except ValueError:
        return None


def rows_in_year(rows: List[dict], year: int) -> List[dict]:
    return [r for r in rows if year_of(r) == year]


# ---------- 時間估算 ----------

def estimate_minutes(row: dict) -> Optional[int]:
    """單筆收藏花的分鐘數；沒有資料回 None（不可當成 0）。"""
    media_type = row.get("media_type")
    if media_type == "movie":
        return row.get("runtime_minutes")
    if media_type == "tv":
        runtime, episodes = row.get("runtime_minutes"), row.get("episode_total")
        if runtime is None or episodes is None:
            return None
        return runtime * episodes
    if media_type == "book":
        pages = row.get("page_count")
        if pages is None:
            return None
        return round(pages * 60 / BOOK_PAGES_PER_HOUR)
    return None


def time_summary(rows: List[dict]) -> dict:
    minutes = 0
    with_data = 0
    estimated = False
    for row in rows:
        m = estimate_minutes(row)
        if m is None:
            continue
        minutes += m
        with_data += 1
        if row.get("media_type") in ("tv", "book"):
            estimated = True
    return {"count": len(rows), "minutes": minutes, "items_with_data": with_data, "estimated": estimated}


# ---------- 類別 ----------

def top_genres(rows: List[dict], limit: int = 3) -> Optional[List[dict]]:
    """每部作品的所有類別都計入；至少 3 列有類別才回傳。同分以名稱字母序（決定性）。"""
    with_genres = [r for r in rows if r.get("genres")]
    if len(with_genres) < RECAP_THRESHOLD:
        return None
    counts: Counter = Counter()
    display: dict = {}
    for row in with_genres:
        seen = set()
        for name in row["genres"]:
            clean = (name or "").strip()
            key = clean.casefold()
            if not key or key in seen:
                continue
            seen.add(key)
            display.setdefault(key, clean)
            counts[key] += 1
    ranked = sorted(counts.items(), key=lambda kv: (-kv[1], display[kv[0]].casefold()))
    return [{"name": display[key], "count": count} for key, count in ranked[:limit]]


# ---------- 故事年齡 ----------

def story_age(rows: List[dict], year: int) -> Optional[dict]:
    """故事年齡 = 當年 − 作品平均發行年份；最愛年代 = 出現最多的十年（同數取較近的十年）。"""
    years = [r["year"] for r in rows if r.get("year")]
    if len(years) < 5:
        return None
    avg_year = round(sum(years) / len(years))
    decades = Counter((y // 10) * 10 for y in years)
    favorite = max(decades.items(), key=lambda kv: (kv[1], kv[0]))[0]
    return {"avg_year": avg_year, "age": year - avg_year, "favorite_decade": favorite}
