import logging
import httpx
import asyncio
import random
import re
from typing import List, Optional

logger = logging.getLogger(__name__)

_HTTPX_TIMEOUT = httpx.Timeout(connect=5.0, read=15.0, write=5.0, pool=5.0)
from app.schemas.item import StoryBase, ItemDetailResponse, Review, MediaAsset
from app.core.config import settings
from app.services.ai_recommendation_service import AIRecommendationService
from app.services.trending_service import TrendingService
from app.schemas.search import AISearchIntent

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
    async def get_item_details(client: httpx.AsyncClient, media_type: str, external_id: str, language: str = "zh-TW", region: str = "TW") -> Optional[ItemDetailResponse]:
        """
        Fetch full details for an item, including synopsis and reviews.
        """
        if media_type == "movie":
            return await SearchService._fetch_tmdb_details(client, external_id, is_tv=False, language=language, region=region)
        elif media_type == "tv":
            return await SearchService._fetch_tmdb_details(client, external_id, is_tv=True, language=language, region=region)
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
    async def _fetch_tmdb_details(client: httpx.AsyncClient, external_id: str, is_tv: bool = False, language: str = "zh-TW", region: str = "TW") -> Optional[ItemDetailResponse]:
        headers = {}
        # Append credits, reviews, videos, images AND watch/providers
        params = {"language": language, "append_to_response": "credits,reviews,videos,images,watch/providers"}
        
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

            # Streaming Providers
            streaming_providers = []
            if "watch/providers" in data and "results" in data["watch/providers"]:
                # Get providers for the requested region (default TW)
                region_data = data["watch/providers"]["results"].get(region)
                if region_data:
                    from app.schemas.item import StreamingProvider
                    # Process flatrate (subscription), rent, and buy
                    for p_type in ['flatrate', 'rent', 'buy']:
                        if p_type in region_data:
                            for provider in region_data[p_type]:
                                if provider.get("logo_path"):
                                    streaming_providers.append(StreamingProvider(
                                        provider_name=provider.get("provider_name"),
                                        logo_path=f"https://image.tmdb.org/t/p/original{provider.get('logo_path')}",
                                        type=p_type
                                    ))
            
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
                status=data.get("status"),
                revenue=data.get("revenue"),
                budget=data.get("budget"),
                original_language=original_lang,
                streaming_providers=streaming_providers,
                cast=cast_list,
                directors=directors,
                production_companies=production_companies,
                origin_country=country_str,
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
            logger.error("TMDB detail fetch failed: %s", e)
            return None

    @staticmethod
    async def _fetch_gbooks_details(client: httpx.AsyncClient, external_id: str, language: str = "zh-TW") -> Optional[ItemDetailResponse]:
        params = {"projection": "full"}
        # Google Books API volumes.get technically doesn't support langRestrict as a filter, 
        # but passing it might influence some localized fields or it's a no-op. 
        # However, for consistency and future-proofing:
        # params["langRestrict"] = language[:2] 
        
        if settings.GOOGLE_BOOKS_API_KEY:
            params["key"] = settings.GOOGLE_BOOKS_API_KEY
            
        try:
            response = await client.get(f"{SearchService.BASE_URL_GBOOKS}/{external_id}", params=params)
            response.raise_for_status()
            data = response.json()
            info = data.get("volumeInfo", {})
            access_info = data.get("accessInfo", {})

            poster = SearchService._optimize_gb_cover(info.get("imageLinks", {}))
            
            # Media Assets (Covers)
            media_assets = []
            image_links = info.get("imageLinks", {})
            if image_links:
                # Add various sizes as image assets
                for size in ['extraLarge', 'large', 'medium', 'small', 'thumbnail']:
                    if url := image_links.get(size):
                        # Optimize URL
                        clean_url = url.replace("&edge=curl", "").replace("http://", "https://")
                        if "zoom=" in clean_url:
                            clean_url = re.sub(r'zoom=[0-9]', 'zoom=0', clean_url) # zoom=0 often gives best quality relative to size
                        
                        media_assets.append(MediaAsset(
                            type="image",
                            url=clean_url,
                            thumbnail=clean_url,
                            title=f"Cover ({size})"
                        ))

            if access_info.get("webReaderLink"):
                media_assets.insert(0, MediaAsset(
                    type="link",
                    url=access_info.get("webReaderLink"),
                    title="Read Sample"
                ))
            
            description = SearchService._clean_html(info.get("description"))
            
            # Streaming Providers (Where to Buy)
            streaming_providers = []
            sale_info = data.get("saleInfo", {})
            if sale_info.get("saleability") == "FOR_SALE" and sale_info.get("buyLink"):
                from app.schemas.item import StreamingProvider
                
                price = ""
                if list_price := sale_info.get("listPrice"):
                    price = f" {list_price.get('amount')} {list_price.get('currencyCode')}"
                
                streaming_providers.append(StreamingProvider(
                    provider_name=f"Google Play{price}",
                    logo_path="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Google_Play_Books_icon.svg/512px-Google_Play_Books_icon.svg.png", # Stable PNG
                    type="buy"
                ))

            # Extract ISBN-13
            isbn = None
            for ident in info.get("industryIdentifiers", []):
                if ident.get("type") == "ISBN_13":
                    isbn = ident.get("identifier")
                    break
            if not isbn and info.get("industryIdentifiers"):
                 # Fallback to whatever is first
                 isbn = info.get("industryIdentifiers")[0].get("identifier")

            return ItemDetailResponse(
                title=info.get("title", "Unknown"),
                subtitle=info.get("subtitle"),
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
                streaming_providers=streaming_providers,
                runtime=f"{info.get('pageCount', '?')} pages",
                page_count=info.get("pageCount"),
                genres=info.get("categories", []),
                isbn=isbn,
                public_rating=info.get("averageRating"),
                top_reviews=[],
                reviews=[]
            )
        except Exception as e:
            logger.error("Google Books detail fetch failed: %s", e)
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
            logger.error("TMDB trending %s fetch failed: %s", media_type, e)
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
            logger.error("Google Books trending fetch failed: %s", e)
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
            logger.error("Cover fetch failed for '%s': %s", title, e)
            return None

    @staticmethod
    async def search_tmdb(client: httpx.AsyncClient, query: str, language: str = "zh-TW") -> List[StoryBase]:
        headers = {}
        params = {"query": query, "language": language, "region": "TW"}
        if settings.TMDB_ACCESS_TOKEN: headers["Authorization"] = f"Bearer {settings.TMDB_ACCESS_TOKEN}"
        elif settings.TMDB_API_KEY: params["api_key"] = settings.TMDB_API_KEY
        else: return []
        
        try:
            # Search both movies and TV shows
            movie_task = client.get(f"{SearchService.BASE_URL_TMDB}/search/movie", params=params, headers=headers)
            tv_task = client.get(f"{SearchService.BASE_URL_TMDB}/search/tv", params=params, headers=headers)
            
            responses = await asyncio.gather(movie_task, tv_task)
            
            results = []
            
            # Process Movie Results
            movie_data = responses[0].json()
            for item in movie_data.get("results", [])[:10]:
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
            
            # Process TV Results
            tv_data = responses[1].json()
            for item in tv_data.get("results", [])[:10]:
                poster = f"https://image.tmdb.org/t/p/w500{item['poster_path']}" if item.get('poster_path') else None
                if not poster: continue
                results.append(StoryBase(
                    title=item.get("name", "Unknown"),
                    media_type="tv",
                    year=SearchService._extract_year(item.get("first_air_date")),
                    external_id=str(item.get("id")),
                    poster_path=poster,
                    source="tmdb"
                ))
            
            return results
        except Exception as e:
            logger.error("TMDB search failed: %s", e)
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
            logger.error("Google Books search failed: %s", e)
            return []

    @staticmethod
    async def search_multi(query: str, language: str = "zh-TW") -> List[StoryBase]:
        if not query: return []
        async with httpx.AsyncClient(timeout=_HTTPX_TIMEOUT) as client:
            tmdb_task = SearchService.search_tmdb(client, query, language)
            gbooks_task = SearchService.search_google_books(client, query, language)
            results_tmdb, results_gbooks = await asyncio.gather(tmdb_task, gbooks_task)
            return results_tmdb + results_gbooks

    @staticmethod
    async def search_by_intent(client: httpx.AsyncClient, intent: AISearchIntent, language: str = "zh-TW") -> List[StoryBase]:
        if not intent.is_semantic or not intent.tmdb_params and not intent.google_books_params:
            # Fallback to standard multi-search
            if intent.media_type == "movie":
                return await SearchService.search_tmdb(client, intent.fallback_query, language)
            elif intent.media_type == "book":
                return await SearchService.search_google_books(client, intent.fallback_query, language)
            elif intent.media_type == "tv":
                # Current search_tmdb searches both movie and tv, but we can filter if needed. The search_tmdb already returns both.
                # Actually, our search_tmdb does both, let's just use it and filter
                results = await SearchService.search_tmdb(client, intent.fallback_query, language)
                return [r for r in results if r.media_type == "tv"]
            else:
                return await SearchService.search_multi(intent.fallback_query, language)

        results = []
        if intent.media_type in ["movie", "tv"] and intent.tmdb_params:
            endpoint = "movie" if intent.media_type == "movie" else "tv"
            params = {"language": language, "region": "TW", "sort_by": intent.tmdb_params.sort_by or "popularity.desc"}
            if intent.tmdb_params.with_genres:
                params["with_genres"] = intent.tmdb_params.with_genres
            if intent.tmdb_params.with_keywords:
                params["with_keywords"] = intent.tmdb_params.with_keywords
            if intent.tmdb_params.with_cast:
                params["with_cast"] = intent.tmdb_params.with_cast
            if intent.tmdb_params.with_crew:
                params["with_crew"] = intent.tmdb_params.with_crew
            if intent.tmdb_params.primary_release_year:
                if intent.media_type == "movie":
                    params["primary_release_year"] = intent.tmdb_params.primary_release_year
                else:
                    params["first_air_date_year"] = intent.tmdb_params.primary_release_year
                    
            headers = {}
            if settings.TMDB_ACCESS_TOKEN: headers["Authorization"] = f"Bearer {settings.TMDB_ACCESS_TOKEN}"
            elif settings.TMDB_API_KEY: params["api_key"] = settings.TMDB_API_KEY
            else: return []

            try:
                response = await client.get(f"{SearchService.BASE_URL_TMDB}/discover/{endpoint}", params=params, headers=headers)
                response.raise_for_status()
                data = response.json()
                for item in data.get("results", [])[:20]:
                    poster = f"https://image.tmdb.org/t/p/w500{item['poster_path']}" if item.get('poster_path') else None
                    if not poster: continue
                    title = item.get("title") if intent.media_type == "movie" else item.get("name")
                    date_field = "release_date" if intent.media_type == "movie" else "first_air_date"
                    subtype = "movie" if intent.media_type == "movie" else "tv"
                    results.append(StoryBase(
                        title=title or "Unknown",
                        media_type="tv" if intent.media_type == "tv" else "movie",
                        subtype=subtype,
                        year=SearchService._extract_year(item.get(date_field)),
                        external_id=str(item.get("id")),
                        poster_path=poster,
                        source="tmdb"
                    ))
            except Exception as e:
                logger.error("TMDB discover failed: %s", e)

        # Adding Google Books specific semantic parameters
        if intent.media_type == "book" and intent.google_books_params:
            q = intent.google_books_params.q or "v:*"
            if intent.google_books_params.subject:
                q += f"+subject:{intent.google_books_params.subject}"
            if intent.google_books_params.inauthor:
                q += f"+inauthor:{intent.google_books_params.inauthor}"

            params = {"q": q, "maxResults": 20, "printType": "books", "langRestrict": language[:2]}
            if settings.GOOGLE_BOOKS_API_KEY: params["key"] = settings.GOOGLE_BOOKS_API_KEY
            try:
                response = await client.get(SearchService.BASE_URL_GBOOKS, params=params)
                response.raise_for_status()
                data = response.json()
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
            except Exception as e:
                logger.error("Google Books discover failed: %s", e)
                
        return results