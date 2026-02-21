import google.generativeai as genai
from openai import AsyncOpenAI
from app.core.config import settings
import json
import datetime
import asyncio
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
    async def get_daily_book_recommendations(cls) -> List[Dict[str, str]]:
        today = datetime.date.today()
        
        # Return cache if valid (Simple Memory Cache)
        if cls._cache and cls._last_update == today:
            print("DEBUG: Returning cached Gemini book recommendations")
            return cls._cache

        if not settings.GEMINI_API_KEY:
            print("Gemini API Key missing")
            return []

        print("DEBUG: Fetching new book recommendations from Gemini...")
        try:
            cls.configure()
            model = genai.GenerativeModel('gemini-2.0-flash')
            
            prompt = """
            請推薦 12 本繁體中文書籍，適合作為「每日推薦」給一般大眾。
            選書標準：包含當代文學、經典小說、心理成長、商業思維、科普知識等不同領域的暢銷或高評價書籍。
            確保推薦的書籍在台灣市場是有知名度的。
            
            請嚴格輸出為 JSON Array 格式，不需要 Markdown 標記，格式如下：
            [{"title": "書名", "author": "作者"}, ...]
            """
            
            # Add timeout to prevent hanging
            response = await asyncio.wait_for(
                model.generate_content_async(prompt),
                timeout=15.0
            )
            
            text = response.text.replace("```json", "").replace("```", "").strip()
            books = json.loads(text)
            
            # Validation
            valid_books = []
            for b in books:
                if "title" in b:
                    valid_books.append({"title": b["title"], "author": b.get("author", "")})
            
            # Update cache
            if valid_books:
                cls._cache = valid_books[:12]
                cls._last_update = today
                print(f"DEBUG: Successfully cached {len(valid_books)} books from Gemini")
            
            return cls._cache

        except asyncio.TimeoutError:
            print("Gemini API Timeout")
            return cls._cache
        except Exception as e:
            print(f"Gemini Recommendation Error: {e}")
            return cls._cache # Return old cache if fail, or empty

    @classmethod
    async def generate_reflection_suggestions(cls, title: str, synopsis: str = None) -> List[str]:
        if not settings.GEMINI_API_KEY:
            return [
                f"I really enjoyed {title}, especially the way it handled the plot twists.",
                f"The character development in {title} was outstanding and very relatable.",
                f"{title} is a must-watch/read! It completely changed my perspective."
            ]

        try:
            cls.configure()
            model = genai.GenerativeModel('gemini-2.0-flash')
            
            context = f"Title: {title}\nSynopsis: {synopsis[:500] if synopsis else 'N/A'}"
            prompt = f"""
            基於以下作品資訊，生成 3 個簡短、富有洞察力的心得短句（繁體中文）。
            
            目標：
            1. 每一個心得建議必須「嚴格限制在一個句子以內」，不要有分句。
            2. 評論需具體針對該作品的「劇情轉折」、「角色心境」或「核心議題」，不要講空泛的客套話。
            3. 參考社群大眾對此作品的常見評價（例如：結局令人震撼、某角色很討喜、節奏緊湊等）。
            4. 語氣要像是一個剛看完的觀眾發自內心的感嘆。
            
            {context}
            
            請嚴格輸出為 JSON Array 格式，例如：["心得1", "心得2", "心得3"]
            """
            
            response = await asyncio.wait_for(
                model.generate_content_async(prompt),
                timeout=10.0
            )
            
            text = response.text.replace("```json", "").replace("```", "").strip()
            parsed_data = json.loads(text)
            
            # Robust Parsing: Handle both ["str", "str"] and [{"key": "str"}, ...]
            suggestions = []
            if isinstance(parsed_data, list):
                for item in parsed_data:
                    if isinstance(item, str):
                        suggestions.append(item)
                    elif isinstance(item, dict):
                        # Take the first value found in the dict
                        suggestions.extend(item.values())
            
            return suggestions[:3] if suggestions else []

        except Exception as e:
            print(f"Gemini Suggestion Error: {e}")
            
            # OpenAI Fallback
            if settings.OPENAI_API_KEY:
                try:
                    system_prompt = "You are a helpful assistant that generates short, insightful movie/book reflections in Traditional Chinese. Focus on specific plot points and common public opinions. Each suggestion MUST be exactly one sentence. Output ONLY a JSON array."
                    user_prompt = f"Title: {title}\nSynopsis: {synopsis[:500] if synopsis else 'N/A'}\n\nGenerate 3 one-sentence reflection suggestions (JSON Array)."
                    
                    openai_text = await cls._call_openai_fallback(system_prompt, user_prompt)
                    text = openai_text.replace("```json", "").replace("```", "").strip()
                    parsed_data = json.loads(text)
                    
                    suggestions = []
                    if isinstance(parsed_data, list):
                        for item in parsed_data:
                            if isinstance(item, str):
                                suggestions.append(item)
                            elif isinstance(item, dict):
                                suggestions.extend(item.values())
                                
                    return suggestions[:3] if suggestions else []
                except Exception as openai_error:
                    print(f"OpenAI Suggestion Error: {openai_error}")

            # Fallback Mock
            return [
                f"我覺得 {title} 非常精彩，推薦給大家！",
                f"{title} 的劇情轉折讓我意想不到，非常深刻。",
                f"這是一部值得細細品味的佳作。"
            ]

    @classmethod
    async def refine_reflection(cls, content: str) -> str:
        if not settings.GEMINI_API_KEY or not content.strip():
            return content + " (Refined Mock)"

        try:
            cls.configure()
            model = genai.GenerativeModel('gemini-2.0-flash')
            
            prompt = f"""
            請擔任一位專業的編輯，負責潤飾使用者的心得評論（繁體中文）。
            
            任務目標：
            1. 讓語句更通順、優美、更有深度。
            2. 即使原文很簡短（如「好看」），也要嘗試擴寫成一句更有感情的句子。
            3. 保留原本的情感傾向（正面或負面）。
            4. **重要**：改寫後的內容「必須」與原文有所不同，即使原文已經寫得不錯，也要嘗試換個更有文采的說法或使用不同的詞彙。絕對不能回傳一模一樣的內容。
            
            原文：
            {content}
            
            請直接輸出優化後的文字內容，嚴禁包含任何「這是改寫後的內容」、「好的」等前言後語，也不要使用 Markdown 標記。
            """
            
            response = await asyncio.wait_for(
                model.generate_content_async(prompt),
                timeout=10.0
            )
            
            # Clean up potential markdown code blocks if AI misbehaves
            refined = response.text.replace("```", "").strip()
            return refined

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
