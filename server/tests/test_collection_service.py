import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4
from datetime import datetime, timezone

from app.services.collection_service import CollectionService
from app.schemas.item import StoryResponse


@pytest.fixture
def mock_repo():
    with patch("app.services.collection_service.CollectionRepository") as MockRepoClass:
        mock_repo_instance = MagicMock()
        MockRepoClass.return_value = mock_repo_instance
        yield mock_repo_instance


def test_get_collection_item_related_instances_carry_seasons(mock_repo):
    """回歸測試：get_collection_item 組出的 related_instances 必須帶 seasons，
    否則詳情頁 Memory Timeline 的季數 pills 會全部 fallback 顯示「第 N 次」
    （分季收藏功能上線時抓到的真實 bug：StoryInstance() 建構時漏帶 seasons 參數）。
    """
    user_id = str(uuid4())
    story_id = uuid4()
    other_id = uuid4()

    mock_story = StoryResponse(
        id=story_id, user_id=user_id, title="One Piece", media_type="tv",
        external_id="37854", source="tmdb", created_at=datetime.now(timezone.utc),
        rating=6, seasons=[4, 5, 6],
    )
    mock_repo.get_story.return_value = mock_story

    mock_repo.get_instances_by_external_id.return_value = [
        {
            "id": str(other_id),
            "created_at": "2026-07-15T00:00:00+00:00",
            "rating": 5,
            "notes": "S1-S3",
            "seasons": [1, 2, 3],
        },
        {
            "id": str(story_id),
            "created_at": "2026-08-01T00:00:00+00:00",
            "rating": 6,
            "notes": "S4-S6",
            "seasons": [4, 5, 6],
        },
    ]

    service = CollectionService()
    result = service.get_collection_item(user_id, story_id)

    assert len(result.related_instances) == 2
    seasons_by_id = {str(inst.id): inst.seasons for inst in result.related_instances}
    assert seasons_by_id[str(other_id)] == [1, 2, 3]
    assert seasons_by_id[str(story_id)] == [4, 5, 6]
