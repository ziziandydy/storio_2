import logging
import google.generativeai as genai
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.supabase import get_supabase_client
import json

logger = logging.getLogger(__name__)
import datetime
import asyncio
from typing import List, Dict

class AIRecommendationService:
    _cache: List[Dict[str, str]] = []
    _last_update: datetime.date = None

    @classmethod
    async def get_daily_book_recommendations(cls, language: str = "zh-TW") -> List[Dict[str, str]]:
        today = datetime.date.today()
        loop = asyncio.get_running_loop()
        
        # Combined cache key
        cache_id = f"{today}_{language}"

        # L1 Cache: Memory
        if cls._cache and cls._last_update == cache_id:
            logger.debug("Returning L1 cached recommendations for %s", language)
            return cls._cache

        # L2 Cache: Database (Supabase)
        def _fetch_daily_rec():
            try:
                supabase = get_supabase_client()
                # We reuse the date column but encode language if needed, 
                # or just use a combined ID if the table schema allows.
                # Since I don't want to change schema, let's check if we can filter by language.
                # If table doesn't have language column, we might need to store it in date as "2026-02-21_zh-TW"
                lang_date = f"{today}_{language}"
                response = supabase.table("daily_recommendations").select("books").eq("date", lang_date).execute()
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
        logger.debug("Cache miss, fetching recommendations from Gemini for %s", language)
        result = await cls._try_gemini(language)
        if not result:
            result = await cls._try_openai(language)
            
        if result:
            cls._cache = result
            cls._last_update = cache_id
            
            def _persist_daily_rec():
                try:
                    supabase = get_supabase_client()
                    data = { "date": f"{today}_{language}", "books": result }
                    supabase.table("daily_recommendations").insert(data).execute()
                except Exception as e:
                    logger.error("DB cache write failed for recommendations: %s", e)
            
            await loop.run_in_executor(None, _persist_daily_rec)
            return result
            
        return []

    @classmethod
    async def _try_gemini(cls, language: str = "zh-TW") -> List[Dict[str, str]]:
        if not settings.GEMINI_API_KEY:
            return []
            
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            lang_name = "Traditional Chinese (繁體中文)" if language == "zh-TW" else "English"
            market_context = "Taiwan/Chinese" if language == "zh-TW" else "International/US"
            
            prompt = f"""
            Recommend 30 books suitable for a "Daily Recommendation" to the general public.
            Language: {lang_name}.
            Market: Popular in {market_context} market.
            Categories: Contemporary literature, classics, self-help, business, sci-fi, etc.
            
            Output strictly as a JSON Array of objects:
            [{{"title": "Book Title", "author": "Author Name"}}, ...]
            No markdown tags, no extra text.
            """
            
            response = await asyncio.wait_for(
                model.generate_content_async(prompt),
                timeout=25.0
            )
            
            text = response.text.replace("```json", "").replace("```", "").strip()
            if "[" in text and "]" in text:
                text = text[text.find("["):text.rfind("]")+1]
                
            books = json.loads(text)
            return books[:30]

        except Exception as e:
            logger.error("Gemini recommendation fetch failed: %s", e)
            return []

    @classmethod
    async def _try_openai(cls, language: str = "zh-TW") -> List[Dict[str, str]]:
        if not settings.OPENAI_API_KEY:
            return []
            
        try:
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            lang_name = "Traditional Chinese (繁體中文)" if language == "zh-TW" else "English"
            
            prompt = f"Recommend 30 trending books in {lang_name}. Return JSON Array only: [{{'title': '...', 'author': '...'}}]"

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
            
            content = response.choices[0].message.content
            text = content.replace("```json", "").replace("```", "").strip()
            if "[" in text and "]" in text:
                text = text[text.find("["):text.rfind("]")+1]
            return json.loads(text)[:30]
        except Exception as e:
            logger.error("OpenAI recommendation fetch failed: %s", e)
            return []
