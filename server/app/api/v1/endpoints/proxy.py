from fastapi import APIRouter, HTTPException, Query, Response
import httpx

router = APIRouter()

@router.get("/image")
async def proxy_image(url: str = Query(..., description="The URL of the image to proxy")):
    """
    Proxies an image request to bypass CORS restrictions for the frontend Canvas.
    """
    if not url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid URL protocol")
        
    async with httpx.AsyncClient() as client:
        try:
            # We follow redirects and get the image
            res = await client.get(url, follow_redirects=True)
            res.raise_for_status()
            
            content_type = res.headers.get("content-type", "image/jpeg")
            
            # Return the raw binary data with the correct content type
            # and CORS headers (FastAPI CORSMiddleware will handle the origin)
            headers = {
                "Cache-Control": "public, max-age=86400",
                "Access-Control-Allow-Origin": "*" # Explicitly allow all for images just in case
            }
            return Response(content=res.content, media_type=content_type, headers=headers)
            
        except Exception as e:
            print(f"Proxy Error for {url}: {e}")
            raise HTTPException(status_code=502, detail="Failed to fetch external image")
