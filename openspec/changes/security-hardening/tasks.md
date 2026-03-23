## Wave 1 — AI 費用保護（最高優先）

### 1. 依賴安裝

- [x] 1.1 在 `server/requirements.txt` 新增 `slowapi` 與 `limits`

### 2. Search Query 輸入長度限制

- [x] 2.1 在 `server/app/api/v1/endpoints/search.py` 的 `GET /` 端點，將 `q` 的 `Query` 加入 `max_length=200`
- [x] 2.2 在 `server/app/schemas/search.py` 的 `AISearchRequest.query`，加入 `Field(max_length=200)`

### 3. Rate Limiting 實作

- [x] 3.1 在 `server/app/main.py` 初始化 `slowapi.Limiter`（key_func = `get_remote_address`）並掛載至 FastAPI `state`（透過共享 `app/core/limiter.py`）
- [x] 3.2 在 `main.py` 加入全域 `RateLimitExceeded` exception handler，統一返回 `{"detail": "Rate limit exceeded. Please try again later."}`
- [x] 3.3 在 `search.py` 的 `GET /` 路由加入 `@limiter.limit("30/minute")` decorator
- [x] 3.4 在 `search.py` 的 `POST /ai` 路由加入 `@limiter.limit("10/minute")` decorator
- [ ] 3.5 確認 Railway 環境的 `X-Forwarded-For` header 傳遞，確保 IP 偵測正確

---

## Wave 2 — 安全基本項

### 4. 清除 debug print 語句

- [x] 4.1 **最優先**：移除 `server/app/core/supabase.py` 第 15 行洩漏 key 前綴的 `print` 語句，改用 `logging.info()` 只記錄模式名稱（不含 key）
- [x] 4.2 掃描並移除 `server/app/` 所有其他 `print()` 語句（全 app 零殘留）：
  - `server/app/services/search_service.py`（9 處）
  - `server/app/services/gemini_service.py`（11 處）
  - `server/app/services/ai_recommendation_service.py`（6 處）
  - `server/app/services/semantic_search_service.py`（2 處）
  - `server/app/services/trending_service.py`（6 處）
  - `server/app/services/collection_service.py`（5 處）
  - `server/app/repositories/collection_repo.py`（3 處，含完整資料洩漏行直接刪除）
  - `server/app/api/v1/endpoints/user.py`（2 處）
  - `server/app/api/v1/endpoints/proxy.py`（2 處）

### 5. Exception 訊息不回傳 client

- [x] 5.1 審查 `server/app/api/v1/endpoints/` 所有 endpoint，找出 `raise HTTPException(detail=str(e))` 模式
- [x] 5.2 將 `detail=str(e)` 改為通用訊息，並將 `str(e)` 改為 `logging.error()` 記錄（`deps.py`, `user.py` 已修正）

### 6. CORS 設定明確化

- [x] 6.1 在 `server/app/main.py` 將 `allow_methods=["*"]` 改為 `["GET", "POST", "PUT", "DELETE", "OPTIONS"]`
- [x] 6.2 將 `allow_headers=["*"]` 改為 `["Content-Type", "Authorization", "X-App-Language", "X-Region"]`

### 7. httpx Timeout

- [x] 7.1 在 `server/app/api/v1/endpoints/search.py` 所有 `httpx.AsyncClient()` 加入 timeout
- [x] 7.2 掃描其他使用 `httpx.AsyncClient()` 的檔案，加入統一 timeout（`details.py`, `proxy.py`, `search_service.py:search_multi`）

---

## Wave 3 — 可靠性改善（可延後）

### 8. 環境變數啟動驗證

- [ ] 8.1 在 `server/app/main.py` 的 FastAPI lifespan startup event 中新增環境變數檢查邏輯
- [ ] 8.2 必要變數清單：`TMDB_API_KEY`、`SUPABASE_URL`、`SUPABASE_ANON_KEY`；缺少時 raise `RuntimeError`

### 9. datetime 容錯

- [ ] 9.1 搜尋 `server/app/` 中所有 `datetime.fromisoformat()` 呼叫位置
- [ ] 9.2 對每個呼叫加入 `try/except (ValueError, TypeError)` 保護，解析失敗返回 `None`

---

## Wave 4 — 驗證與測試

- [ ] 10.1 撰寫 `server/tests/test_rate_limiting.py`：驗證 AI 端點 10/min 限制、一般搜尋 30/min 限制
- [x] 10.2 撰寫測試驗證超長 query（>200 字元）被正確拒絕（422）
- [x] 10.3 確認 `server/app/core/supabase.py` 啟動後 log 不含任何 key 字串
- [x] 10.4 確認所有 HTTP 端點的 exception handler 不在 response 中洩漏原始錯誤訊息
