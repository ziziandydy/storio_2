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


# ---------- 月份節奏 ----------

def monthly_counts(rows: List[dict]) -> List[int]:
    """12 個月各收藏幾部（依 effective_date 的月份字串）。"""
    counts = [0] * 12
    for row in rows:
        date = effective_date(row)
        if not date:
            continue
        try:
            month = int(date[5:7])
        except ValueError:
            continue
        if 1 <= month <= 12:
            counts[month - 1] += 1
    return counts


def months_active(counts: List[int]) -> Optional[dict]:
    active = sum(1 for c in counts if c > 0)
    return {"count": active} if active >= 2 else None


def peak_month(counts: List[int]) -> Optional[dict]:
    """最高月份（同分取較早）；最高月不到 2 部不算。"""
    top = max(counts) if counts else 0
    if top < 2:
        return None
    return {"month": counts.index(top) + 1, "count": top}


# ---------- 海報清單 ----------

def _sort_key(row: dict):
    return (effective_date(row) or "", str(row.get("created_at") or ""))


def recent_posters(rows: List[dict], limit: int = 6) -> List[str]:
    """場景背景用海報：只取有 poster_path 者，由近到遠，不重複，最多 limit 個；沒有就回 []。"""
    posters: List[str] = []
    for row in sorted(rows, key=_sort_key, reverse=True):
        path = row.get("poster_path")
        if path and path not in posters:
            posters.append(path)
            if len(posters) >= limit:
                break
    return posters


def rows_in_month(rows: List[dict], month: int) -> List[dict]:
    """effective_date 落在指定月份（1–12）的列。"""
    selected = []
    for row in rows:
        date = effective_date(row)
        if date and date[5:7].isdigit() and int(date[5:7]) == month:
            selected.append(row)
    return selected


# ---------- 年度之最 ----------


def top_rated(rows: List[dict]) -> Optional[dict]:
    """最高評分（評分 0 表未評分，不參與）；顯示最多 3 筆，取最近收藏者。"""
    rated = [r for r in rows if (r.get("rating") or 0) > 0]
    if not rated:
        return None
    best = max(r["rating"] for r in rated)
    winners = sorted((r for r in rated if r["rating"] == best), key=_sort_key, reverse=True)
    return {
        "rating": best,
        "count": len(winners),
        "items": [{"title": r.get("title"), "poster_path": r.get("poster_path")} for r in winners[:3]],
    }


# ---------- 開始與結束 ----------

def first_last(rows: List[dict]) -> Optional[dict]:
    if len(rows) < 2:
        return None
    ordered = sorted(rows, key=_sort_key)

    def item(row: dict) -> dict:
        return {"title": row.get("title"), "poster_path": row.get("poster_path"), "date": effective_date(row)}

    return {"first": item(ordered[0]), "last": item(ordered[-1])}


# ---------- 心得 ----------

REFLECTION_MAX_CHARS = 40
REFLECTION_MAX_CANDIDATES = 10


def pick_reflection(rows: List[dict]) -> Optional[dict]:
    """有心得（去除空白後非空）才出現。候選排序：評分高 → 心得長 → 較近收藏。"""
    with_notes = [r for r in rows if (r.get("notes") or "").strip()]
    if not with_notes:
        return None
    ordered = sorted(
        with_notes,
        key=lambda r: (r.get("rating") or 0, len((r["notes"]).strip()), _sort_key(r)),
        reverse=True,
    )

    def candidate(row: dict) -> dict:
        text = row["notes"].strip()
        if len(text) > REFLECTION_MAX_CHARS:
            text = text[:REFLECTION_MAX_CHARS] + "…"
        return {
            "id": row.get("id"),
            "title": row.get("title"),
            "poster_path": row.get("poster_path"),
            "rating": row.get("rating") or 0,
            "text": text,
        }

    return {
        "count": len(with_notes),
        "candidates": [candidate(r) for r in ordered[:REFLECTION_MAX_CANDIDATES]],
    }
