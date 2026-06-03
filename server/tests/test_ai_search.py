import pytest
from app.services.semantic_search_service import SemanticSearchService
from app.schemas.search import AISearchIntent

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
