from fastapi import APIRouter, HTTPException, Query, Request, Response
import httpx

router = APIRouter()

@router.get("/image")
async def proxy_image(request: Request, url: str = Query(..., description="The URL of the image to proxy")):
    """
    Proxies an image request to bypass CORS restrictions for the frontend Canvas.
    CORS headers are handled entirely by the global CORSMiddleware in main.py.
    """
    if not url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid URL protocol")

    origin = request.headers.get("origin", "none")
    print(f"[ProxyDebug] Request origin: {origin}, url: {url[:60]}")

    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(url, follow_redirects=True)
            res.raise_for_status()

            content_type = res.headers.get("content-type", "image/jpeg")

            # CORS is handled by CORSMiddleware — do NOT set Access-Control-Allow-Origin here.
            # Mixing manual "*" with CORSMiddleware's credential-aware origin mapping
            # violates the W3C spec and causes Safari to reject the response.
            headers = {
                "Cache-Control": "public, max-age=86400",
            }
            return Response(content=res.content, media_type=content_type, headers=headers)

        except Exception as e:
            print(f"[ProxyDebug] Proxy Error for {url[:60]}: {e}")
            raise HTTPException(status_code=502, detail="Failed to fetch external image")
