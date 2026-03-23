# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修補後端三類資安問題：AI API 費用保護（Rate Limiting + 輸入驗證）、敏感資訊洩漏（print 清除 + exception 安全）、可靠性強化（httpx timeout + CORS 明確化）。

**Architecture:** 純後端修改，三層架構不變。Wave 1 新增 `slowapi` 中介層並從共享模組 `app/core/limiter.py` 取得同一個 Limiter 實例；Wave 2 系統性清除所有 `print()` 語句並加入 `logging`，同時在 endpoint 層封裝 exception；httpx timeout 補強所有使用 `AsyncClient()` 的端點。

**Tech Stack:** FastAPI, slowapi==0.1.9, limits==3.13.0, httpx, Python logging, Pydantic Field validation

---

## 檔案影響清單

| 操作 | 路徑 | 說明 |
|------|------|------|
| **新增** | `server/app/core/limiter.py` | 共享 Limiter 實例（slowapi） |
| 修改 | `server/requirements.txt` | 新增 `slowapi`, `limits` |
| 修改 | `server/app/main.py` | 掛載 limiter、exception handler、CORS 收緊 |
| 修改 | `server/app/api/v1/endpoints/search.py` | Rate limit decorator、query max_length、httpx timeout |
| 修改 | `server/app/api/v1/endpoints/details.py` | httpx timeout |
| 修改 | `server/app/api/v1/endpoints/proxy.py` | 移除 print（2 處）、httpx timeout |
| 修改 | `server/app/api/v1/endpoints/user.py` | 移除 print（2 處） |
| 修改 | `server/app/schemas/search.py` | AISearchRequest.query 加 max_length |
| 修改 | `server/app/core/supabase.py` | 移除 key 洩漏 print，改用 logging |
| 修改 | `server/app/api/deps.py` | Exception 訊息不洩漏 str(e)，加 logging |
| 修改 | `server/app/services/search_service.py` | 移除 print（9 處），加 logging；search_multi httpx timeout |
| 修改 | `server/app/services/gemini_service.py` | 移除 print（11 處），加 logging |
| 修改 | `server/app/services/ai_recommendation_service.py` | 移除 print（6 處），加 logging |
| 修改 | `server/app/services/semantic_search_service.py` | 移除 print（2 處），加 logging |
| 修改 | `server/app/services/trending_service.py` | 移除 print（6 處），加 logging |
| 修改 | `server/app/services/collection_service.py` | 移除 print（5 處），加 logging |
| 修改 | `server/app/repositories/collection_repo.py` | 移除 print（3 處），加 logging |
| 新增 | `server/tests/test_security.py` | Rate limit 與輸入驗證、key 洩漏、exception 安全測試 |

---

## Task 1：安裝依賴 + 輸入長度驗證（Wave 1 基礎）

**Files:**
- Modify: `server/requirements.txt`
- Modify: `server/app/schemas/search.py`
- Modify: `server/app/api/v1/endpoints/search.py:52-62`
- Create: `server/tests/test_security.py`

- [ ] **Step 1: 撰寫失敗測試（輸入長度）**

新增 `server/tests/test_security.py`：

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_search_query_too_long_returns_422():
    """超過 200 字元的查詢應被拒絕"""
    long_query = "a" * 201
    response = client.get(f"/api/v1/search/?q={long_query}")
    assert response.status_code == 422

def test_search_query_max_length_accepted():
    """恰好 200 字元的查詢應通過驗證（回傳任何非 422 狀態）"""
    query = "a" * 200
    response = client.get(f"/api/v1/search/?q={query}")
    assert response.status_code != 422

def test_ai_search_query_too_long_returns_422():
    """AI 搜尋超過 200 字元的查詢應被拒絕"""
    response = client.post("/api/v1/search/ai", json={
        "query": "a" * 201,
        "media_type": "movie"
    })
    assert response.status_code == 422
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd /Users/iTubai/Sites/storio_2/server
python -m pytest tests/test_security.py::test_search_query_too_long_returns_422 -v
```
預期：FAIL（目前沒有 max_length 限制）

- [ ] **Step 3: 新增 slowapi 依賴**

在 `server/requirements.txt` 按字母順序加入（在 `selenium` 前後）：

```
slowapi==0.1.9
limits==3.13.0
```

- [ ] **Step 4: 在 search.py 加入 max_length**

修改 `server/app/api/v1/endpoints/search.py` 第 52-62 行的 `search` 函式簽名：

```python
@router.get("/", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, max_length=200, description="Search query for movies or books"),
    page: int = 1,
    language: str = Depends(get_language)
):
```

- [ ] **Step 5: 在 AISearchRequest schema 加入 max_length**

修改 `server/app/schemas/search.py` 第 4-6 行：

```python
class AISearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=200)
    media_type: Optional[str] = Field(default="movie", pattern="^(movie|book|tv|all)$")
