"""年度 Recap 舊收藏補抓：找出缺作品資料的列，向 TMDB／Google Books 取詳情並寫回。

- 同一作品（含季數）只向外部取一次，結果套用到組內每一列。
- 有限並行、整體時間預算；失敗視為無資料（下次請求再試）。
- 寫入一律 await（Railway 上 fire-and-forget 會在請求結束後被中斷）。
"""
import asyncio
import logging
import re
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple

from app.schemas.item import ItemDetailResponse

logger = logging.getLogger(__name__)

DEFAULT_CONCURRENCY = 5
DEFAULT_BUDGET_SECONDS = 8.0

_GENERIC_TOP_LEVEL = {"fiction", "nonfiction", "non-fiction"}


def normalize_book_category(path: str) -> Optional[str]:
    """Google Books 類別是階層路徑（Fiction / Mystery & Detective / General）。
    取最後一個不是 General 的段落；只剩泛稱的 Fiction／Nonfiction 時回 None（沒有資訊量）。"""
    parts = [p.strip() for p in (path or "").split(" / ") if p.strip()]
    parts = [p for p in parts if p.casefold() != "general"]
    if not parts:
        return None
    leaf = parts[-1]
    if leaf.casefold() in _GENERIC_TOP_LEVEL:
        return None
    return leaf


def needs_backfill(row: dict) -> bool:
    media_type = row.get("media_type")
    if media_type == "book":
        # 類別可能被正規化濾空，不可據此重複補抓
        return row.get("page_count") is None
    if not row.get("genres") or row.get("runtime_minutes") is None:
        return True
    return media_type == "tv" and row.get("episode_total") is None


def extract_metadata(details: ItemDetailResponse, row: dict) -> dict:
    """從詳情抽出可寫回的欄位；只回傳取得到的鍵。"""
    result: Dict[str, Any] = {}
    media_type = row.get("media_type")

    if media_type == "book":
        if details.page_count:
            result["page_count"] = details.page_count
        genres: List[str] = []
        for path in details.genres or []:
            name = normalize_book_category(path)
            if name and name not in genres:
                genres.append(name)
        if genres:
            result["genres"] = genres
        return result

    match = re.search(r"(\d+)\s*m", details.runtime or "")
    if match:
        result["runtime_minutes"] = int(match.group(1))
    if details.genres:
        result["genres"] = list(details.genres)

    if media_type == "tv":
        selected = row.get("seasons")
        counts = [
            s.episode_count
            for s in details.seasons
            if not selected or s.season_number in selected
        ]
        if counts and all(c is not None for c in counts):
            result["episode_total"] = sum(counts)
    return result


def _group_key(row: dict) -> Tuple:
    seasons = tuple(row.get("seasons") or []) if row.get("media_type") == "tv" else ()
    return (row.get("media_type"), row.get("external_id"), seasons)


async def backfill_rows(
    rows: List[dict],
    fetch: Callable[[dict], Awaitable[Optional[dict]]],
    save: Callable[[str, dict], Awaitable[None]],
    concurrency: int = DEFAULT_CONCURRENCY,
    budget_seconds: float = DEFAULT_BUDGET_SECONDS,
) -> int:
    """補抓缺資料的列並就地更新；回傳「超過預算而尚未完成」的列數（失敗不計入）。

    fetch(row) 回傳要寫的欄位 dict（None 或例外 = 無資料）；save(row_id, fields) 寫回 DB。
    已有值的欄位不覆蓋。
    """
    groups: Dict[Tuple, List[dict]] = {}
    for row in rows:
        if needs_backfill(row):
            groups.setdefault(_group_key(row), []).append(row)
    if not groups:
        return 0

    semaphore = asyncio.Semaphore(concurrency)

    async def work(members: List[dict]) -> None:
        async with semaphore:
            try:
                fetched = await fetch(members[0])
            except Exception:
                return  # 失敗視為無資料
            if not fetched:
                return
            for row in members:
                applied = {k: v for k, v in fetched.items() if not row.get(k)}
                if not applied:
                    continue
                row.update(applied)  # 即使寫回失敗，本次統計仍用取到的資料
                try:
                    await save(row["id"], applied)
                except Exception as e:
                    logger.warning("補抓寫回失敗（row %s）：%s", row.get("id"), e)

    tasks = {asyncio.ensure_future(work(members)): members for members in groups.values()}
    _, pending = await asyncio.wait(tasks.keys(), timeout=budget_seconds)
    pending_rows = 0
    for task in pending:
        task.cancel()
        pending_rows += len(tasks[task])
    if pending:
        await asyncio.gather(*pending, return_exceptions=True)
    return pending_rows
