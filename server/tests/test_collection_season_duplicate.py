"""分季收藏的重複判斷：同一部影集只有「季數重疊」才算重複。

Regression: production 上已收藏摩登家庭第 5 季，再收藏第 6 季時，後端只比對 external_id 就回 409，
前端因此先跳「已收藏過」警告、儲存失敗並退回選季畫面，要走第二次流程才存得進去。
"""
from datetime import datetime
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.schemas.item import StoryCreate, StoryResponse
from app.services.collection_service import CollectionService


@pytest.fixture
def mock_repo():
    with patch("app.services.collection_service.CollectionRepository") as MockRepo:
        yield MockRepo.return_value


@pytest.fixture
def service(mock_repo):
    return CollectionService()


def story(media_type="tv", seasons=None, force_add=False):
    return StoryCreate(
        title="Modern Family",
        media_type=media_type,
        external_id="1421",
        source="tmdb",
        seasons=seasons,
        force_add=force_add,
    )


def arrange(mock_repo, instances):
    """該用戶已有這部作品的若干筆收藏，instances 為各筆的 seasons（None = 舊的整部影集收藏）。"""
    mock_repo.check_duplicate.return_value = bool(instances)
    mock_repo.get_instances_by_external_id.return_value = [
        {"id": str(uuid4()), "seasons": s} for s in instances
    ]
    mock_repo.count_user_stories.return_value = 3
    mock_repo.create_story.side_effect = lambda user_id, s: StoryResponse(
        id=uuid4(), user_id=uuid4(), created_at=datetime.utcnow(),
        **s.model_dump(exclude={"created_at", "force_add"}),
    )


def test_new_season_of_collected_show_saves_without_conflict(service, mock_repo):
    arrange(mock_repo, [[5]])
    result = service.add_story(str(uuid4()), story(seasons=[6]))
    assert result.seasons == [6]
    mock_repo.create_story.assert_called_once()


def test_overlapping_season_is_a_conflict(service, mock_repo):
    arrange(mock_repo, [[5]])
    with pytest.raises(HTTPException) as exc:
        service.add_story(str(uuid4()), story(seasons=[5]))
    assert exc.value.status_code == 409
    mock_repo.create_story.assert_not_called()


def test_partial_overlap_is_a_conflict(service, mock_repo):
    arrange(mock_repo, [[5]])
    with pytest.raises(HTTPException) as exc:
        service.add_story(str(uuid4()), story(seasons=[5, 6]))
    assert exc.value.status_code == 409


def test_seasons_spread_over_several_records(service, mock_repo):
    arrange(mock_repo, [[5], [7]])
    service.add_story(str(uuid4()), story(seasons=[6]))
    mock_repo.create_story.assert_called_once()
    mock_repo.create_story.reset_mock()
    with pytest.raises(HTTPException):
        service.add_story(str(uuid4()), story(seasons=[7]))


def test_legacy_whole_show_record_covers_every_season(service, mock_repo):
    # 沒記季數的舊收藏代表整部影集，視為涵蓋所有季
    arrange(mock_repo, [None])
    with pytest.raises(HTTPException) as exc:
        service.add_story(str(uuid4()), story(seasons=[6]))
    assert exc.value.status_code == 409


def test_tv_without_seasons_keeps_old_behaviour(service, mock_repo):
    arrange(mock_repo, [[5]])
    with pytest.raises(HTTPException) as exc:
        service.add_story(str(uuid4()), story(seasons=None))
    assert exc.value.status_code == 409


def test_movie_duplicate_is_still_a_conflict(service, mock_repo):
    arrange(mock_repo, [None])
    with pytest.raises(HTTPException) as exc:
        service.add_story(str(uuid4()), story(media_type="movie"))
    assert exc.value.status_code == 409


def test_force_add_skips_the_check(service, mock_repo):
    arrange(mock_repo, [[5]])
    service.add_story(str(uuid4()), story(seasons=[5], force_add=True))
    mock_repo.create_story.assert_called_once()


def test_first_collection_of_a_show_saves(service, mock_repo):
    arrange(mock_repo, [])
    service.add_story(str(uuid4()), story(seasons=[1]))
    mock_repo.create_story.assert_called_once()