```

- [ ] **Step 6: 執行測試確認通過**

```bash
cd /Users/iTubai/Sites/storio_2/server
python -m pytest tests/test_security.py -v
```
預期：三個輸入長度測試全數 PASS

- [ ] **Step 7: Commit**

```bash
cd /Users/iTubai/Sites/storio_2
git add server/requirements.txt server/app/schemas/search.py server/app/api/v1/endpoints/search.py server/tests/test_security.py
git commit -m "feat(security): add input length validation for search queries (max 200 chars)"
```

---

## Task 2：建立共享 Limiter + Rate Limiting（Wave 1 核心）

**Files:**
- Create: `server/app/core/limiter.py`
- Modify: `server/app/main.py`
- Modify: `server/app/api/v1/endpoints/search.py`

> **關鍵設計**：slowapi 的 `@limiter.limit` decorator 必須與 `app.state.limiter` 是**同一個物件**才能正確計數。因此建立 `app/core/limiter.py` 作為單一來源，main.py 和 search.py 都從此處 import。

- [ ] **Step 1: 建立共享 limiter 模組**

新增 `server/app/core/limiter.py`：

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
```

- [ ] **Step 2: 更新 main.py 掛載 limiter 並收緊 CORS**

完整替換 `server/app/main.py`：

```python
import os
import logging
from fastapi import FastAPI
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

# 掛載 Rate Limiter（與 search.py 共享同一實例）
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
    os.getenv("DEV_CORS_ORIGIN", ""),
    os.getenv("FRONTEND_URL", ""),
    "https://storio-2.vercel.app",
]

extra_origins = os.getenv("CORS_ORIGINS", "")
if extra_origins:
    origins.extend(extra_origins.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in origins if o],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-App-Language", "X-Region"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"status": "online", "system": "Storio Core"}
```

- [ ] **Step 3: 更新 search.py — 加入 limiter decorator、httpx timeout**

完整替換 `server/app/api/v1/endpoints/search.py`：

```python
from typing import List
import httpx
from fastapi import APIRouter, Query, HTTPException, Depends, Request
from app.schemas.item import SearchResponse, StoryBase, ItemDetailResponse
from app.schemas.search import AISearchRequest
from app.services.search_service import SearchService
from app.services.semantic_search_service import SemanticSearchService
from app.api.deps import get_language
from app.core.limiter import limiter

router = APIRouter()

# 統一 timeout 設定：connect=5s 防連線 hang，read=15s 允許慢速 API
HTTPX_TIMEOUT = httpx.Timeout(connect=5.0, read=15.0, write=5.0, pool=5.0)


@router.get("/trending/movies", response_model=List[StoryBase])
async def trending_movies(language: str = Depends(get_language)):
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
        return await SearchService.get_trending_movies(client, language)


@router.get("/trending/series", response_model=List[StoryBase])
async def trending_series(language: str = Depends(get_language)):
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
        return await SearchService.get_trending_series(client, language)


@router.get("/trending/books", response_model=List[StoryBase])
async def trending_books(language: str = Depends(get_language)):
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
        return await SearchService.get_trending_books(client, language)


@router.get("/details/{media_type}/{external_id}", response_model=ItemDetailResponse)
async def get_details(
    media_type: str,
    external_id: str,
    language: str = Depends(get_language),
    region: str = Query("TW", description="ISO 3166-1 region code for streaming providers")
):
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
        details = await SearchService.get_item_details(client, media_type, external_id, language, region)
        if not details:
            raise HTTPException(status_code=404, detail="Item details not found")
        return details


@router.get("/", response_model=SearchResponse)
@limiter.limit("30/minute")
async def search(
    request: Request,
    q: str = Query(..., min_length=1, max_length=200, description="Search query for movies or books"),
    page: int = 1,
    language: str = Depends(get_language)
):
    results = await SearchService.search_multi(query=q, language=language)
    return SearchResponse(results=results, page=page, total_results=len(results))


@router.post("/ai", response_model=SearchResponse)
@limiter.limit("10/minute")
async def search_ai(
    request: Request,
    body: AISearchRequest,
    page: int = 1,
    language: str = Depends(get_language)
):
    intent = await SemanticSearchService.parse_intent(body.query, body.media_type)
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
        results = await SearchService.search_by_intent(client, intent, language)
    return SearchResponse(results=results, page=1, total_results=len(results))
```

