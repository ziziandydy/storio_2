import asyncio
from app.services.trending_service import TrendingService
import httpx
async def main():
    movies = await TrendingService.get_trending("movie", lambda: [], "zh-TW")
    print(len(movies))
if __name__ == "__main__": asyncio.run(main())
