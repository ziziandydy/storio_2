from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from app.services.gemini_service import GeminiService
from app.api.deps import get_language

router = APIRouter()

class SuggestionRequest(BaseModel):
    title: str
    synopsis: Optional[str] = None
    media_type: Optional[Literal["movie", "tv", "book"]] = None
    rating: Optional[float] = Field(None, ge=0, le=10)  # 10 分制；未評分可不傳

class RefineRequest(BaseModel):
    content: str

class SuggestionResponse(BaseModel):
    suggestions: List[str]

class RefineResponse(BaseModel):
    refined_content: str

@router.post("/suggestions", response_model=SuggestionResponse)
async def generate_suggestions(request: SuggestionRequest, language: str = Depends(get_language)):
    """
    Generate up to 3 short, casual first-person reflection drafts based on the item.
    media_type / rating are optional hints (older clients may omit them).
    """
    suggestions = await GeminiService.generate_reflection_suggestions(
        request.title, request.synopsis, language,
        media_type=request.media_type, rating=request.rating,
    )
    return SuggestionResponse(suggestions=suggestions)

@router.post("/refine", response_model=RefineResponse)
async def refine_content(request: RefineRequest, language: str = Depends(get_language)):
    """
    Refine and polish the user's reflection text.
    """
    refined = await GeminiService.refine_reflection(request.content, language)
    return RefineResponse(refined_content=refined)
