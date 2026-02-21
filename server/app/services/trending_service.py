import datetime
import asyncio
from typing import List, Dict, Optional
from app.core.supabase import get_supabase_client
from app.schemas.item import StoryBase

class TrendingService:
    # Memory Cache as L1 (for extreme speed)
    _mem_cache: Dict[str, dict] = {}

    @classmethod
    async def get_trending(cls, type_key: str, fetch_func) -> List[StoryBase]:
        """
        Generic method to get trending items with L1 (Mem) and L2 (DB) caching.
        type_key: 'movie', 'series', 'book'
        fetch_func: Async function to fetch data from source if cache miss.
        """
        today = datetime.date.today()
        cache_key = f"{type_key}_{today}"

        # 1. L1 Memory Cache
        if cache_key in cls._mem_cache:
            print(f"DEBUG: Returning L1 Memory Cache for {type_key}")
            return cls._mem_cache[cache_key]

        # 2. L2 Database Cache (Supabase) - Run in ThreadPool to avoid blocking
        loop = asyncio.get_running_loop()
        
        def _fetch_from_db():
            try:
                supabase = get_supabase_client()
                response = supabase.table("trending_cache").select("data").eq("date", str(today)).eq("type", type_key).execute()
                if response.data and len(response.data) > 0:
                    return response.data[0]["data"]
                return None
            except Exception as e:
                print(f"DB Read Error for {type_key}: {e}")
                return None

        db_data = await loop.run_in_executor(None, _fetch_from_db)
        
        if db_data:
            print(f"DEBUG: Returning L2 DB Cache for {type_key}")
            # Convert dicts back to Pydantic models
            results = [StoryBase(**item) for item in db_data]
            # Update L1
            cls._mem_cache[cache_key] = results
            return results

        # 3. Cache Miss - Fetch from Source
        print(f"DEBUG: Cache Miss for {type_key}. Fetching from Source API...")
        results = await fetch_func()
        
        if results:
            # Update L1
            cls._mem_cache[cache_key] = results
            
            # Update L2 - Run in ThreadPool
            def _write_to_db():
                try:
                    supabase = get_supabase_client()
                    # Convert Pydantic models to dicts for JSONB storage
                    json_data = [item.model_dump(mode='json') for item in results]
                    
                    insert_data = {
                        "date": str(today),
                        "type": type_key,
                        "data": json_data
                    }
                    supabase.table("trending_cache").insert(insert_data).execute()
                    print(f"DEBUG: Persisted {type_key} to DB")
                except Exception as e:
                    print(f"DB Write Error for {type_key}: {e}")

            # Fire and forget DB write (or await it if we want to ensure consistency)
            # Awaiting it is safer to prevent race conditions on subsequent reads
            await loop.run_in_executor(None, _write_to_db)
        
        return results or []