> **注意**：`@limiter.limit` 要求 route function 的第一個參數必須是 `request: Request`，這已在上面的簽名中正確設置。

- [ ] **Step 4: 更新 details.py — 加入 httpx timeout**

完整替換 `server/app/api/v1/endpoints/details.py`：

```python
from fastapi import APIRouter, HTTPException, Depends
import httpx
from app.schemas.item import ItemDetailResponse
from app.services.search_service import SearchService
from app.api.deps import get_language

router = APIRouter()

HTTPX_TIMEOUT = httpx.Timeout(connect=5.0, read=15.0, write=5.0, pool=5.0)


@router.get("/{media_type}/{external_id}", response_model=ItemDetailResponse)
async def get_details(media_type: str, external_id: str, language: str = Depends(get_language)):
    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
        details = await SearchService.get_item_details(client, media_type, external_id, language)
        if not details:
            raise HTTPException(status_code=404, detail="Item details not found")
        return details
```

- [ ] **Step 5: 安裝依賴並執行測試**

```bash
cd /Users/iTubai/Sites/storio_2/server
pip install slowapi limits
python -m pytest tests/test_security.py -v
```
預期：所有輸入長度測試 PASS

- [ ] **Step 6: 手動驗證 Rate Limit**

```bash
cd /Users/iTubai/Sites/storio_2/server
uvicorn app.main:app --reload --port 8001 &
# 另開 terminal（需等服務啟動）：
for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8001/api/v1/search/ai -H "Content-Type: application/json" -d '{"query":"test","media_type":"movie"}'; done
# 預期輸出：前 10 次非 429，第 11 次起出現 429
```

- [ ] **Step 7: Commit**

```bash
cd /Users/iTubai/Sites/storio_2
git add server/app/core/limiter.py server/app/main.py server/app/api/v1/endpoints/search.py server/app/api/v1/endpoints/details.py
git commit -m "feat(security): add rate limiting (30/min search, 10/min AI) via shared limiter + httpx timeout"
```

---

## Task 3：清除 supabase.py Key 洩漏（Wave 2 最高優先）

**Files:**
- Modify: `server/app/core/supabase.py`

- [ ] **Step 1: 撰寫失敗測試（用 capsys 捕捉 stdout）**

在 `server/tests/test_security.py` 新增：

```python
import unittest.mock as mock

def test_supabase_client_does_not_print_key(capsys):
    """supabase client 初始化不應在 stdout 輸出任何 key 相關字串"""
    with mock.patch('app.core.supabase.create_client', return_value=mock.MagicMock()):
        # 重新 import 以觸發初始化邏輯（若需要）
        from app.core import supabase as supabase_module
        supabase_module.get_supabase_client()

    captured = capsys.readouterr()
    assert "Key prefix" not in captured.out
    assert "key[:10]" not in captured.out
    # 更廣泛：確認沒有任何非空 stdout（函式不應 print 任何東西）
    assert captured.out == "", f"Unexpected stdout: {captured.out!r}"
```

- [ ] **Step 2: 執行確認測試失敗**

```bash
cd /Users/iTubai/Sites/storio_2/server
python -m pytest tests/test_security.py::test_supabase_client_does_not_print_key -v
```
預期：FAIL（`captured.out` 包含 "DEBUG: Supabase Client initialized..." 字串）

- [ ] **Step 3: 修改 supabase.py**

完整替換 `server/app/core/supabase.py`：

