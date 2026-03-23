import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.core.limiter import limiter
from app.api.api_v1 import api_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Storio Backend API - Personal Folio & Story Collection System",
    version="3.0.0"
)

# 掛載 Rate Limiter（與 search.py 共享同一實例，slowapi 才能正確計數）
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://localhost:3010",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3010",
    "capacitor://localhost",
    "http://capacitor.localhost",
    "capacitor://127.0.0.1",
    os.getenv("DEV_CORS_ORIGIN", ""),  # 區網 IP，於 server/.env 設定 (dev only)
    os.getenv("FRONTEND_URL", ""),     # Production Vercel URL
    "https://storio-2.vercel.app",
]

# Add more origins from env if provided as comma-separated string
extra_origins = os.getenv("CORS_ORIGINS", "")
if extra_origins:
    origins.extend(extra_origins.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in origins if o],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-App-Language", "X-Region"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"status": "online", "system": "Storio Core"}


@app.get("/_debug/ip")
def debug_ip(request: Request):
    """暫時端點：確認 Railway 環境的 IP 偵測（驗證後移除）"""
    from slowapi.util import get_remote_address
    return {
        "detected_ip": get_remote_address(request),
        "client_host": request.client.host if request.client else None,
        "x_forwarded_for": request.headers.get("X-Forwarded-For"),
        "x_real_ip": request.headers.get("X-Real-IP"),
    }
