import google.generativeai as genai
from openai import AsyncOpenAI
from app.core.config import settings
import json
import datetime
import asyncio
import re
from typing import List, Dict

class GeminiService:
    _cache: List[Dict[str, str]] = []
    _last_update: datetime.date = None

    @classmethod
    def configure(cls):
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)

    @classmethod
    async def _call_openai_fallback(cls, system_prompt: str, user_prompt: str) -> str:
        if not settings.OPENAI_API_KEY:
            raise ValueError("OpenAI API Key missing")
        
        try:
            print("DEBUG: Falling back to OpenAI...")
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            response = await client.chat.completions.create(
                model="gpt-4o-mini", # Use a cost-effective model
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                timeout=10.0
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"OpenAI Fallback Error: {e}")
            raise e

    @classmethod
    async def get_daily_book_recommendations(cls, language: str = "zh-TW") -> List[Dict[str, str]]:
        today = datetime.date.today()
        cache_id = f"{today}_{language}"
        
        # Return cache if valid
        if cls._cache and cls._last_update == cache_id:
            print(f"DEBUG: Returning cached Gemini book recommendations for {language}")
            return cls._cache

        if not settings.GEMINI_API_KEY:
            print("Gemini API Key missing")
            return []

        print(f"DEBUG: Fetching new book recommendations from Gemini for {language}...")
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
            print(f"Gemini Recommendation Error: {e}")
            return cls._cache

    @classmethod
    async def generate_reflection_suggestions(cls, title: str, synopsis: str = None, language: str = "zh-TW") -> List[str]:
        if not settings.GEMINI_API_KEY and not settings.OPENAI_API_KEY:
            return []

        lang_name = "Traditional Chinese (繁體中文)" if language == "zh-TW" else "English"
        context = f"Title: {title}\nSynopsis: {synopsis[:500] if synopsis else 'N/A'}"
        
        system_prompt = f"""Role: insightful viewer/reader. 
        Task: Generate 3 short, insightful one-sentence reflection suggestions.
        Language: {lang_name}."""
        
        user_prompt = f"""
        Generate 3 reflection suggestions for:
        {context}
        
        Requirements:
        1. Strictly one sentence each.
        2. Specific to the work's themes/plot.
        3. Tone: Personal, authentic.
        
        Output ONLY a JSON Array of strings: ["s1", "s2", "s3"]
        """

        # 1. Try Gemini
        if settings.GEMINI_API_KEY:
            try:
                cls.configure()
                model = genai.GenerativeModel('gemini-2.5-flash')
                response = await asyncio.wait_for(
                    model.generate_content_async(f"{system_prompt}\n\n{user_prompt}"),
                    timeout=10.0
                )
                
                text = response.text.strip()
                # Clean markdown if present
                if "```" in text:
                    match = re.search(r'\[.*\]', text, re.DOTALL)
                    if match:
                        text = match.group(0)
                
                parsed_data = json.loads(text)
                if isinstance(parsed_data, list):
                    return [str(s) for s in parsed_data[:3]]
            except Exception as e:
                print(f"Gemini Suggestion Error: {e}")

        # 2. Try OpenAI Fallback
        if settings.OPENAI_API_KEY:
            try:
                text = await cls._call_openai_fallback(system_prompt, user_prompt)
                text = text.strip()
                if "```" in text:
                    match = re.search(r'\[.*\]', text, re.DOTALL)
                    if match:
                        text = match.group(0)
                
                parsed_data = json.loads(text)
                if isinstance(parsed_data, list):
                    return [str(s) for s in parsed_data[:3]]
            except Exception as e:
                print(f"OpenAI Suggestion Fallback Error: {e}")

        return []

    @classmethod
    async def refine_reflection(cls, content: str, language: str = "zh-TW") -> str:
        if not settings.GEMINI_API_KEY or not content.strip():
            return content

        try:
            cls.configure()
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            lang_name = "Traditional Chinese (繁體中文)" if language == "zh-TW" else "English"

            prompt = f"""
            Role: Expert Editor.
            Task: Refine the user's reflection text.
            Language: {lang_name}.
            
            Goals:
            1. Make it more fluent, expressive, and insightful.
            2. Expand even short thoughts into meaningful sentences.
            3. Preserve original sentiment (positive/negative).
            4. MUST change the wording from the original.
            
            Original Text:
            {content}
            
            Output ONLY the refined text. No markdown, no intro/outro.
            """
            
            response = await asyncio.wait_for(
                model.generate_content_async(prompt),
                timeout=10.0
            )
            
            return response.text.replace("```", "").strip()

        except Exception as e:
            print(f"Gemini Refine Error: {e}")
            return content

        except Exception as e:
            print(f"Gemini Refine Error: {e}")
            
            # OpenAI Fallback
            if settings.OPENAI_API_KEY:
                try:
                    system_prompt = "You are an expert editor polishing Traditional Chinese text. Output ONLY the refined text."
                    user_prompt = f"Original: {content}\n\nRefine this text to be more fluent and insightful:"
                    
                    return await cls._call_openai_fallback(system_prompt, user_prompt)
                except Exception as openai_error:
                    print(f"OpenAI Refine Error: {openai_error}")

            return content
