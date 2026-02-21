from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.gemini_service import GeminiService

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
async def generate_suggestions(request: SuggestionRequest):
    """
    Generate 3 short reflection suggestions based on the item.
    """
    suggestions = await GeminiService.generate_reflection_suggestions(request.title, request.synopsis)
    return SuggestionResponse(suggestions=suggestions)

@router.post("/refine", response_model=RefineResponse)
async def refine_content(request: RefineRequest):
    """
    Refine and polish the user's reflection text.
    """
    refined = await GeminiService.refine_reflection(request.content)
    return RefineResponse(refined_content=refined)
