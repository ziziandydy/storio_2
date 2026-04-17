import logging
import google.generativeai as genai
from openai import AsyncOpenAI
import json

logger = logging.getLogger(__name__)
import asyncio
import re
from app.core.config import settings
from app.schemas.search import AISearchIntent

class SemanticSearchService:
    @classmethod
    def _clean_json(cls, text: str) -> str:
        text = text.strip()
        if "```" in text:
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if match:
                text = match.group(0)
        return text

    @classmethod
    async def parse_intent(cls, query: str, media_type: str = "movie", language: str = "zh-TW", region: str = "TW") -> AISearchIntent:
        system_prompt = f"""
        You are a semantic search intent parser for a media catalog containing movies, tv shows, and books.
        Your task is to convert a user's natural language query into structured search parameters for TMDB (movies/tv) or Google Books API.

        User context: language={language}, region={region}
        The user is looking for: {media_type}
        
        Determine if the query is a "semantic" search (describing a plot, genre, vibe) or a standard keyword search (just a title or name).
        If it's semantic, extract TMDB 'Discover' API parameters like:
        - with_genres (comma separated TMDB genre IDs)
        - with_keywords (comma separated TMDB keyword IDs)
        - primary_release_year (integer)
        
        For books, extract:
        - subject (e.g., 'fantasy', 'science fiction')
        - inauthor (if they specify an author)
        
        Output MUST be valid JSON matching this schema:
        {{
            "is_semantic": boolean,
            "media_type": "movie" | "tv" | "book",
            "tmdb_params": {{ "with_genres": "...", "with_keywords": "...", "primary_release_year": null }},
            "google_books_params": {{ "subject": "...", "inauthor": "..." }},
            "fallback_query": "The simplified keyword string if API parameters fail or for keyword search",
            "confidence": float (0.0 to 1.0),
            "explanation": "Short reasoning"
        }}
        Do not wrap the JSON in markdown blocks, return ONLY the raw JSON object.
        """
        user_prompt = f"Query: {query}"

        # 1. Try Gemini
        if settings.GEMINI_API_KEY:
            try:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                model = genai.GenerativeModel('gemini-2.5-flash')
                response = await asyncio.wait_for(
                    model.generate_content_async(f"{system_prompt}\n\n{user_prompt}"),
                    timeout=10.0
                )
                
                text = cls._clean_json(response.text)
                parsed_data = json.loads(text)
                return AISearchIntent(**parsed_data)
            except Exception as e:
                logger.error("Gemini intent parsing failed: %s", e)

        # 2. Try OpenAI Fallback
        if settings.OPENAI_API_KEY:
            try:
                client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                response = await asyncio.wait_for(
                    client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        response_format={ "type": "json_object" }
                    ),
                    timeout=10.0
                )
                content = response.choices[0].message.content
                text = cls._clean_json(content)
                parsed_data = json.loads(text)
                return AISearchIntent(**parsed_data)
            except Exception as e:
                logger.error("OpenAI intent parsing fallback failed: %s", e)

        # Fallback if both fail
        return AISearchIntent(
            is_semantic=False,
            media_type=media_type if media_type in ["movie", "tv", "book"] else "movie",
            fallback_query=query,
            confidence=0.0,
            explanation="Failed to parse intent, falling back to keyword search."
        )
