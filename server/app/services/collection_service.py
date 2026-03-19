from typing import List
from uuid import UUID
from fastapi import HTTPException, status
from app.repositories.collection_repo import CollectionRepository
from app.schemas.item import StoryCreate, StoryResponse, StoryCheckResponse, StoryInstance

class CollectionService:
    def __init__(self, token: str = None):
        self.repo = CollectionRepository(token=token)

    def get_my_collection(self, user_id: str) -> List[StoryResponse]:
        stories = self.repo.get_user_stories(user_id)
        
        # Calculate viewing numbers
        # 1. Group by external_id
        # 2. Sort groups by created_at ascending
        # 3. Assign sequence
        groups = {}
        for s in reversed(stories): # reversed because get_user_stories is desc
            if s.external_id not in groups:
                groups[s.external_id] = 0
            groups[s.external_id] += 1
            s.viewing_number = groups[s.external_id]
            
        return stories

    def get_collection_item(self, user_id: str, story_id: UUID) -> StoryResponse:
        print(f"DEBUG: Fetching item {story_id} for user {user_id}")
        story = self.repo.get_story(user_id, story_id)
        if not story:
            raise HTTPException(status_code=404, detail="Collection item not found")
        
        print(f"DEBUG: Found story {story.title} ({story.external_id})")
        
        # Calculate viewing number and relations
        try:
            instances_data = self.repo.get_instances_by_external_id(user_id, story.external_id)
            print(f"DEBUG: Found {len(instances_data)} instances")
            
            # Sort by created_at ASC
            sorted_instances = sorted(instances_data, key=lambda x: x['created_at'])
            
            related_list = []
            target_id_str = str(story_id)
            
            for idx, inst in enumerate(sorted_instances):
                view_num = idx + 1
                
                # Check if this is the current story
                if str(inst['id']) == target_id_str:
                    story.viewing_number = view_num
                
                # Create StoryInstance object
                inst_obj = StoryInstance(
                    id=inst['id'],
                    created_at=inst['created_at'],
                    rating=inst['rating'],
                    notes=inst.get('notes'),
                    viewing_number=view_num
                )
                related_list.append(inst_obj)
            
            story.related_instances = related_list
            print("DEBUG: Related instances processed")
            
        except Exception as e:
            print(f"DEBUG: Error processing instances: {e}")
            # Don't fail the request, just log error and return basic story
            # But in dev we want to see it.
            pass
            
        return story

    def check_story_status(self, user_id: str, external_id: str) -> StoryCheckResponse:
        instances_data = self.repo.get_instances_by_external_id(user_id, external_id)
        instances = [StoryInstance(**i) for i in instances_data]
        return StoryCheckResponse(exists=len(instances) > 0, instances=instances)

    def add_story(self, user_id: str, story_in: StoryCreate, is_anonymous: bool = False) -> StoryResponse:
        # Check limit only for anonymous users
        if is_anonymous:
            current_count = self.repo.count_user_stories(user_id)
            if current_count >= 10:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Guest limit reached (10 items). Please register to collect more."
                )
            
        return self.repo.create_story(user_id, story_in)

    def update_collection_item(self, user_id: str, story_id: UUID, story_update: dict) -> StoryResponse:
        # Only allow updating rating and notes for now
        allowed_updates = {k: v for k, v in story_update.items() if k in ["rating", "notes"]}
        updated_story = self.repo.update_story(user_id, story_id, allowed_updates)
        if not updated_story:
            raise HTTPException(status_code=404, detail="Collection item not found")
        return updated_story

    def remove_story(self, user_id: str, story_id: UUID):
        success = self.repo.delete_story(user_id, story_id)
        if not success:
            raise HTTPException(status_code=404, detail="Story not found")
        return {"status": "success"}

    def clear_user_data(self, user_id: str):
        """Clear all collection data for a user."""
        self.repo.delete_user_stories(user_id)

    def get_stats(self, user_id: str) -> dict:
        return self.repo.get_collection_stats(user_id)

    def get_monthly_stats(self, user_id: str, month: str) -> dict:
        return self.repo.get_monthly_stats(user_id, month)
