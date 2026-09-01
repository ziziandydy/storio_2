"""
驗證四個真正打 Gemini/OpenAI 的呼叫點（reflection_suggestions、reflection_refine、
search_intent、daily_recommendations）都有正確呼叫 log_ai_usage 記錄用量。

全程 mock google.generativeai / openai SDK，不打真實 API；也順帶驗證
refine_reflection 的 OpenAI fallback 死碼 bug 已修復（Gemini 失敗時真的會呼叫 OpenAI）。
"""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.config import settings
from app.services import ai_recommendation_service, gemini_service, semantic_search_service


def make_gemini_response(text: str, prompt_tokens=10, completion_tokens=5, total_tokens=15):
    resp = MagicMock()
    resp.text = text
    usage = MagicMock()
    usage.prompt_token_count = prompt_tokens
    usage.candidates_token_count = completion_tokens
    usage.total_token_count = total_tokens
    resp.usage_metadata = usage
    return resp


def make_openai_response(content: str, prompt_tokens=8, completion_tokens=4, total_tokens=12):
    resp = MagicMock()
    resp.choices = [MagicMock(message=MagicMock(content=content))]
    usage = MagicMock()
    usage.prompt_tokens = prompt_tokens
    usage.completion_tokens = completion_tokens
    usage.total_tokens = total_tokens
    resp.usage = usage
    return resp


def make_gemini_model_mock(response):
    model = MagicMock()
    model.generate_content_async = AsyncMock(return_value=response)
    return model


# --- reflection_suggestions ---

@pytest.mark.asyncio
async def test_generate_reflection_suggestions_logs_gemini_success():
    response = make_gemini_response(json.dumps(["s1.", "s2.", "s3."]))
    model = make_gemini_model_mock(response)

    with patch.object(settings, "GEMINI_API_KEY", "fake-gemini-key"), \
         patch.object(gemini_service.genai, "configure"), \
         patch.object(gemini_service.genai, "GenerativeModel", return_value=model), \
         patch.object(gemini_service, "log_ai_usage") as mock_log:

        suggestions = await gemini_service.GeminiService.generate_reflection_suggestions("Some Title")

    assert suggestions == ["s1.", "s2.", "s3."]
    mock_log.assert_called_once()
    kwargs = mock_log.call_args.kwargs
    assert kwargs["endpoint"] == "reflection_suggestions"
    assert kwargs["provider"] == "gemini"
    assert kwargs["model"] == "gemini-2.5-flash"
    assert kwargs["success"] is True
    assert kwargs["total_tokens"] == 15


@pytest.mark.asyncio
async def test_generate_reflection_suggestions_falls_back_to_openai_and_logs_both():
    model = MagicMock()
    model.generate_content_async = AsyncMock(side_effect=RuntimeError("gemini down"))
    openai_response = make_openai_response(json.dumps(["a.", "b.", "c."]))
    openai_client = MagicMock()
    openai_client.chat.completions.create = AsyncMock(return_value=openai_response)

    with patch.object(settings, "GEMINI_API_KEY", "fake-gemini-key"), \
         patch.object(settings, "OPENAI_API_KEY", "fake-openai-key"), \
         patch.object(gemini_service.genai, "configure"), \
         patch.object(gemini_service.genai, "GenerativeModel", return_value=model), \
         patch.object(gemini_service, "AsyncOpenAI", return_value=openai_client), \
         patch.object(gemini_service, "log_ai_usage") as mock_log:

        suggestions = await gemini_service.GeminiService.generate_reflection_suggestions("Some Title")

    assert suggestions == ["a.", "b.", "c."]
    assert mock_log.call_count == 2
    gemini_call, openai_call = mock_log.call_args_list
    assert gemini_call.kwargs["provider"] == "gemini"
    assert gemini_call.kwargs["success"] is False
    assert openai_call.kwargs["provider"] == "openai"
    assert openai_call.kwargs["endpoint"] == "reflection_suggestions"
    assert openai_call.kwargs["success"] is True
    assert openai_call.kwargs["total_tokens"] == 12


# --- reflection_refine ---