```python
import logging
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)


def get_supabase_client() -> Client:
    key = settings.SUPABASE_ANON_KEY
    mode = "ANON"

    if settings.SUPABASE_SERVICE_ROLE_KEY and settings.SUPABASE_SERVICE_ROLE_KEY != "YOUR_SUPABASE_SERVICE_ROLE_KEY":
        key = settings.SUPABASE_SERVICE_ROLE_KEY
        mode = "SERVICE_ROLE"

    logger.info("Supabase Client initialized in %s mode", mode)

    if not settings.SUPABASE_URL or not key:
        raise ValueError("Supabase URL and Key must be set in .env")

    return create_client(settings.SUPABASE_URL, key)
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd /Users/iTubai/Sites/storio_2/server
python -m pytest tests/test_security.py::test_supabase_client_does_not_print_key -v
```
預期：PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/iTubai/Sites/storio_2
git add server/app/core/supabase.py server/tests/test_security.py
git commit -m "fix(security): remove API key prefix leak from supabase client initialization"
```

---

## Task 4：清除 search_service.py 的 print + search_multi timeout（Wave 2）

**Files:**
- Modify: `server/app/services/search_service.py`

**print 位置（共 9 處）：**
- Line 245: `print(f"TMDB Detail Error: {e}")`
- Line 350: `print(f"Google Books Detail Error: {e}")`
- Line 387: `print(f"TMDB Trending {media_type} Error: {e}")`
- Line 435: `print(f"Google Books Trending Error: {e}")`
- Line 462: `print(f"Error fetching cover for {title}: {e}")`
- Line 511: `print(f"TMDB Search Error: {e}")`
- Line 539: `print(f"Google Books Error: {e}")`
- Line 609: `print(f"TMDB Discover Error: {e}")`
- Line 638: `print(f"Google Books Discover Error: {e}")`

**另需處理：`search_multi`（line 544）的 `httpx.AsyncClient()` 缺少 timeout。**

- [ ] **Step 1: 在檔案頂部加入 logging**

在 `search_service.py` 的 `import httpx` 後加入：
```python
import logging
logger = logging.getLogger(__name__)
```

並在 class 定義前加入 timeout 常數：
```python
_HTTPX_TIMEOUT = httpx.Timeout(connect=5.0, read=15.0, write=5.0, pool=5.0)
```

- [ ] **Step 2: 替換所有 print 為 logger.error**

替換對應表：
- `print(f"TMDB Detail Error: {e}")` → `logger.error("TMDB detail fetch failed: %s", e)`
- `print(f"Google Books Detail Error: {e}")` → `logger.error("Google Books detail fetch failed: %s", e)`
- `print(f"TMDB Trending {media_type} Error: {e}")` → `logger.error("TMDB trending %s fetch failed: %s", media_type, e)`
- `print(f"Google Books Trending Error: {e}")` → `logger.error("Google Books trending fetch failed: %s", e)`
- `print(f"Error fetching cover for {title}: {e}")` → `logger.error("Cover fetch failed for '%s': %s", title, e)`
- `print(f"TMDB Search Error: {e}")` → `logger.error("TMDB search failed: %s", e)`
- `print(f"Google Books Error: {e}")` → `logger.error("Google Books search failed: %s", e)`
- `print(f"TMDB Discover Error: {e}")` → `logger.error("TMDB discover failed: %s", e)`
- `print(f"Google Books Discover Error: {e}")` → `logger.error("Google Books discover failed: %s", e)`

- [ ] **Step 3: 更新 search_multi 的 httpx.AsyncClient**

將 `search_multi`（約 line 544）中：
```python
async with httpx.AsyncClient() as client:
```
改為：
```python
async with httpx.AsyncClient(timeout=_HTTPX_TIMEOUT) as client:
```

- [ ] **Step 4: 執行現有 search 測試確認未破壞**

```bash
cd /Users/iTubai/Sites/storio_2/server
python -m pytest tests/test_search.py -v
```
預期：全數 PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/iTubai/Sites/storio_2
git add server/app/services/search_service.py
git commit -m "fix(security): replace print statements with logging in search_service + add httpx timeout"
```

---

## Task 5：清除 AI Services 的 print（Wave 2）

**Files:**
- Modify: `server/app/services/gemini_service.py`
- Modify: `server/app/services/ai_recommendation_service.py`
- Modify: `server/app/services/semantic_search_service.py`

### gemini_service.py（11 處）

