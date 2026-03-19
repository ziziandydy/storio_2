from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from app.api.deps import get_current_user, security
from app.services.collection_service import CollectionService
from app.core.supabase import get_supabase_client

router = APIRouter()

@router.delete("/me")
async def delete_user_account(
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Permanently delete the current user's account and all associated data.
    """
    try:
        # 1. Clear collection data
        service = CollectionService(token=credentials.credentials)
        service.clear_user_data(user.id)
        
        # 2. Delete user from Supabase Auth
        # Note: We use the admin client (which is get_supabase_client when service role key is set)
        admin_client = get_supabase_client()
        
        # auth.admin.delete_user requires Service Role Key
        res = admin_client.auth.admin.delete_user(user.id)
        
        return {"status": "success", "message": "Account deleted"}
    except Exception as e:
        print(f"Error deleting user account: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/me/data")
async def clear_user_data(
    user = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """
    Clear all collections and stories for the current user.
    """
    try:
        service = CollectionService(token=credentials.credentials)
        service.clear_user_data(user.id)
        return {"status": "success", "message": "All data cleared"}
    except Exception as e:
        print(f"Error clearing user data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
