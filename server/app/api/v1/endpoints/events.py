from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.api.deps import get_optional_user
from app.core.limiter import limiter
from app.schemas.event import EventCreate
from app.services.event_service import EventService, platform_from_origin

router = APIRouter()


@router.post("", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
def create_event(
    request: Request,
    body: EventCreate,
    user=Depends(get_optional_user),
):
    """
    記錄一筆互動事件。sync endpoint，寫入完成才回應（Railway 上不可 fire-and-forget）。
    有登入：以 user_id 記（忽略 visitor_id）；未登入：只接受帶 visitor_id 的 open。
    """
    service = EventService()
    platform = platform_from_origin(request.headers.get("origin"))

    if user:
        service.record(body.event, platform, user_id=user.id)
    else:
        if body.event != "open":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
        if body.visitor_id is None:
            raise HTTPException(status_code=422, detail="visitor_id required")
        service.record(
            body.event,
            platform,
            user_id=None,
            visitor_id=body.visitor_id,
            is_suspected_bot=body.is_suspected_bot,
            bot_reason=body.bot_reason,
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