| Line | 原 print | 替換為 |
|------|----------|--------|
| 25 | `print("DEBUG: Falling back to OpenAI...")` | `logger.debug("Gemini unavailable, falling back to OpenAI")` |
| 37 | `print(f"OpenAI Fallback Error: {e}")` | `logger.error("OpenAI fallback failed: %s", e)` |
| 47 | `print(f"DEBUG: Returning cached Gemini book recommendations for {language}")` | `logger.debug("Returning cached book recommendations for %s", language)` |
| 51 | `print("Gemini API Key missing")` | `logger.warning("GEMINI_API_KEY not configured, skipping Gemini")` |
| 54 | `print(f"DEBUG: Fetching new book recommendations from Gemini for {language}...")` | `logger.debug("Fetching new book recommendations from Gemini for %s", language)` |
| 91 | `print(f"Gemini Recommendation Error: {e}")` | `logger.error("Gemini recommendation failed: %s", e)` |
| 139 | `print(f"Gemini Suggestion Error: {e}")` | `logger.error("Gemini suggestion generation failed: %s", e)` |
| 155 | `print(f"OpenAI Suggestion Fallback Error: {e}")` | `logger.error("OpenAI suggestion fallback failed: %s", e)` |
| 195 | `print(f"Gemini Refine Error: {e}")` | `logger.error("Gemini refine failed: %s", e)` |
| 199 | `print(f"Gemini Refine Error: {e}")` | `logger.error("Gemini refine failed (second handler): %s", e)` |
| 209 | `print(f"OpenAI Refine Error: {openai_error}")` | `logger.error("OpenAI refine fallback failed: %s", openai_error)` |

> **注意**：`gemini_service.py:194-199` 有兩個嵌套的 `except Exception` 在同一 try 區塊（現有 bug），替換 print 時請勿改動這段邏輯結構。

### ai_recommendation_service.py（6 處）

| Line | 原 print | 替換為 |
|------|----------|--------|
| 24 | `print(f"DEBUG: Returning L1 cached recommendations for {language}")` | `logger.debug("Returning L1 cached recommendations for %s", language)` |
| 41 | `print(f"DB Cache Read Error: {e}")` | `logger.error("DB cache read failed for recommendations: %s", e)` |
| 51 | `print(f"DEBUG: Attempting Gemini Recommendation for {language}...")` | `logger.debug("Cache miss, fetching recommendations from Gemini for %s", language)` |
| 66 | `print(f"DB Cache Write Error: {e}")` | `logger.error("DB cache write failed for recommendations: %s", e)` |
| 109 | `print(f"Gemini Rec Error: {e}")` | `logger.error("Gemini recommendation fetch failed: %s", e)` |
| 140 | `print(f"OpenAI Rec Error: {e}")` | `logger.error("OpenAI recommendation fetch failed: %s", e)` |

### semantic_search_service.py（2 處）

| Line | 原 print | 替換為 |
|------|----------|--------|
| 65 | `print(f"Gemini Intent Parsing Error: {e}")` | `logger.error("Gemini intent parsing failed: %s", e)` |
| 87 | `print(f"OpenAI Intent Parsing Fallback Error: {e}")` | `logger.error("OpenAI intent parsing fallback failed: %s", e)` |

- [ ] **Step 1: 在各檔案頂部加入 logging（3 個檔案各自操作）**

```python
import logging
logger = logging.getLogger(__name__)
```

- [ ] **Step 2: 替換 gemini_service.py（按表格逐一替換）**

- [ ] **Step 3: 替換 ai_recommendation_service.py**

- [ ] **Step 4: 替換 semantic_search_service.py**

- [ ] **Step 5: 執行掃描確認三個檔案無殘留 print**

```bash
grep -n "print(" server/app/services/gemini_service.py server/app/services/ai_recommendation_service.py server/app/services/semantic_search_service.py
```
預期：無輸出

- [ ] **Step 6: Commit**

```bash
cd /Users/iTubai/Sites/storio_2
git add server/app/services/gemini_service.py server/app/services/ai_recommendation_service.py server/app/services/semantic_search_service.py
git commit -m "fix(security): replace print statements with logging in AI services"
```

---

## Task 6：清除其他檔案的 print（Wave 2）

**Files:**
- Modify: `server/app/services/trending_service.py`（6 處）
- Modify: `server/app/services/collection_service.py`（5 處）
- Modify: `server/app/repositories/collection_repo.py`（3 處）
- Modify: `server/app/api/v1/endpoints/user.py`（2 處）
- Modify: `server/app/api/v1/endpoints/proxy.py`（2 處 + httpx timeout）

