from datetime import date
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.security import HTTPAuthorizationCredentials
from app.schemas.item import StoryCreate, StoryResponse, StoryCheckResponse
from app.core.limiter import limiter
from app.schemas.recap import RecapResponse, RecapYearsResponse
from app.services.collection_service import CollectionService
from app.services.recap_service import NotEnoughStories, RecapForbidden, RecapService
from app.services.event_service import EventService, platform_from_origin
from app.api.deps import get_current_user, security

router = APIRouter()

@router.get("/", response_model=List[StoryResponse])
def read_collection(
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Retrieve the current user's folio collection.
    """
    service = CollectionService(token=credentials.credentials)
    return service.get_my_collection(user.id)

@router.get("/check/{external_id}", response_model=StoryCheckResponse)
def check_story_in_collection(
    external_id: str,
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Check if a story is already in the user's folio.
    """
    service = CollectionService(token=credentials.credentials)
    return service.check_story_status(user.id, external_id)

@router.get("/stats", response_model=dict)
def get_collection_stats(
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Get collection statistics (last 7 days, 30 days, this year).
    """
    service = CollectionService(token=credentials.credentials)
    return service.get_stats(user.id)

@router.get("/stats/monthly", response_model=dict)
def get_monthly_collection_stats(
    month: str,
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Get collection statistics for a specific month (YYYY-MM).
    """
    service = CollectionService(token=credentials.credentials)
    return service.get_monthly_stats(user.id, month)

# 注意：/recap 路由必須宣告在 /{story_id} 之前，否則會被當成 UUID 路徑參數而回 422
@router.get("/recap/years", response_model=RecapYearsResponse)
def get_recap_years(
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    年度 Recap 可看的年份（該年收藏 ≥ 3 部）與各年部數。
    """
    return RecapService(token=credentials.credentials).list_years(user.id)

@router.get("/recap", response_model=RecapResponse)
@limiter.limit("10/minute")  # 可能觸發多筆外部 API 補抓，成本與 /search/ai 同級
async def get_recap(
    request: Request,
    year: int = Query(ge=1970, le=2100),
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    年度 Recap：15 個場景的資料（條件不足的場景為 null）。不足 3 部回 404，無權限回 403。
    """
    service = RecapService(token=credentials.credentials)
    try:
        return await service.build_recap(user.id, year, date.today())
    except NotEnoughStories as e:
        raise HTTPException(
            status_code=404,
            detail={"code": "recap_not_enough", "needed": e.needed, "count": e.count},
        )
    except RecapForbidden:
        raise HTTPException(status_code=403, detail="Recap not available for this year")

@router.get("/{story_id}", response_model=StoryResponse)
def read_collection_item(
    story_id: UUID,
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Get details of a specific collection item.
    """
    service = CollectionService(token=credentials.credentials)
    return service.get_collection_item(user.id, story_id)

@router.post("/", response_model=StoryResponse)
def add_to_collection(
    request: Request,
    story_in: StoryCreate,
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Add a new item to the folio.
    Max 10 items for Guest users.
    """
    service = CollectionService(token=credentials.credentials)
    result = service.add_story(user.id, story_in, is_anonymous=user.is_anonymous)
    # 新增成功後才記錄事件；記錄失敗由 record_safely 吞掉，不影響新增結果
    EventService().record_safely(
        "add_collection",
        platform_from_origin(request.headers.get("origin")),
        user_id=user.id,
    )
    return result

@router.patch("/{story_id}", response_model=StoryResponse)
def update_collection_item(
    story_id: UUID,
    story_update: dict,
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Update a collection item (e.g., rating or notes).
    """
    service = CollectionService(token=credentials.credentials)
    return service.update_collection_item(user.id, story_id, story_update)

@router.delete("/{story_id}")
def remove_from_collection(
    story_id: UUID,
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Remove a story from the folio.
    """
    service = CollectionService(token=credentials.credentials)
    return service.remove_story(user.id, story_id)
