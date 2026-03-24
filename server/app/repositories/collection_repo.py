import logging
from typing import List, Optional
from uuid import UUID
from app.core.supabase import get_supabase_client

logger = logging.getLogger(__name__)
from app.schemas.item import StoryCreate, StoryResponse

class CollectionRepository:
    def __init__(self, token: str = None):
        self.client = get_supabase_client()
        if token:
            self.client.postgrest.auth(token)
        self.table = self.client.table("collections")

    def _map_from_db(self, item: dict) -> dict:
        """Map DB media_type/subtype back to application domain types."""
        if item.get("media_type") == "movie" and item.get("subtype") == "tv":
            item["media_type"] = "tv"
        return item

    def _map_to_db(self, data: dict) -> dict:
        """Map application domain types to DB constraints."""
        if data.get("media_type") == "tv":
            data["media_type"] = "movie"
            data["subtype"] = "tv"
        elif data.get("media_type") == "movie" and not data.get("subtype"):
             data["subtype"] = "movie"
        return data

    def get_user_stories(self, user_id: str) -> List[StoryResponse]:
        response = self.table.select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return [StoryResponse(**self._map_from_db(item)) for item in response.data]

    def get_story(self, user_id: str, story_id: UUID) -> Optional[StoryResponse]:
        response = self.table.select("*").eq("id", str(story_id)).eq("user_id", user_id).execute()
        if response.data:
            return StoryResponse(**self._map_from_db(response.data[0]))
        return None

    def count_user_stories(self, user_id: str) -> int:
        response = self.table.select("*", count="exact", head=True).eq("user_id", user_id).execute()
        return response.count

    def check_duplicate(self, user_id: str, external_id: str) -> bool:
        response = self.table.select("id").eq("user_id", user_id).eq("external_id", external_id).limit(1).execute()
        return len(response.data) > 0

    def get_instances_by_external_id(self, user_id: str, external_id: str) -> List[dict]:
        response = self.table.select("id, created_at, rating, notes").eq("user_id", user_id).eq("external_id", external_id).order("created_at", desc=True).execute()
        return response.data

    def create_story(self, user_id: str, story: StoryCreate) -> StoryResponse:
        data = story.model_dump()
        data["user_id"] = user_id
        
        # Convert datetime to string for JSON serialization
        if data.get("created_at"):
            data["created_at"] = data["created_at"].isoformat()
        
        # Map to DB schema constraints
        data = self._map_to_db(data)
        
        try:
            response = self.table.insert(data).execute()
            logger.debug("Story inserted successfully for user %s", user_id)
            
            if response.data:
                # Ensure compatibility with StoryResponse schema
                item = self._map_from_db(response.data[0])
                # Pydantic v2 handles defaults, but let's be safe and catch errors
                return StoryResponse(**item)
        except Exception as e:
            logger.error("Failed to create story for user %s: %s", user_id, e)
            raise e
            
        raise ValueError("Failed to insert story")

    def update_story(self, user_id: str, story_id: UUID, story_update: dict) -> Optional[StoryResponse]:
        # Map update data if it contains media_type
        if "media_type" in story_update:
            story_update = self._map_to_db(story_update)
            
        response = self.table.update(story_update).eq("id", str(story_id)).eq("user_id", user_id).execute()
        if response.data:
            return StoryResponse(**self._map_from_db(response.data[0]))
        return None

    def delete_story(self, user_id: str, story_id: UUID) -> bool:
        response = self.table.delete().eq("id", str(story_id)).eq("user_id", user_id).execute()
        return len(response.data) > 0

    def delete_user_stories(self, user_id: str):
        """Clear all stories for a specific user."""
        self.table.delete().eq("user_id", user_id).execute()

    def get_collection_stats(self, user_id: str) -> dict:
        from datetime import datetime, timedelta, timezone
        from collections import defaultdict
        
        now = datetime.now(timezone.utc)
        start_of_year = datetime(now.year, 1, 1, tzinfo=timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        
        # Fetch all items from the last 30 days + this year to cover all metrics
        # Actually, let's just fetch all 'created_at' for the user. 
        # For a personal app, this is fine. If it scales, we optimize.
        response = self.table.select("created_at").eq("user_id", user_id).execute()
        
        created_ats = []
        for item in response.data:
            raw = item.get('created_at')
            if not raw:
                continue
            try:
                created_ats.append(datetime.fromisoformat(raw))
            except (ValueError, TypeError):
                continue
        
        # Initialize counters
        stats = {
            "last_7_days": 0,
            "last_14_days": 0,
            "last_30_days": 0,
            "this_week": 0,
            "this_month": 0,
            "this_year": 0,
            "daily_counts_7d": [],
            "daily_counts_30d": []
        }
        
        # Helper dates
        seven_days_ago = now - timedelta(days=7)
        fourteen_days_ago = now - timedelta(days=14)
        start_of_week = now - timedelta(days=now.weekday()) # Monday
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Buckets for daily counts
        daily_counts = defaultdict(int)

        for date in created_ats:
            if date >= seven_days_ago:
                stats["last_7_days"] += 1
            if date >= fourteen_days_ago:
                stats["last_14_days"] += 1
            if date >= thirty_days_ago:
                stats["last_30_days"] += 1
                # Add to daily bucket (YYYY-MM-DD)
                day_key = date.strftime('%Y-%m-%d')
                daily_counts[day_key] += 1
            
            if date >= start_of_week:
                stats["this_week"] += 1
            if date >= start_of_month:
                stats["this_month"] += 1
            if date >= start_of_year:
                stats["this_year"] += 1

        # Fill daily counts (ensure 0s for missing days)
        # Last 7 Days
        for i in range(7):
            day = (now - timedelta(days=6-i)).strftime('%Y-%m-%d')
            stats["daily_counts_7d"].append({"date": day, "count": daily_counts[day]})
            
        # Last 30 Days
        for i in range(30):
            day = (now - timedelta(days=29-i)).strftime('%Y-%m-%d')
            stats["daily_counts_30d"].append({"date": day, "count": daily_counts[day]})
            
        return stats

    def get_monthly_stats(self, user_id: str, month: str) -> dict:
        from datetime import datetime
        import calendar
        import logging
        
        try:
            year, m = map(int, month.split('-'))
            start_date = datetime(year, m, 1)
            _, last_day = calendar.monthrange(year, m)
            end_date = datetime(year, m, last_day, 23, 59, 59, 999999)
        except Exception as e:
            logging.error(f"Error parsing month {month}: {e}")
            return {"items": [], "summary": {"movie": 0, "book": 0, "tv": 0}}
            
        start_iso = start_date.isoformat() + "Z"
        end_iso = end_date.isoformat() + "Z"
        logging.info(f"Querying monthly stats for {user_id} between {start_iso} and {end_iso}")
        
        response = self.table.select("id, external_id, title, media_type, subtype, poster_path, created_at").eq("user_id", user_id).gte("created_at", start_iso).lte("created_at", end_iso).order("created_at", desc=False).execute()
        logging.info(f"Found {len(response.data)} items.")
        
        items = []
        summary = {"movie": 0, "book": 0, "tv": 0}
        
        for row in response.data:
            mapped_row = self._map_from_db(row)
            m_type = mapped_row.get("media_type")
            
            if m_type in summary:
                summary[m_type] += 1
                
            items.append({
                "id": str(mapped_row["id"]),
                "external_id": mapped_row.get("external_id"),
                "title": mapped_row.get("title"),
                "media_type": m_type,
                "poster_url": mapped_row.get("poster_path"),
                "created_at": mapped_row.get("created_at"),
                "dominant_color": None 
            })
            
        return {
            "summary": summary,
            "items": items
        }
