from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel

# DB 允許的全部事件；add_collection 只由後端在收藏成功時自己記
EngagementEvent = Literal["open", "browse", "detail_view", "search", "add_collection", "share"]
# 前端可上報的事件（不含 add_collection，送了即 422）
ApiEvent = Literal["open", "browse", "detail_view", "search", "share"]


class EventCreate(BaseModel):
    event: ApiEvent
    visitor_id: Optional[UUID] = None
    is_suspected_bot: bool = False
    bot_reason: Optional[Literal["user_agent", "webdriver"]] = None
