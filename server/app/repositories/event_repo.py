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
