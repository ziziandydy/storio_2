from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

# 前端可上報的事件（不含 add_collection，送了即 422；add_collection 只由後端在收藏成功時自己記）
ApiEvent = Literal["open", "browse", "detail_view", "search", "share", "recap_opened", "recap_shared"]

# 年度 Recap 事件：必須帶年份；recap_shared 另需場景數（見 migration 010）
RECAP_EVENTS = ("recap_opened", "recap_shared")


class EventCreate(BaseModel):
    event: ApiEvent
    visitor_id: Optional[UUID] = None
    is_suspected_bot: bool = False
    bot_reason: Optional[Literal["user_agent", "webdriver"]] = None
    year: Optional[int] = Field(None, ge=1970, le=2100)
    scene_count: Optional[int] = Field(None, ge=1, le=15)
