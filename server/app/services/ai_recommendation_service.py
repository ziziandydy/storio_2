import google.generativeai as genai
from openai import AsyncOpenAI
from app.core.config import settings
from app.core.supabase import get_supabase_client
import json
import datetime
import asyncio
from typing import List, Dict

class AIRecommendationService:
    _cache: List[Dict[str, str]] = []
    _last_update: datetime.date = None

    @classmethod
    async def get_daily_book_recommendations(cls) -> List[Dict[str, str]]:
        today = datetime.date.today()
        loop = asyncio.get_running_loop()
        
        # L1 Cache: Memory
        if cls._cache and cls._last_update == today:
            print("DEBUG: Returning L1 cached AI book recommendations")
            return cls._cache

        # L2 Cache: Database (Supabase) - Non-blocking
        def _fetch_daily_rec():
            try:
                supabase = get_supabase_client()
                response = supabase.table("daily_recommendations").select("books").eq("date", str(today)).execute()
                if response.data and len(response.data) > 0:
                    return response.data[0]["books"]
                return None
            except Exception as e:
                print(f"DB Cache Read Error (Table might not exist): {e}")
                return None

        db_books = await loop.run_in_executor(None, _fetch_daily_rec)
        if db_books:
            print("DEBUG: Returning L2 DB cached recommendations")
            cls._cache = db_books
            cls._last_update = today
            return db_books

        # Cache Miss: Fetch from AI
        print("DEBUG: Attempting Gemini Recommendation...")
        result = await cls._try_gemini()
        if not result:
            print("DEBUG: Gemini failed or unavailable, switching to OpenAI...")
            result = await cls._try_openai()
            
        if result:
            # Update L1 Cache
            cls._update_cache(result)
            
            # Update L2 Cache (DB) - Non-blocking
            def _persist_daily_rec():
                try:
                    supabase = get_supabase_client()
                    data = {
                        "date": str(today),
                        "books": result
                    }
                    supabase.table("daily_recommendations").insert(data).execute()
                    print("DEBUG: Persisted recommendations to DB")
                except Exception as e:
                    print(f"DB Cache Write Error: {e}")
            
            await loop.run_in_executor(None, _persist_daily_rec)
                
            return result
            
        print("DEBUG: All AI services failed.")
        return []

    @classmethod
    def _update_cache(cls, data):
        cls._cache = data
        cls._last_update = datetime.date.today()
        print(f"DEBUG: Successfully cached {len(data)} books from AI")

    @classmethod
    async def _try_gemini(cls) -> List[Dict[str, str]]:
        if not settings.GEMINI_API_KEY:
            print("Gemini API Key missing")
            return []
            
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel('gemini-2.0-flash')
            
            prompt = """
            請推薦 30 本繁體中文書籍，適合作為「每日推薦」給一般大眾。
            選書標準：包含當代文學、經典小說、心理成長、商業思維、科普知識等不同領域的暢銷或高評價書籍。
            確保推薦的書籍在台灣市場是有知名度的。
            
            請嚴格輸出為 JSON Array 格式，不需要 Markdown 標記，格式如下：
            [{"title": "書名", "author": "作者"}, ...]
            """
            
            response = await asyncio.wait_for(
                model.generate_content_async(prompt),
                timeout=20.0 # Increased timeout for 30 books
            )
            
            text = response.text.replace("```json", "").replace("```", "").strip()
            if "[" in text and "]" in text:
                text = text[text.find("["):text.rfind("]")+1]
                
            books = json.loads(text)
            
            valid_books = []
            for b in books:
                if "title" in b:
                    valid_books.append({"title": b["title"], "author": b.get("author", "")})
            
            return valid_books[:30]

        except Exception as e:
            print(f"Gemini Recommendation Error: {e}")
            return []

    @classmethod
    async def _try_openai(cls) -> List[Dict[str, str]]:
        if not settings.OPENAI_API_KEY:
            print("OpenAI API Key missing")
            return []
            
        try:
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            
            prompt = """
            請推薦 30 本繁體中文書籍，適合作為「每日推薦」給一般大眾。
            選書標準：包含當代文學、經典小說、心理成長、商業思維、科普知識等不同領域的暢銷或高評價書籍。
            確保推薦的書籍在台灣市場是有知名度的。
            
            請嚴格輸出為 JSON Array 格式，不需要 Markdown 標記，格式如下：
            [{"title": "書名", "author": "作者"}, ...]
            """

            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a helpful librarian recommendation system. Output JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                ),
                timeout=20.0
            )
            
            content = response.choices[0].message.content
            text = content.replace("```json", "").replace("```", "").strip()
            if "[" in text and "]" in text:
                text = text[text.find("["):text.rfind("]")+1]
                
            books = json.loads(text)
            
            valid_books = []
            for b in books:
                if "title" in b:
                    valid_books.append({"title": b["title"], "author": b.get("author", "")})
            
            return valid_books[:30]

        except Exception as e:
            print(f"OpenAI Recommendation Error: {e}")
            return []
