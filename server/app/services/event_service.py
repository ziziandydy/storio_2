import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from app.repositories.event_repo import EventRepository

logger = logging.getLogger(__name__)


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
    ) -> None:
        row = {
            # day 一律用 UTC 日期
            "day": datetime.now(timezone.utc).date().isoformat(),
            "event": event,
            "platform": platform,
            "user_id": user_id,
            "visitor_id": str(visitor_id) if visitor_id else None,
            "is_suspected_bot": is_suspected_bot,
            "bot_reason": bot_reason,
        }
        self.repo.insert_event(row)

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