### trending_service.py（6 處）

| Line | 原 print | 替換為 |
|------|----------|--------|
| 28 | `print(f"DEBUG: Returning L1 Memory Cache for {lang_type_key}")` | `logger.debug("Returning L1 memory cache for %s", lang_type_key)` |
| 42 | `print(f"DB Read Error for {lang_type_key}: {e}")` | `logger.error("DB cache read failed for %s: %s", lang_type_key, e)` |
| 48 | `print(f"DEBUG: Returning L2 DB Cache for {lang_type_key}")` | `logger.debug("Returning L2 DB cache for %s", lang_type_key)` |
| 56 | `print(f"DEBUG: Cache Miss for {lang_type_key}. Fetching from Source API...")` | `logger.debug("Cache miss for %s, fetching from source API", lang_type_key)` |
| 76 | `print(f"DEBUG: Persisted {lang_type_key} to DB")` | `logger.debug("Persisted %s to DB cache", lang_type_key)` |
| 78 | `print(f"DB Write Error for {lang_type_key}: {e}")` | `logger.error("DB cache write failed for %s: %s", lang_type_key, e)` |

### collection_service.py（5 處，全在 get_collection_item）

| Line | 原 print | 替換為 |
|------|----------|--------|
| 28 | `print(f"DEBUG: Fetching item {story_id} for user {user_id}")` | `logger.debug("Fetching item %s for user %s", story_id, user_id)` |
| 33 | `print(f"DEBUG: Found story {story.title} ({story.external_id})")` | `logger.debug("Found story '%s' (%s)", story.title, story.external_id)` |
| 38 | `print(f"DEBUG: Found {len(instances_data)} instances")` | `logger.debug("Found %d instances for story %s", len(instances_data), story_id)` |
| 64 | `print("DEBUG: Related instances processed")` | `logger.debug("Related instances processed for story %s", story_id)` |
| 67 | `print(f"DEBUG: Error processing instances: {e}")` | `logger.error("Error processing instances for story %s: %s", story_id, e)` |

### collection_repo.py（3 處）

> ⚠️ **高風險**：Line 61 `print(f"DEBUG: Inserting data for user {user_id}: {data}")` 洩漏完整的使用者資料（包含 JWT/token 相關欄位），**必須移除，不轉為 logging**。

| Line | 原 print | 替換為 |
|------|----------|--------|
| 61 | `print(f"DEBUG: Inserting data for user {user_id}: {data}")` | **直接刪除此行**（完整資料不應記錄） |
| 65 | `print(f"DEBUG: Insert response: {response}")` | `logger.debug("Story inserted successfully for user %s", user_id)` |
| 73 | `print(f"Create Story Error: {e}")` | `logger.error("Failed to create story for user %s: %s", user_id, e)` |

### user.py（2 處）

| Line | 原 print | 替換為 |
|------|----------|--------|
| 31 | `print(f"Error deleting user account: {e}")` | `logger.error("Failed to delete user account: %s", e)` |
| 47 | `print(f"Error clearing user data: {e}")` | `logger.error("Failed to clear user data: %s", e)` |

### proxy.py（2 處 + httpx timeout）

完整替換 `server/app/api/v1/endpoints/proxy.py`：

```python
import logging
from fastapi import APIRouter, HTTPException, Query, Request, Response
import httpx

router = APIRouter()
logger = logging.getLogger(__name__)

HTTPX_TIMEOUT = httpx.Timeout(connect=5.0, read=15.0, write=5.0, pool=5.0)


@router.get("/image")
async def proxy_image(request: Request, url: str = Query(..., description="The URL of the image to proxy")):
    """
    Proxies an image request to bypass CORS restrictions for the frontend Canvas.
    CORS headers are handled entirely by the global CORSMiddleware in main.py.
    """
    if not url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid URL protocol")

    async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
        try:
            res = await client.get(url, follow_redirects=True)
            res.raise_for_status()

            content_type = res.headers.get("content-type", "image/jpeg")

            headers = {
                "Cache-Control": "public, max-age=86400",
            }
            return Response(content=res.content, media_type=content_type, headers=headers)

        except Exception as e:
            logger.error("Proxy image fetch failed for %s: %s", url[:60], e)
            raise HTTPException(status_code=502, detail="Failed to fetch external image")
```

