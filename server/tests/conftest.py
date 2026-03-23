"""
Pytest 共用 fixtures。
"""
import pytest


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """每次測試前重置 slowapi 計數，避免跨測試狀態污染。"""
    from app.core.limiter import limiter
    limiter._limiter.storage.reset()
    yield
    limiter._limiter.storage.reset()
