import httpx
import asyncio
from app.core.config import settings

async def test():
    print(f"Testing TMDB with key: {settings.TMDB_API_KEY[:5]}...")
    params = {"language": "zh-TW", "region": "TW", "api_key": settings.TMDB_API_KEY}
    async with httpx.AsyncClient() as client:
        r = await client.get("https://api.themoviedb.org/3/trending/movie/week", params=params)
        print(f"TMDB Status: {r.status_code}")
        if r.status_code == 200:
            print(f"TMDB Results: {len(r.json().get('results', []))}")
        else:
            print(f"TMDB Error: {r.text}")

    print(f"\nTesting GBooks with key: {settings.GOOGLE_BOOKS_API_KEY[:5]}...")
    params = {"q": "v:*", "orderBy": "newest", "maxResults": 1, "key": settings.GOOGLE_BOOKS_API_KEY}
    async with httpx.AsyncClient() as client:
        r = await client.get("https://www.googleapis.com/books/v1/volumes", params=params)
        print(f"GBooks Status: {r.status_code}")
        if r.status_code == 200:
            print(f"GBooks Results: {len(r.json().get('items', []))}")
        else:
            print(f"GBooks Error: {r.text}")

if __name__ == "__main__":
    asyncio.run(test())