- [ ] **Step 1: 替換 trending_service.py（加 logging，按表格替換）**
- [ ] **Step 2: 替換 collection_service.py（加 logging，按表格替換）**
- [ ] **Step 3: 替換 collection_repo.py（加 logging，刪除 line 61，替換其他兩處）**
- [ ] **Step 4: 替換 user.py（加 logging，按表格替換）**
- [ ] **Step 5: 替換 proxy.py（使用上方完整版本）**

- [ ] **Step 6: 執行掃描確認全局無殘留 print**

```bash
cd /Users/iTubai/Sites/storio_2/server
grep -rn "print(" app/ --include="*.py"
```
預期：**零輸出**

- [ ] **Step 7: Commit**

```bash
cd /Users/iTubai/Sites/storio_2
git add server/app/services/trending_service.py server/app/services/collection_service.py server/app/repositories/collection_repo.py server/app/api/v1/endpoints/user.py server/app/api/v1/endpoints/proxy.py
git commit -m "fix(security): remove all remaining print statements across services and endpoints"
```

---

## Task 7：修補 Exception 洩漏（Wave 2）

**Files:**
- Modify: `server/app/api/deps.py`

**問題**：`deps.py:44` 的 `detail=f"Could not validate credentials: {str(e)}"` 將 Supabase 內部錯誤訊息回傳給 client。

- [ ] **Step 1: 撰寫失敗測試**

在 `server/tests/test_security.py` 新增：

```python
def test_invalid_token_returns_generic_message():
    """無效 token 應返回通用訊息，不洩漏內部錯誤詳情"""
    response = client.get("/api/v1/collection/", headers={
        "Authorization": "Bearer invalid.token.here"
    })
    assert response.status_code == 401
    detail = response.json().get("detail", "")
    # 不應包含 "Could not validate credentials:" 加上內部錯誤訊息
    assert detail == "Invalid authentication credentials", \
        f"Unexpected detail leaked: {detail!r}"
```

- [ ] **Step 2: 執行確認測試失敗**

```bash
cd /Users/iTubai/Sites/storio_2/server
python -m pytest tests/test_security.py::test_invalid_token_returns_generic_message -v
```
預期：FAIL（目前返回 `"Could not validate credentials: ..."` 格式）

- [ ] **Step 3: 修改 deps.py**

在 `server/app/api/deps.py` 頂部加入：
```python
import logging
logger = logging.getLogger(__name__)
```

將第 41-46 行：
```python
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
```

改為：
```python
    except Exception as e:
        logger.error("Token validation failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd /Users/iTubai/Sites/storio_2/server
python -m pytest tests/test_security.py::test_invalid_token_returns_generic_message -v
```
預期：PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/iTubai/Sites/storio_2
git add server/app/api/deps.py server/tests/test_security.py
git commit -m "fix(security): prevent internal exception details from leaking to API clients"
```

---

## Task 8：全面驗證

- [ ] **Step 1: 掃描確認無殘留 print**

```bash
cd /Users/iTubai/Sites/storio_2/server
grep -rn "print(" app/ --include="*.py"
```
預期：**零輸出**

- [ ] **Step 2: 確認 CORS 已收緊**

```bash
grep -A3 "allow_methods" server/app/main.py
```
預期：看到 `["GET", "POST", "PUT", "DELETE", "OPTIONS"]` 而非 `["*"]`

- [ ] **Step 3: 執行全部測試套件**

```bash
cd /Users/iTubai/Sites/storio_2/server
python -m pytest tests/ -v --ignore=tests/test_ai_search.py -x
```
預期：全數 PASS，無 FAIL

- [ ] **Step 4: 執行安全測試套件**

```bash
cd /Users/iTubai/Sites/storio_2/server
python -m pytest tests/test_security.py -v
```
預期：全數 PASS

---

## Wave 3（可延後）

以下任務可在獨立 sprint 中實作，不阻塞 Wave 1/2 上線：

- **環境變數啟動驗證**：在 `main.py` 的 lifespan startup 事件中加入 `TMDB_API_KEY`、`SUPABASE_URL` 等必要變數的存在性檢查，缺少時 raise `RuntimeError`
- **datetime 容錯**：`collection_repo.py:109` 的 `datetime.fromisoformat()` 缺少 try/except，當 `created_at` 格式異常時會拋出 `ValueError`；搜尋全局其他同類呼叫並補強保護
