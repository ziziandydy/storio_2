"""
ai_usage_logger 單元測試：驗證 AI API 呼叫量/token 用量記錄的核心邏輯。
"""
import pytest
from unittest.mock import MagicMock, patch

from app.services import ai_usage_logger


def make_mock_supabase():
    """建立一個 mock Supabase client，table().insert().execute() 為 no-op。"""
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table
    mock_table.insert.return_value = mock_table
    mock_table.execute.return_value = MagicMock()
    return mock_client, mock_table


# --- _write_usage_row：實際寫入邏輯 ---

def test_write_usage_row_inserts_expected_payload():
    mock_client, mock_table = make_mock_supabase()
    payload = {
        "endpoint": "reflection_suggestions",
        "provider": "gemini",
        "model": "gemini-2.5-flash",
        "success": True,
        "prompt_tokens": 100,
        "completion_tokens": 20,
        "total_tokens": 120,
        "latency_ms": 350,
        "error": None,
    }

    with patch.object(ai_usage_logger, "get_supabase_client", return_value=mock_client):
        ai_usage_logger._write_usage_row(payload)

    mock_client.table.assert_called_once_with("ai_api_usage")
    mock_table.insert.assert_called_once_with(payload)
    mock_table.execute.assert_called_once()


def test_write_usage_row_swallows_supabase_errors():
    mock_client, mock_table = make_mock_supabase()
    mock_table.execute.side_effect = Exception("network down")

    with patch.object(ai_usage_logger, "get_supabase_client", return_value=mock_client):
        # 不應該拋出例外——寫入失敗不能影響呼叫端的 AI 結果
        ai_usage_logger._write_usage_row(payload={"endpoint": "x", "provider": "gemini", "model": "m", "success": True})


# --- log_ai_usage：payload 組裝 + 排程行為 ---

def test_log_ai_usage_builds_correct_payload_and_writes_synchronously_without_running_loop():
    """測試環境沒有 running event loop 時，退回同步寫入（不需要背景執行緒）。"""
    mock_client, mock_table = make_mock_supabase()

    with patch.object(ai_usage_logger, "get_supabase_client", return_value=mock_client):
        ai_usage_logger.log_ai_usage(
            endpoint="reflection_refine",
            provider="openai",
            model="gpt-4o-mini",
            success=False,
            error="timeout after 10s" * 100,  # 超長錯誤訊息應被截斷
            latency_ms=999,
        )

    mock_table.insert.assert_called_once()
    payload = mock_table.insert.call_args[0][0]
    assert payload["endpoint"] == "reflection_refine"
    assert payload["provider"] == "openai"
    assert payload["model"] == "gpt-4o-mini"
    assert payload["success"] is False
    assert payload["prompt_tokens"] is None
    assert payload["completion_tokens"] is None
    assert payload["total_tokens"] is None
    assert payload["latency_ms"] == 999
    assert len(payload["error"]) <= 500


@pytest.mark.asyncio
async def test_log_ai_usage_schedules_on_executor_when_loop_running():
    """有 running event loop 時（正常 FastAPI request 情境），改丟到背景執行緒，不阻塞呼叫端。"""
    fake_loop = MagicMock()

    with patch.object(ai_usage_logger.asyncio, "get_running_loop", return_value=fake_loop):
        ai_usage_logger.log_ai_usage(
            endpoint="search_intent",
            provider="gemini",
            model="gemini-2.5-flash",
            success=True,
            prompt_tokens=50,
            completion_tokens=10,
            total_tokens=60,
            latency_ms=210,
        )

    fake_loop.run_in_executor.assert_called_once()
    args = fake_loop.run_in_executor.call_args[0]
    assert args[0] is None
    assert args[1] is ai_usage_logger._write_usage_row
    scheduled_payload = args[2]
    assert scheduled_payload["endpoint"] == "search_intent"
    assert scheduled_payload["total_tokens"] == 60
