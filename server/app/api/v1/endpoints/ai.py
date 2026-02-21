from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.services.gemini_service import GeminiService
from app.api.deps import get_language

router = APIRouter()

class SuggestionRequest(BaseModel):
    title: str
    synopsis: Optional[str] = None

class RefineRequest(BaseModel):
    content: str

class SuggestionResponse(BaseModel):
    suggestions: List[str]

class RefineResponse(BaseModel):
    refined_content: str

@router.post("/suggestions", response_model=SuggestionResponse)
async def generate_suggestions(request: SuggestionRequest, language: str = Depends(get_language)):
    """
    Generate 3 short reflection suggestions based on the item.
    """
    suggestions = await GeminiService.generate_reflection_suggestions(request.title, request.synopsis, language)
    return SuggestionResponse(suggestions=suggestions)

@router.post("/refine", response_model=RefineResponse)
async def refine_content(request: RefineRequest, language: str = Depends(get_language)):
    """
    Refine and polish the user's reflection text.
    """
    refined = await GeminiService.refine_reflection(request.content, language)
    return RefineResponse(refined_content=refined)
