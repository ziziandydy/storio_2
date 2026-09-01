import logging
import google.generativeai as genai
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.supabase import get_supabase_client
from app.services.ai_usage_logger import log_ai_usage
import json

logger = logging.getLogger(__name__)
import datetime
import asyncio
import time
from typing import List, Dict

REGION_MARKET_MAP: Dict[str, str] = {
    "TW": "Taiwan",
    "HK": "Hong Kong",
    "MO": "Macao",
    "CN": "China (Mainland)",
    "SG": "Singapore",
    "MY": "Malaysia",
    "JP": "Japan",
    "KR": "South Korea",
    "US": "United States",
    "CA": "Canada",
    "GB": "United Kingdom",
    "AU": "Australia",
    "NZ": "New Zealand",
    "FR": "France",
    "DE": "Germany",
    "ES": "Spain",
    "IT": "Italy",
    "BR": "Brazil",
    "IN": "India",
    "PH": "Philippines",
}

class AIRecommendationService:
    _cache: List[Dict[str, str]] = []
    _last_update: datetime.date = None

    @classmethod
    async def get_daily_book_recommendations(cls, language: str = "zh-TW", region: str = "TW") -> List[Dict[str, str]]:
        today = datetime.date.today()
        loop = asyncio.get_running_loop()

        cache_id = f"{today}_{language}_{region}"

        # L1 Cache: Memory
        if cls._cache and cls._last_update == cache_id:
            logger.debug("Returning L1 cached recommendations for %s", cache_id)
            return cls._cache

        # L2 Cache: Database (Supabase)
        def _fetch_daily_rec():
            try:
                supabase = get_supabase_client()
                response = supabase.table("daily_recommendations").select("books").eq("date", cache_id).execute()
                if response.data and len(response.data) > 0:
                    return response.data[0]["books"]
                return None
            except Exception as e:
                logger.error("DB cache read failed for recommendations: %s", e)
                return None

        db_books = await loop.run_in_executor(None, _fetch_daily_rec)
        if db_books:
            cls._cache = db_books
            cls._last_update = cache_id
            return db_books

        # Cache Miss: Fetch from AI
        logger.debug("Cache miss, fetching recommendations from Gemini for %s", cache_id)
        result = await cls._try_gemini(language, region)
        if not result:
            result = await cls._try_openai(language, region)

        if result:
            cls._cache = result
            cls._last_update = cache_id

            def _persist_daily_rec():
                try:
                    supabase = get_supabase_client()
                    data = { "date": cache_id, "books": result }
                    supabase.table("daily_recommendations").insert(data).execute()
                except Exception as e:
                    logger.error("DB cache write failed for recommendations: %s", e)

            await loop.run_in_executor(None, _persist_daily_rec)
            return result

        return []

    @classmethod
    async def _try_gemini(cls, language: str = "zh-TW", region: str = "TW") -> List[Dict[str, str]]:
        if not settings.GEMINI_API_KEY:
            return []

        start = time.monotonic()
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-2.5-flash')

            lang_name = "Traditional Chinese (繁體中文)" if language == "zh-TW" else "English"
            market = REGION_MARKET_MAP.get(region, region)

            prompt = f"""
            Recommend 30 books suitable for a "Daily Recommendation" to the general public.
            Language: {lang_name}.
            Market: Popular in {market} market.
            Categories: Contemporary literature, classics, self-help, business, sci-fi, etc.

            Output strictly as a JSON Array of objects:
            [{{"title": "Book Title", "author": "Author Name"}}, ...]
            No markdown tags, no extra text.
            """

            response = await asyncio.wait_for(
                model.generate_content_async(prompt),
                timeout=25.0
            )
            usage = getattr(response, "usage_metadata", None)
            log_ai_usage(
                endpoint="daily_recommendations", provider="gemini", model="gemini-2.5-flash", success=True,
                prompt_tokens=getattr(usage, "prompt_token_count", None),
                completion_tokens=getattr(usage, "candidates_token_count", None),
                total_tokens=getattr(usage, "total_token_count", None),
                latency_ms=int((time.monotonic() - start) * 1000),
            )

            text = response.text.replace("```json", "").replace("```", "").strip()
            if "[" in text and "]" in text:
                text = text[text.find("["):text.rfind("]")+1]

            books = json.loads(text)
            return books[:30]

        except Exception as e:
            log_ai_usage(
                endpoint="daily_recommendations", provider="gemini", model="gemini-2.5-flash", success=False,
                latency_ms=int((time.monotonic() - start) * 1000), error=str(e),
            )
            logger.error("Gemini recommendation fetch failed: %s", e)
            return []

    @classmethod
    async def _try_openai(cls, language: str = "zh-TW", region: str = "TW") -> List[Dict[str, str]]:
        if not settings.OPENAI_API_KEY:
            return []

        start = time.monotonic()
        try:
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            lang_name = "Traditional Chinese (繁體中文)" if language == "zh-TW" else "English"
            market = REGION_MARKET_MAP.get(region, region)

            prompt = f"Recommend 30 trending books in {lang_name} popular in {market}. Return JSON Array only: [{{'title': '...', 'author': '...'}}]"

            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a helpful librarian. Output JSON only."},
                        {"role": "user", "content": prompt}
                    ]
                ),
                timeout=25.0
            )
            usage = response.usage
            log_ai_usage(
                endpoint="daily_recommendations", provider="openai", model="gpt-4o-mini", success=True,
                prompt_tokens=usage.prompt_tokens if usage else None,
                completion_tokens=usage.completion_tokens if usage else None,
                total_tokens=usage.total_tokens if usage else None,
                latency_ms=int((time.monotonic() - start) * 1000),
            )

            content = response.choices[0].message.content
            text = content.replace("```json", "").replace("```", "").strip()
            if "[" in text and "]" in text:
                text = text[text.find("["):text.rfind("]")+1]
            return json.loads(text)[:30]
        except Exception as e:
            log_ai_usage(
                endpoint="daily_recommendations", provider="openai", model="gpt-4o-mini", success=False,
                latency_ms=int((time.monotonic() - start) * 1000), error=str(e),
            )
            logger.error("OpenAI recommendation fetch failed: %s", e)
            return []
