import pytest
from app.schemas.item import SeasonInfo, StoryCreate, StoryResponse, StoryInstance, ItemDetailResponse
from datetime import datetime
from uuid import uuid4


def test_season_info_requires_number_and_name_but_rest_optional():
    s = SeasonInfo(season_number=4, name="Season 4")
    assert s.season_number == 4
    assert s.name == "Season 4"
    assert s.air_date is None
    assert s.episode_count is None
    assert s.vote_average is None


def test_season_info_accepts_full_fields():
    s = SeasonInfo(season_number=1, name="Season 1", air_date="1999-10-20", episode_count=61, vote_average=8.5)
    assert s.episode_count == 61
    assert s.vote_average == 8.5


def test_story_create_accepts_non_contiguous_seasons():
    story = StoryCreate(
        title="One Piece",
        media_type="tv",
        external_id="37854",
        source="tmdb",
        seasons=[1, 3, 5],
    )
    assert story.seasons == [1, 3, 5]


def test_story_create_seasons_defaults_to_none():
    story = StoryCreate(
        title="Dune",
        media_type="movie",
        external_id="438631",
        source="tmdb",
    )
    assert story.seasons is None


def test_story_response_and_instance_carry_seasons():
    response = StoryResponse(
        id=uuid4(), user_id=uuid4(), title="One Piece", media_type="tv",
        external_id="37854", source="tmdb", created_at=datetime.now(),
        seasons=[4, 5, 6],
    )
    assert response.seasons == [4, 5, 6]

    instance = StoryInstance(id=uuid4(), created_at=datetime.now(), rating=5, seasons=[4, 5, 6])
    assert instance.seasons == [4, 5, 6]


def test_item_detail_response_seasons_defaults_to_empty_list():
    detail = ItemDetailResponse(
        title="One Piece", media_type="tv", external_id="37854",
        source="tmdb", overview="",
    )
    assert detail.seasons == []
