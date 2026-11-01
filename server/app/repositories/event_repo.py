from postgrest.exceptions import APIError

from app.core.supabase import get_supabase_client


class EventRepository:
    def insert_event(self, row: dict) -> None:
        """寫入一列互動事件。撞到去重唯一索引（23505）視為成功，其他錯誤往上拋。"""
        supabase = get_supabase_client()
        try:
            supabase.table("engagement_events").insert(row).execute()
        except APIError as e:
            if e.code == "23505":
                return
            raise

    def count_visitor_events(self, day: str) -> int:
        """當日沒有帳號（只有訪客代號）的事件列數，供每日總量上限使用。"""
        supabase = get_supabase_client()
        result = (
            supabase.table("engagement_events")
            .select("id", count="exact", head=True)
            .eq("day", day)
            .is_("user_id", "null")
            .execute()
        )
        return result.count or 0
