from app.services.recap_access import can_view_recap_year


def test_every_year_is_viewable_for_now():
    assert can_view_recap_year("user-1", 2020) is True
    assert can_view_recap_year("user-1", 2026) is True
