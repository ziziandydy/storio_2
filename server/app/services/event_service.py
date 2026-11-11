import logging
import time
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from app.repositories.event_repo import EventRepository

logger = logging.getLogger(__name__)

# 未登入（只有訪客代號）的事件，每個 UTC 日最多存這麼多列；超過就靜默丟棄。
# 報表只算帳號，這只是擋住灌列造成的儲存成長。
VISITOR_DAILY_CAP = 5000
# 「還沒滿」的結果快取秒數，避免每個請求都多一次 count 查詢（每個 worker 各自快取）
_CAP_RECHECK_SECONDS = 60
_cap_state = {"day": None, "full": False, "checked": 0.0}


def platform_from_origin(origin: Optional[str]) -> str:
    """由 Origin header 判斷平台；前端自報的平台一律不採信。"""
    if origin == "capacitor://localhost":
        return "ios"
    if origin == "https://localhost":
        return "android"
    return "web"


class EventService:
    def __init__(self, repo: Optional[EventRepository] = None):
        self.repo = repo or EventRepository()

    def record(
        self,
        event: str,
        platform: str,
        *,
        user_id: Optional[str],
        visitor_id: Optional[UUID] = None,
        is_suspected_bot: bool = False,
        bot_reason: Optional[str] = None,
        year: Optional[int] = None,
        scene_count: Optional[int] = None,
    ) -> None:
        day = datetime.now(timezone.utc).date().isoformat()
        if user_id is None and self._visitor_cap_reached(day):
            return
        row = {
            # day 一律用 UTC 日期
            "day": day,
            "event": event,
            "platform": platform,
            "user_id": user_id,
            "visitor_id": str(visitor_id) if visitor_id else None,
            "is_suspected_bot": is_suspected_bot,
            "bot_reason": bot_reason,
        }
        # Recap 事件的年份與場景數：有值才送，讓後端可先於 migration 010 部署（既有事件的列不變）
        if year is not None:
            row["year"] = year
        if scene_count is not None:
            row["scene_count"] = scene_count
        self.repo.insert_event(row)

    def _visitor_cap_reached(self, day: str) -> bool:
        """今日訪客列數是否已達上限。查詢失敗一律放行（不讓計數問題擋住記錄）。"""
        if _cap_state["day"] == day:
            if _cap_state["full"]:
                return True
            if time.monotonic() - _cap_state["checked"] < _CAP_RECHECK_SECONDS:
                return False
        try:
            full = self.repo.count_visitor_events(day) >= VISITOR_DAILY_CAP
        except Exception as e:
            logger.error("Failed to count visitor events: %s", e)
            return False
        _cap_state.update(day=day, full=full, checked=time.monotonic())
        return full

    def record_safely(
        self,
        event: str,
        platform: str,
        *,
        user_id: Optional[str],
        visitor_id: Optional[UUID] = None,
        is_suspected_bot: bool = False,
        bot_reason: Optional[str] = None,
    ) -> None:
        """同 record，但吞掉例外只記 log（供不能被事件記錄影響的主流程使用）。"""
        try:
            self.record(
                event,
                platform,
                user_id=user_id,
                visitor_id=visitor_id,
                is_suspected_bot=is_suspected_bot,
                bot_reason=bot_reason,
            )
        except Exception as e:
            logger.error("Failed to record engagement event (event=%s): %s", event, e)
