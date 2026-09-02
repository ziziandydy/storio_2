import asyncio
import logging
from typing import Optional

from app.core.supabase import get_supabase_client

logger = logging.getLogger(__name__)

_ERROR_MAX_LEN = 500


def _write_usage_row(payload: dict) -> None:
    try:
        supabase = get_supabase_client()
        supabase.table("ai_api_usage").insert(payload).execute()
    except Exception as e:
        logger.error(
            "Failed to log AI usage (endpoint=%s, provider=%s): %s",
            payload.get("endpoint"), payload.get("provider"), e,
        )


async def log_ai_usage(
    endpoint: str,
    provider: str,
    model: str,
    success: bool,
    *,
    prompt_tokens: Optional[int] = None,
    completion_tokens: Optional[int] = None,
    total_tokens: Optional[int] = None,
    latency_ms: Optional[int] = None,
    error: Optional[str] = None,
) -> None:
    """
    記錄一次真正打出去的 AI API 呼叫（不含快取命中），供之後估算成本用。

    寫入丟到背景執行緒跑（不佔用 event loop），但會 await 直到寫入完成才返回——
    比照這個 codebase 其他 DB cache 寫入的既有寫法（trending_service.py、
    ai_recommendation_service.py 的 _persist_daily_rec 皆是 await run_in_executor）。
    曾經改成不 await 的「真·fire-and-forget」版本，結果在 Railway 上這個背景執行緒
    會在 request/response 週期結束後就被中斷、寫入從未真正完成過（正式環境
    ai_api_usage 表永遠是空的）。寫入失敗（含真的丟例外）只記 log，不拋出例外、
    不影響原本的 AI 呼叫結果。
    """
    payload = {
        "endpoint": endpoint,
        "provider": provider,
        "model": model,
        "success": success,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": total_tokens,
        "latency_ms": latency_ms,
        "error": error[:_ERROR_MAX_LEN] if error else None,
    }

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        # 沒有 running loop（例如純同步呼叫或測試環境）：直接同步寫入
        _write_usage_row(payload)
        return

    await loop.run_in_executor(None, _write_usage_row, payload)
