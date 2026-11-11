"""年度 Recap：讀取收藏列 → 補抓缺資料 → 計算各場景。統計規則在 recap_stats／recap_titles。"""
import asyncio
from collections import Counter
from datetime import date
from typing import Awaitable, Callable, List, Optional

import httpx

from app.repositories.collection_repo import CollectionRepository
from app.schemas.recap import RecapResponse
from app.services import recap_stats as stats
from app.services.recap_access import can_view_recap_year
from app.services.recap_backfill import (
    DEFAULT_BUDGET_SECONDS,
    DEFAULT_CONCURRENCY,
    backfill_rows,
    extract_metadata,
)
from app.services.recap_titles import select_title
from app.services.search_service import SearchService

METADATA_LANGUAGE = "en-US"  # genres 一律存英文名


class NotEnoughStories(Exception):
    def __init__(self, needed: int, count: int):
        super().__init__(f"need {needed} more stories (have {count})")
        self.needed = needed
        self.count = count


class RecapForbidden(Exception):
    pass


Fetch = Callable[[dict], Awaitable[Optional[dict]]]


class RecapService:
    def __init__(self, token: str = None):
        self.repo = CollectionRepository(token=token)

    async def build_recap(
        self,
        user_id: str,
        year: int,
        today: date,
        fetch: Optional[Fetch] = None,
        budget_seconds: float = DEFAULT_BUDGET_SECONDS,
    ) -> RecapResponse:
        if not can_view_recap_year(user_id, year):
            raise RecapForbidden()

        # 同步 supabase 呼叫不可直接在 event loop 上跑（單 worker 會卡住所有請求）
        loop = asyncio.get_running_loop()
        all_rows = await loop.run_in_executor(None, self.repo.get_recap_rows, user_id)
        rows = stats.rows_in_year(all_rows, year)
        if len(rows) < stats.RECAP_THRESHOLD:
            raise NotEnoughStories(needed=stats.RECAP_THRESHOLD - len(rows), count=len(rows))

        pending = await self._backfill(user_id, rows, fetch, budget_seconds)
        return self._compose(rows, year, today, pending)

    def list_years(self, user_id: str) -> dict:
        counts = Counter(y for y in (stats.year_of(r) for r in self.repo.get_recap_rows(user_id)) if y)
        years = [
            {"year": y, "count": c}
            for y, c in sorted(counts.items(), reverse=True)
            if c >= stats.RECAP_THRESHOLD and can_view_recap_year(user_id, y)
        ]
        return {"threshold": stats.RECAP_THRESHOLD, "years": years}

    # ---------- 內部 ----------

    async def _backfill(self, user_id: str, rows: List[dict], fetch: Optional[Fetch], budget_seconds: float) -> int:
        loop = asyncio.get_running_loop()

        async def save(row_id: str, fields: dict) -> None:
            # 同步 supabase 呼叫放進 executor 並 await（不可 fire-and-forget）
            await loop.run_in_executor(None, self.repo.update_recap_metadata, user_id, row_id, fields)

        if fetch is not None:
            return await backfill_rows(rows, fetch, save, DEFAULT_CONCURRENCY, budget_seconds)

        async with httpx.AsyncClient(timeout=10.0) as client:
            async def default_fetch(row: dict) -> Optional[dict]:
                details = await SearchService.get_item_details(
                    client, row["media_type"], row["external_id"], METADATA_LANGUAGE
                )
                return extract_metadata(details, row) if details else None

            return await backfill_rows(rows, default_fetch, save, DEFAULT_CONCURRENCY, budget_seconds)

    @staticmethod
    def _compose(rows: List[dict], year: int, today: date, pending: int) -> RecapResponse:
        def of_type(media_type: str) -> List[dict]:
            return [r for r in rows if r.get("media_type") == media_type]

        movies, series, books = of_type("movie"), of_type("tv"), of_type("book")
        counts = stats.monthly_counts(rows)
        active = stats.months_active(counts)
        genres = stats.top_genres(rows)

        return RecapResponse(
            year=year,
            is_partial=year == today.year,
            total_count=len(rows),
            metadata_pending=pending,
            opening={"year": year},
            total=stats.time_summary(rows),
            movies=stats.time_summary(movies) if movies else None,
            series=(
                {**stats.time_summary(series), "episodes": sum(r.get("episode_total") or 0 for r in series)}
                if series else None
            ),
            books=(
                {**stats.time_summary(books), "pages": sum(r.get("page_count") or 0 for r in books)}
                if books else None
            ),
            genres={"top": genres} if genres else None,
            story_age=stats.story_age(rows, year),
            title=select_title(rows, year),
            monthly={"counts": counts} if active else None,
            peak_month=stats.peak_month(counts),
            months_active=active,
            top_rated=stats.top_rated(rows),
            first_last=stats.first_last(rows),
            reflection=stats.pick_reflection(rows),
            closing={},
        )
