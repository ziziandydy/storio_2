import pytest
from app.services.semantic_search_service import SemanticSearchService
from app.schemas.search import AISearchIntent
from app.core.config import settings

# Integration test：真實呼叫 Gemini / OpenAI 解析意圖。
# 無 LLM API key 時（如 CI dummy env）跳過，避免走 fallback 導致誤判失敗。
pytestmark = pytest.mark.skipif(
    not settings.GEMINI_API_KEY and not settings.OPENAI_API_KEY,
    reason="需要 LLM API key（GEMINI/OPENAI），CI 無 key 時跳過 integration test",
)

@pytest.mark.asyncio
async def test_parse_intent_semantic():
    # Test a clearly semantic query (Plot description)
    query = "推薦一部關於在沙漠星際中冒險的科幻電影"
    intent = await SemanticSearchService.parse_intent(query, "movie")
    
    assert intent.is_semantic is True
    assert intent.media_type == "movie"
    assert intent.tmdb_params is not None
    # TMDB genre ID for Sci-Fi is 87, Adventure is 12
    # Gemini should ideally find these keywords or genres
    assert intent.confidence > 0.5

@pytest.mark.asyncio
async def test_parse_intent_keyword():
    # Test a clear keyword query
    query = "沙丘"
    intent = await SemanticSearchService.parse_intent(query, "movie")
    
    # Even if it marks it as semantic, the fallback_query should be the title
    assert intent.fallback_query == "沙丘"
