import asyncio
import os
from uuid import uuid4
from datetime import datetime
# Ensure paths work
import sys
sys.path.append(os.getcwd())

from app.schemas.item import StoryCreate, StoryResponse
from app.repositories.collection_repo import CollectionRepository

# Mock data
MOCK_USER_ID = "00000000-0000-0000-0000-000000000000" # 需要一個有效的 user_id，或者我們只測試 schema 轉換
MOCK_STORY_DATA = {
    "title": "Debug Story",
    "media_type": "movie",
    "external_id": "tt123456",
    "source": "tmdb",
    "rating": 8,
    "notes": "Test note"
}

# 模擬 Supabase 回傳的數據 (這通常是造成 Pydantic 錯誤的原因)
MOCK_DB_RESPONSE = {
    "id": str(uuid4()),
    "user_id": MOCK_USER_ID,
    "title": "Debug Story",
    "media_type": "movie",
    "external_id": "tt123456",
    "source": "tmdb",
    "rating": 8,
    "notes": "Test note",
    "created_at": datetime.utcnow().isoformat(), # Supabase returns ISO string
    # "viewing_number": 1 # DB 通常沒有這個，這是 computed field
}

def test_pydantic_validation():
    print("Testing Pydantic Validation...")
    try:
        story_in = StoryCreate(**MOCK_STORY_DATA)
        print("StoryCreate valid.")
        
        # 測試從 DB response 轉換為 StoryResponse
        # 這裡就是最可能出錯的地方
        story_out = StoryResponse(**MOCK_DB_RESPONSE)
        print(f"StoryResponse valid: {story_out.title}")
        print(f"Related Instances: {story_out.related_instances}")
        
    except Exception as e:
        print(f"VALIDATION ERROR: {e}")

if __name__ == "__main__":
    test_pydantic_validation()
