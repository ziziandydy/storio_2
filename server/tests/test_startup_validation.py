"""
REL-1：FastAPI lifespan startup 應驗證必要 env var，
缺少時立即 raise RuntimeError，不讓服務靜默啟動。
"""
import pytest
from unittest.mock import patch


def test_startup_raises_when_supabase_url_missing():
    """SUPABASE_URL 缺失時，lifespan startup 應拋出 RuntimeError"""
    from app.core.config import Settings

    incomplete_settings = Settings(
        SUPABASE_URL=None,
        SUPABASE_ANON_KEY="fake-key",
        TMDB_API_KEY="fake-tmdb",
    )

    with patch("app.main.settings", incomplete_settings):
        from app.main import validate_required_env_vars
        with pytest.raises(RuntimeError, match="SUPABASE_URL"):
            validate_required_env_vars(incomplete_settings)


def test_startup_raises_when_supabase_anon_key_missing():
    """SUPABASE_ANON_KEY 缺失時，lifespan startup 應拋出 RuntimeError"""
    from app.core.config import Settings

    incomplete_settings = Settings(
        SUPABASE_URL="https://fake.supabase.co",
        SUPABASE_ANON_KEY=None,
        TMDB_API_KEY="fake-tmdb",
    )

    with patch("app.main.settings", incomplete_settings):
        from app.main import validate_required_env_vars
        with pytest.raises(RuntimeError, match="SUPABASE_ANON_KEY"):
            validate_required_env_vars(incomplete_settings)


def test_startup_raises_when_tmdb_key_missing():
    """TMDB_API_KEY 缺失時，lifespan startup 應拋出 RuntimeError"""
    from app.core.config import Settings

    incomplete_settings = Settings(
        SUPABASE_URL="https://fake.supabase.co",
        SUPABASE_ANON_KEY="fake-key",
        TMDB_API_KEY=None,
    )

    with patch("app.main.settings", incomplete_settings):
        from app.main import validate_required_env_vars
        with pytest.raises(RuntimeError, match="TMDB_API_KEY"):
            validate_required_env_vars(incomplete_settings)


def test_startup_passes_when_all_required_vars_present():
    """所有必要 env var 都設定時，不應拋出任何錯誤"""
    from app.core.config import Settings
    from app.main import validate_required_env_vars

    complete_settings = Settings(
        SUPABASE_URL="https://fake.supabase.co",
        SUPABASE_ANON_KEY="fake-key",
        TMDB_API_KEY="fake-tmdb",
    )

    # 不應拋出例外
    validate_required_env_vars(complete_settings)
