import logging
import google.generativeai as genai
from openai import AsyncOpenAI
from app.core.config import settings
from app.services.ai_usage_logger import log_ai_usage
from app.services.reflection_suggestion_prompt import pick_angles, build_suggestion_prompt, filter_suggestions
import json

logger = logging.getLogger(__name__)

# 心得建議／潤飾：短輸出、不需要深度推理，用 Flash-Lite（實測 ~1s、約 2.5 Flash 的十分之一成本）。
FAST_MODEL = "gemini-3.1-flash-lite"
FALLBACK_MODEL = "gemini-2.5-flash"
import datetime
import asyncio
import re
import time
from typing import List, Dict, Optional

class GeminiService:
    _cache: List[Dict[str, str]] = []
    _last_update: datetime.date = None

    @classmethod
    def configure(cls):
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)

    @classmethod
    async def _call_openai_fallback(cls, system_prompt: str, user_prompt: str, endpoint: str) -> str:
        if not settings.OPENAI_API_KEY:
            raise ValueError("OpenAI API Key missing")

        start = time.monotonic()
        try:
            logger.debug("Gemini unavailable, falling back to OpenAI")
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            response = await client.chat.completions.create(
                model="gpt-4o-mini", # Use a cost-effective model
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                timeout=10.0
            )
            usage = response.usage
            await log_ai_usage(
                endpoint=endpoint, provider="openai", model="gpt-4o-mini", success=True,
                prompt_tokens=usage.prompt_tokens if usage else None,
                completion_tokens=usage.completion_tokens if usage else None,
                total_tokens=usage.total_tokens if usage else None,
                latency_ms=int((time.monotonic() - start) * 1000),
            )
            return response.choices[0].message.content
        except Exception as e:
            await log_ai_usage(
                endpoint=endpoint, provider="openai", model="gpt-4o-mini", success=False,
                latency_ms=int((time.monotonic() - start) * 1000), error=str(e),
            )
            logger.error("OpenAI fallback failed: %s", e)
            raise e

    @classmethod
    async def get_daily_book_recommendations(cls, language: str = "zh-TW") -> List[Dict[str, str]]:
        today = datetime.date.today()
        cache_id = f"{today}_{language}"
        
        # Return cache if valid
        if cls._cache and cls._last_update == cache_id:
            logger.debug("Returning cached book recommendations for %s", language)
            return cls._cache

        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not configured, skipping Gemini")
            return []

        logger.debug("Fetching new book recommendations from Gemini for %s", language)
        try:
            cls.configure()
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            lang_name = "Traditional Chinese (繁體中文)" if language == "zh-TW" else "English"
            market = "Taiwan/Chinese" if language == "zh-TW" else "International/US"

            prompt = f"""
            Recommend 12 books suitable for a "Daily Recommendation".
            Language: {lang_name}.
            Market context: {market}.
            Output strictly as a JSON Array of objects:
            [{{"title": "Book Title", "author": "Author Name"}}, ...]
            No markdown, no extra text.
            """
            
            response = await asyncio.wait_for(
                model.generate_content_async(prompt),
                timeout=15.0
            )
            
            text = response.text.replace("```json", "").replace("```", "").strip()
            books = json.loads(text)
            
            valid_books = []
            for b in books:
                if "title" in b:
                    valid_books.append({"title": b["title"], "author": b.get("author", "")})
            
            if valid_books:
                cls._cache = valid_books[:12]
                cls._last_update = cache_id
            
            return cls._cache

        except Exception as e:
            logger.error("Gemini recommendation failed: %s", e)
            return cls._cache

    @classmethod
    async def generate_reflection_suggestions(
        cls,
        title: str,
        synopsis: str = None,
        language: str = "zh-TW",
        media_type: Optional[str] = None,
        rating: Optional[float] = None,
    ) -> List[str]:
        if not settings.GEMINI_API_KEY and not settings.OPENAI_API_KEY:
            return []

        # 角度每次隨機抽 3 個，避免三句都長同一個樣子（尤其是「適合…」推薦句公式）
        angles = pick_angles(language)
        full_prompt = build_suggestion_prompt(title, synopsis, language, media_type, rating, angles)
        openai_system_prompt = "You help users write short, casual, first-person notes about movies, series and books."

        # 1. Try Gemini：先用快又便宜的 Flash-Lite，失敗或輸出全被過濾再退到 2.5 Flash
        if settings.GEMINI_API_KEY:
            cls.configure()
            for model_name in (FAST_MODEL, FALLBACK_MODEL):
                start = time.monotonic()
                try:
                    model = genai.GenerativeModel(model_name, generation_config={"temperature": 0.9})
                    response = await asyncio.wait_for(
                        model.generate_content_async(full_prompt),
                        timeout=10.0,
                    )
                    usage = getattr(response, "usage_metadata", None)
                    await log_ai_usage(
                        endpoint="reflection_suggestions", provider="gemini", model=model_name, success=True,
                        prompt_tokens=getattr(usage, "prompt_token_count", None),
                        completion_tokens=getattr(usage, "candidates_token_count", None),
                        total_tokens=getattr(usage, "total_token_count", None),
                        latency_ms=int((time.monotonic() - start) * 1000),
                    )

                    text = response.text.strip()
                    # Clean markdown if present
                    if "```" in text:
                        match = re.search(r'\[.*\]', text, re.DOTALL)
                        if match:
                            text = match.group(0)

                    parsed_data = json.loads(text)
                    if isinstance(parsed_data, list):
                        # 模型仍可能違規（問句、「適合…」推薦句），過濾後有結果才採用，否則換下一個模型
                        filtered = filter_suggestions(parsed_data, language)
                        if filtered:
                            return filtered
                except Exception as e:
                    await log_ai_usage(
                        endpoint="reflection_suggestions", provider="gemini", model=model_name, success=False,
                        latency_ms=int((time.monotonic() - start) * 1000), error=str(e),
                    )
                    logger.error("Gemini suggestion generation failed (%s): %s", model_name, e)

        # 2. Try OpenAI Fallback
        if settings.OPENAI_API_KEY:
            try:
                text = await cls._call_openai_fallback(openai_system_prompt, full_prompt, endpoint="reflection_suggestions")
                text = text.strip()
                if "```" in text:
                    match = re.search(r'\[.*\]', text, re.DOTALL)
                    if match:
                        text = match.group(0)
                
                parsed_data = json.loads(text)
                if isinstance(parsed_data, list):
                    # 模型仍可能違規（問句、「適合…」推薦句），過濾後有結果才採用，否則換下一個 provider
                    filtered = filter_suggestions(parsed_data, language)
                    if filtered:
                        return filtered
            except Exception as e:
                logger.error("OpenAI suggestion fallback failed: %s", e)

        return []

    @classmethod
    async def refine_reflection(cls, content: str, language: str = "zh-TW") -> str:
        if not settings.GEMINI_API_KEY or not content.strip():
            return content

        start = time.monotonic()
        try:
            cls.configure()
            model = genai.GenerativeModel(FAST_MODEL)

            lang_name = "Traditional Chinese (繁體中文)" if language == "zh-TW" else "English"

            char_limit = "50 Chinese characters" if language == "zh-TW" else "120 English characters"

            prompt = f"""
            Role: Expert Editor.
            Task: Refine the user's reflection text.
            Language: {lang_name}.

            Goals:
            1. Make it more fluent, expressive, and insightful.
            2. Expand even short thoughts into meaningful sentences.
            3. Preserve original sentiment (positive/negative).
            4. MUST change the wording from the original.
            5. Output MUST be a complete sentence ending with proper punctuation (. ! ? 。 ！ ？).
            6. Keep the output under {char_limit}.

            Original Text:
            {content}

            Output ONLY the refined text. No markdown, no intro/outro.
            """

            response = await asyncio.wait_for(
                model.generate_content_async(prompt),
                timeout=10.0
            )
            usage = getattr(response, "usage_metadata", None)
            await log_ai_usage(
                endpoint="reflection_refine", provider="gemini", model=FAST_MODEL, success=True,
                prompt_tokens=getattr(usage, "prompt_token_count", None),
                completion_tokens=getattr(usage, "candidates_token_count", None),
                total_tokens=getattr(usage, "total_token_count", None),
                latency_ms=int((time.monotonic() - start) * 1000),
            )

            return response.text.replace("```", "").strip()

        except Exception as e:
            await log_ai_usage(
                endpoint="reflection_refine", provider="gemini", model=FAST_MODEL, success=False,
                latency_ms=int((time.monotonic() - start) * 1000), error=str(e),
            )
            logger.error("Gemini refine failed: %s", e)

            # OpenAI Fallback
            if settings.OPENAI_API_KEY:
                try:
                    system_prompt = "You are an expert editor polishing Traditional Chinese text. Output ONLY the refined text."
                    user_prompt = f"Original: {content}\n\nRefine this text to be more fluent and insightful:"

                    return await cls._call_openai_fallback(system_prompt, user_prompt, endpoint="reflection_refine")
                except Exception as openai_error:
                    logger.error("OpenAI refine fallback failed: %s", openai_error)

            return content
