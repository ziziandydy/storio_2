import httpx
import asyncio
import random
import re
from typing import List, Optional
from app.schemas.item import StoryBase, ItemDetailResponse, Review, MediaAsset
from app.core.config import settings
from app.services.ai_recommendation_service import AIRecommendationService
from app.services.trending_service import TrendingService

class SearchService:
    BASE_URL_TMDB = "https://api.themoviedb.org/3"
    BASE_URL_GBOOKS = "https://www.googleapis.com/books/v1/volumes"

    @staticmethod
    def _extract_year(date_str: str) -> Optional[int]:
        if not date_str:
            return None
        try:
            return int(date_str[:4])
        except ValueError:
            return None

    @staticmethod
    def _optimize_gb_cover(image_links: dict) -> Optional[str]:
        """Helper to get high-res, clean Google Books covers."""
        if not image_links:
            return None
            
        poster = (
            image_links.get("extraLarge") or 
            image_links.get("large") or 
            image_links.get("medium") or 
            image_links.get("thumbnail") or 
            image_links.get("smallThumbnail")
        )
        
        if poster:
            if "zoom=" in poster:
                poster = re.sub(r'zoom=[0-9]', 'zoom=2', poster)
            poster = poster.replace("&edge=curl", "")
            if poster.startswith("http://"):
                poster = poster.replace("http://", "https://")
        return poster

    @staticmethod
    def _clean_html(raw_html: Optional[str]) -> Optional[str]:
        """Remove HTML tags from description."""
        if not raw_html:
            return None
        # Replace <br> and <p> with newlines
        text = re.sub(r'<br\s*/?>', '\n', raw_html)
        text = re.sub(r'<p>', '\n', text)
        text = re.sub(r'</p>', '\n', text)
        # Remove all other tags
        clean_text = re.sub(r'<[^>]+>', '', text)
        # Unescape HTML entities (basic ones)
        clean_text = clean_text.replace('&nbsp;', ' ').replace('&quot;', '"').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
        return clean_text.strip()

    # --- Public Detail Method ---

    @staticmethod
    async def get_item_details(client: httpx.AsyncClient, media_type: str, external_id: str, language: str = "zh-TW") -> Optional[ItemDetailResponse]:
        """
        Fetch full details for an item, including synopsis and reviews.
        """
        if media_type == "movie":
            return await SearchService._fetch_tmdb_details(client, external_id, is_tv=False, language=language)
        elif media_type == "tv":
            return await SearchService._fetch_tmdb_details(client, external_id, is_tv=True, language=language)
        elif media_type == "book":
            return await SearchService._fetch_gbooks_details(client, external_id, language=language)
        return None

    # --- Public Trending Methods (Cached via TrendingService) ---

    @staticmethod
    async def get_trending_movies(client: httpx.AsyncClient, language: str = "zh-TW") -> List[StoryBase]:
        async def fetcher():
            return await SearchService._fetch_tmdb_trending(client, "movie", language)
        return await TrendingService.get_trending("movie", fetcher, language)

    @staticmethod
    async def get_trending_series(client: httpx.AsyncClient, language: str = "zh-TW") -> List[StoryBase]:
        async def fetcher():
            return await SearchService._fetch_tmdb_trending(client, "tv", language)
        return await TrendingService.get_trending("series", fetcher, language)

    @staticmethod
    async def get_trending_books(client: httpx.AsyncClient, language: str = "zh-TW") -> List[StoryBase]:
        async def fetcher():
            return await SearchService._fetch_ai_books(client, language)
        return await TrendingService.get_trending("book", fetcher, language)

    # --- Internal Fetchers (Source of Truth) ---

    @staticmethod
    async def _fetch_tmdb_details(client: httpx.AsyncClient, external_id: str, is_tv: bool = False, language: str = "zh-TW") -> Optional[ItemDetailResponse]:
        headers = {}
        # Append credits, reviews, videos, and images
        params = {"language": language, "append_to_response": "credits,reviews,videos,images"}
        
        if settings.TMDB_ACCESS_TOKEN:
            headers["Authorization"] = f"Bearer {settings.TMDB_ACCESS_TOKEN}"
        elif settings.TMDB_API_KEY:
            params["api_key"] = settings.TMDB_API_KEY
        else:
            return None

        endpoint = "tv" if is_tv else "movie"

        try:
            # Fetch directly from the correct endpoint
            response = await client.get(f"{SearchService.BASE_URL_TMDB}/{endpoint}/{external_id}", params=params, headers=headers)
            
            response.raise_for_status()
            data = response.json()

            title = data.get("title") or data.get("name")
            date_str = data.get("release_date") or data.get("first_air_date")
            year = SearchService._extract_year(date_str)
            poster = f"https://image.tmdb.org/t/p/w500{data.get('poster_path')}" if data.get('poster_path') else None
            backdrop = f"https://image.tmdb.org/t/p/original{data.get('backdrop_path')}" if data.get('backdrop_path') else None
            subtype = "tv" if is_tv else "movie"

            # Cast & Crew
            cast_list = [person.get("name") for person in data.get("credits", {}).get("cast", [])[:5]]
            directors = [person.get("name") for person in data.get("credits", {}).get("crew", []) if person.get("job") == "Director"]
            # For TV, creators usually
            if subtype == 'tv':
                directors.extend([person.get("name") for person in data.get("created_by", [])])

            # Details
            origin_country = data.get("origin_country", [])
            if not origin_country and data.get("production_countries"):
                origin_country = [c.get("iso_3166_1") for c in data.get("production_countries")]
            
            country_str = origin_country[0] if origin_country else None
            
            original_lang = data.get("original_language")
            spoken_langs = [l.get("english_name") or l.get("name") for l in data.get("spoken_languages", [])]
            production_companies = [c.get("name") for c in data.get("production_companies", [])]

            # Reviews
            reviews = []
            for r in data.get("reviews", {}).get("results", [])[:3]:
                reviews.append(Review(
                    author=r.get("author", "Anonymous"),
                    content=r.get("content", ""),
                    rating=r.get("author_details", {}).get("rating")
                ))

            # Runtime
            runtime = f"{data.get('runtime')}m" if data.get("runtime") else None
            if not runtime and data.get("episode_run_time"):
                runtime = f"{data['episode_run_time'][0]}m"

            # Media Assets
            media_assets = []
            # Videos (Trailers)
            videos = data.get("videos", {}).get("results", [])
            for v in videos:
                if v.get("site") == "YouTube" and v.get("type") in ["Trailer", "Teaser"]:
                    media_assets.append(MediaAsset(
                        type="video",
                        url=f"https://www.youtube.com/watch?v={v.get('key')}",
                        thumbnail=f"https://img.youtube.com/vi/{v.get('key')}/mqdefault.jpg",
                        title=v.get("name")
                    ))
            
            # Images (Backdrops & Posters)
            images = data.get("images", {}).get("backdrops", [])
            for img in images[:5]:
                img_url = f"https://image.tmdb.org/t/p/original{img.get('file_path')}"
                thumb_url = f"https://image.tmdb.org/t/p/w500{img.get('file_path')}"
                if img_url != backdrop:
                    media_assets.append(MediaAsset(
                        type="image",
                        url=img_url,
                        thumbnail=thumb_url,
                        title="Backdrop"
                    ))
            
            posters = data.get("images", {}).get("posters", [])
            for img in posters[:3]:
                img_url = f"https://image.tmdb.org/t/p/w500{img.get('file_path')}"
                if img_url != poster:
                    media_assets.append(MediaAsset(
                        type="image",
                        url=img_url,
                        thumbnail=img_url,
                        title="Poster Art"
                    ))

            return ItemDetailResponse(
                title=title or "Unknown",
                media_type=endpoint, # 'movie' or 'tv'
                subtype=subtype,
                year=year,
                external_id=external_id,
                poster_path=poster,
                backdrop_path=backdrop,
                source="tmdb",
                synopsis=data.get("overview"),
                overview=data.get("overview"),
                cast=cast_list,
                directors=directors,
                production_companies=production_companies,
                origin_country=country_str,
                original_language=original_lang,
                spoken_languages=spoken_langs,
                quotes=[],
                related_media=media_assets,
                runtime=runtime,
                genres=[g.get("name") for g in data.get("genres", [])],
                public_rating=data.get("vote_average"),
                top_reviews=reviews,
                reviews=reviews
            )
        except Exception as e:
            print(f"TMDB Detail Error: {e}")
            return None

    @staticmethod
    async def _fetch_gbooks_details(client: httpx.AsyncClient, external_id: str, language: str = "zh-TW") -> Optional[ItemDetailResponse]:
        params = {}
        if settings.GOOGLE_BOOKS_API_KEY:
            params["key"] = settings.GOOGLE_BOOKS_API_KEY
            
        try:
            response = await client.get(f"{SearchService.BASE_URL_GBOOKS}/{external_id}", params=params)
            response.raise_for_status()
            data = response.json()
            info = data.get("volumeInfo", {})
            access_info = data.get("accessInfo", {})

            poster = SearchService._optimize_gb_cover(info.get("imageLinks", {}))
            
            # Media Assets
            media_assets = []
            if access_info.get("webReaderLink"):
                media_assets.append(MediaAsset(
                    type="link",
                    url=access_info.get("webReaderLink"),
                    title="Read Sample"
                ))
            
            description = SearchService._clean_html(info.get("description"))
            
            return ItemDetailResponse(
                title=info.get("title", "Unknown"),
                media_type="book",
                year=SearchService._extract_year(info.get("publishedDate")),
                external_id=external_id,
                poster_path=poster,
                source="google_books",
                synopsis=description,
                overview=description,
                cast=info.get("authors", []),
                authors=info.get("authors", []),
                publisher=info.get("publisher"),
                origin_country=None,
                original_language=info.get("language"),
                spoken_languages=[info.get("language")] if info.get("language") else [],
                quotes=[],
                related_media=media_assets,
                runtime=f"{info.get('pageCount', '?')} pages",
                genres=info.get("categories", []),
                public_rating=info.get("averageRating"),
                top_reviews=[],
                reviews=[]
            )
        except Exception as e:
            print(f"Google Books Detail Error: {e}")
            return None

    @staticmethod
    async def _fetch_tmdb_trending(client: httpx.AsyncClient, media_type: str, language: str = "zh-TW") -> List[StoryBase]:
        headers = {}
        params = {"language": language, "region": "TW"}
        if settings.TMDB_ACCESS_TOKEN:
            headers["Authorization"] = f"Bearer {settings.TMDB_ACCESS_TOKEN}"
        elif settings.TMDB_API_KEY:
            params["api_key"] = settings.TMDB_API_KEY
        else:
            return []
            
        endpoint = "movie" if media_type == "movie" else "tv"
        try:
            response = await client.get(f"{SearchService.BASE_URL_TMDB}/trending/{endpoint}/week", params=params, headers=headers)
            response.raise_for_status()
            data = response.json()
            results = []
            for item in data.get("results", [])[:20]:
                poster = f"https://image.tmdb.org/t/p/w500{item['poster_path']}" if item.get('poster_path') else None
                if not poster: continue
                title = item.get("title") if media_type == "movie" else item.get("name")
                date_field = "release_date" if media_type == "movie" else "first_air_date"
                subtype = "movie" if media_type == "movie" else "tv"
                results.append(StoryBase(
                    title=title or "Unknown",
                    media_type="tv" if media_type == "tv" else "movie",
                    subtype=subtype,
                    year=SearchService._extract_year(item.get(date_field)),
                    external_id=str(item.get("id")),
                    poster_path=poster,
                    source="tmdb"
                ))
            return results
        except Exception as e:
            print(f"TMDB Trending {media_type} Error: {e}")
            return []

    @staticmethod
    async def _fetch_ai_books(client: httpx.AsyncClient, language: str = "zh-TW") -> List[StoryBase]:
        # Pass language to AI service to get localized recommendations
        ai_books = await AIRecommendationService._try_gemini(language)
        if not ai_books:
            ai_books = await AIRecommendationService._try_openai(language)
        
        if ai_books:
            # Limit concurrency to 5 requests at a time
            sem = asyncio.Semaphore(5)

            async def fetch_with_sem(book):
                async with sem:
                    # When searching Google Books, we use the title returned by AI (which should be localized)
                    return await SearchService._search_single_book_cover(client, book["title"], book["author"], language)

            tasks = [fetch_with_sem(book) for book in ai_books]
            results = await asyncio.gather(*tasks)
            valid_results = [r for r in results if r is not None]
            if valid_results:
                return valid_results

        # 2. Fallback to Google Books standard search

        params = {"q": "v:*", "orderBy": "newest", "maxResults": 30, "printType": "books", "langRestrict": language[:2]}
        if settings.GOOGLE_BOOKS_API_KEY: params["key"] = settings.GOOGLE_BOOKS_API_KEY
        try:
            response = await client.get(SearchService.BASE_URL_GBOOKS, params=params)
            response.raise_for_status()
            data = response.json()
            results = []
            for item in data.get("items", []):
                info = item.get("volumeInfo", {})
                poster = SearchService._optimize_gb_cover(info.get("imageLinks", {}))
                if not poster: continue
                results.append(StoryBase(
                    title=info.get("title", "Unknown"),
                    media_type="book",
                    year=SearchService._extract_year(info.get("publishedDate")),
                    external_id=item.get("id"),
                    poster_path=poster,
                    source="google_books"
                ))
            return results[:20]
        except Exception as e:
            print(f"Google Books Trending Error: {e}")
            return []

    @staticmethod
    async def _search_single_book_cover(client: httpx.AsyncClient, title: str, author: str, language: str = "zh-TW") -> Optional[StoryBase]:
        query = f"intitle:{title}"
        if author: query += f"+inauthor:{author}"
        params = {"q": query, "maxResults": 1, "printType": "books", "langRestrict": language[:2]}
        if settings.GOOGLE_BOOKS_API_KEY: params["key"] = settings.GOOGLE_BOOKS_API_KEY
        try:
            response = await client.get(SearchService.BASE_URL_GBOOKS, params=params)
            if response.status_code != 200: return None
            data = response.json()
            items = data.get("items", [])
            if not items: return None
            info = items[0].get("volumeInfo", {})
            poster = SearchService._optimize_gb_cover(info.get("imageLinks", {}))
            if not poster: return None
            return StoryBase(
                title=info.get("title", title),
                media_type="book",
                year=SearchService._extract_year(info.get("publishedDate")),
                external_id=items[0].get("id"),
                poster_path=poster,
                source="ai_recommendation"
            )
        except Exception as e:
            print(f"Error fetching cover for {title}: {e}")
            return None

    @staticmethod
    async def search_tmdb(client: httpx.AsyncClient, query: str, language: str = "zh-TW") -> List[StoryBase]:
        headers = {}
        params = {"query": query, "language": language, "region": "TW"}
        if settings.TMDB_ACCESS_TOKEN: headers["Authorization"] = f"Bearer {settings.TMDB_ACCESS_TOKEN}"
        elif settings.TMDB_API_KEY: params["api_key"] = settings.TMDB_API_KEY
        else: return []
        try:
            response = await client.get(f"{SearchService.BASE_URL_TMDB}/search/movie", params=params, headers=headers)
            response.raise_for_status()
            data = response.json()
            results = []
            for item in data.get("results", [])[:10]:
                poster = f"https://image.tmdb.org/t/p/w500{item['poster_path']}" if item.get('poster_path') else None
                if not poster: continue
                results.append(StoryBase(
                    title=item.get("title", "Unknown"),
                    media_type="movie",
                    year=SearchService._extract_year(item.get("release_date")),
                    external_id=str(item.get("id")),
                    poster_path=poster,
                    source="tmdb"
                ))
            return results
        except Exception as e:
            print(f"TMDB Error: {e}")
            return []

    @staticmethod
    async def search_google_books(client: httpx.AsyncClient, query: str, language: str = "zh-TW") -> List[StoryBase]:
        params = {"q": query, "maxResults": 15, "printType": "books", "langRestrict": language[:2]}
        if settings.GOOGLE_BOOKS_API_KEY: params["key"] = settings.GOOGLE_BOOKS_API_KEY
        try:
            response = await client.get(SearchService.BASE_URL_GBOOKS, params=params)
            response.raise_for_status()
            data = response.json()
            results = []
            for item in data.get("items", []):
                info = item.get("volumeInfo", {})
                poster = SearchService._optimize_gb_cover(info.get("imageLinks", {}))
                if not poster: continue
                results.append(StoryBase(
                    title=info.get("title", "Unknown"),
                    media_type="book",
                    year=SearchService._extract_year(info.get("publishedDate")),
                    external_id=item.get("id"),
                    poster_path=poster,
                    source="google_books"
                ))
            return results
        except Exception as e:
            print(f"Google Books Error: {e}")
            return []

    @staticmethod
    async def search_multi(query: str, language: str = "zh-TW") -> List[StoryBase]:
        if not query: return []
        async with httpx.AsyncClient() as client:
            tmdb_task = SearchService.search_tmdb(client, query, language)
            gbooks_task = SearchService.search_google_books(client, query, language)
            results_tmdb, results_gbooks = await asyncio.gather(tmdb_task, gbooks_task)
            return results_tmdb + results_gbooks