@pytest.mark.asyncio
async def test_refine_reflection_logs_gemini_success():
    response = make_gemini_response("潤飾後的內容。")
    model = make_gemini_model_mock(response)

    with patch.object(settings, "GEMINI_API_KEY", "fake-gemini-key"), \
         patch.object(gemini_service.genai, "configure"), \
         patch.object(gemini_service.genai, "GenerativeModel", return_value=model), \
         patch.object(gemini_service, "log_ai_usage") as mock_log:

        result = await gemini_service.GeminiService.refine_reflection("原始內容")

    assert result == "潤飾後的內容。"
    mock_log.assert_called_once()
    kwargs = mock_log.call_args.kwargs
    assert kwargs["endpoint"] == "reflection_refine"
    assert kwargs["provider"] == "gemini"
    assert kwargs["success"] is True


@pytest.mark.asyncio
async def test_refine_reflection_falls_back_to_openai_on_gemini_failure_and_logs_both():
    """回歸測試：修復前這裡的 OpenAI fallback 是死碼，永遠不會被呼叫。"""
    model = MagicMock()
    model.generate_content_async = AsyncMock(side_effect=RuntimeError("gemini down"))
    openai_response = make_openai_response("OpenAI 潤飾後的內容。")
    openai_client = MagicMock()
    openai_client.chat.completions.create = AsyncMock(return_value=openai_response)

    with patch.object(settings, "GEMINI_API_KEY", "fake-gemini-key"), \
         patch.object(settings, "OPENAI_API_KEY", "fake-openai-key"), \
         patch.object(gemini_service.genai, "configure"), \
         patch.object(gemini_service.genai, "GenerativeModel", return_value=model), \
         patch.object(gemini_service, "AsyncOpenAI", return_value=openai_client), \
         patch.object(gemini_service, "log_ai_usage") as mock_log:

        result = await gemini_service.GeminiService.refine_reflection("原始內容")

    # 修復前這裡永遠是 "原始內容"（死碼導致 fallback 不生效）
    assert result == "OpenAI 潤飾後的內容。"
    assert mock_log.call_count == 2
    gemini_call, openai_call = mock_log.call_args_list
    assert gemini_call.kwargs["provider"] == "gemini"
    assert gemini_call.kwargs["success"] is False
    assert openai_call.kwargs["provider"] == "openai"
    assert openai_call.kwargs["endpoint"] == "reflection_refine"
    assert openai_call.kwargs["success"] is True


# --- search_intent ---

@pytest.mark.asyncio
async def test_parse_intent_logs_gemini_success():
    intent_json = json.dumps({
        "is_semantic": True,
        "media_type": "movie",
        "confidence": 0.9,
        "fallback_query": "sci-fi",
    })
    response = make_gemini_response(intent_json)
    model = make_gemini_model_mock(response)

    with patch.object(settings, "GEMINI_API_KEY", "fake-gemini-key"), \
         patch.object(semantic_search_service.genai, "configure"), \
         patch.object(semantic_search_service.genai, "GenerativeModel", return_value=model), \
         patch.object(semantic_search_service, "log_ai_usage") as mock_log:

        intent = await semantic_search_service.SemanticSearchService.parse_intent("query", "movie")

    assert intent.media_type == "movie"
    mock_log.assert_called_once()
    kwargs = mock_log.call_args.kwargs
    assert kwargs["endpoint"] == "search_intent"
    assert kwargs["provider"] == "gemini"
    assert kwargs["success"] is True


# --- daily_recommendations ---

@pytest.mark.asyncio
async def test_try_gemini_daily_recommendations_logs_success():
    books_json = json.dumps([{"title": "Book A", "author": "Author A"}])
    response = make_gemini_response(books_json)
    model = make_gemini_model_mock(response)

    with patch.object(settings, "GEMINI_API_KEY", "fake-gemini-key"), \
         patch.object(ai_recommendation_service.genai, "configure"), \
         patch.object(ai_recommendation_service.genai, "GenerativeModel", return_value=model), \
         patch.object(ai_recommendation_service, "log_ai_usage") as mock_log:

        books = await ai_recommendation_service.AIRecommendationService._try_gemini()

    assert books == [{"title": "Book A", "author": "Author A"}]
    mock_log.assert_called_once()
    kwargs = mock_log.call_args.kwargs
    assert kwargs["endpoint"] == "daily_recommendations"
    assert kwargs["provider"] == "gemini"
    assert kwargs["success"] is True
