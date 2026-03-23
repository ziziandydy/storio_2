## Context

Code Review 揭露數個資安與可靠性問題，影響後端 API 的安全性與營運成本。本次 Security Hardening 以商業損失優先排序，分三波實施：Wave 1 保護 AI API 費用、Wave 2 修復安全基本項、Wave 3 補強可靠性。

目前架構：FastAPI 後端部署於 Railway，前端為 Next.js 部署於 Vercel。所有 AI 搜尋流量均無任何速率限制，外部 API 呼叫（TMDB、Google Books、Gemini）均無 timeout 設定。

## Goals / Non-Goals

**Goals:**
1. 防止 AI API 費用被惡意或意外的大量請求耗盡（Wave 1）
2. 清除 production log 中的敏感資訊洩漏（Wave 2）
3. 防止外部 API hang 導致 request 永久阻塞（Wave 2）
4. 收緊 CORS 設定、確保錯誤訊息不洩漏實作細節（Wave 2）
5. 強化啟動時環境變數驗證與資料格式容錯（Wave 3）

**Non-Goals:**
1. CSP / HSTS：屬 infrastructure 層設定，需 Vercel/Railway 平台配置，非本次範圍
2. `dangerouslySetInnerHTML`：資料來源為靜態 `locales.ts`，非 user input，真實 XSS 風險極低
3. Blocking call in async：需更大架構重構，現階段用戶量不構成問題
4. Cache race condition / N+1 query：待 DB 效能出現瓶頸再處理

## Decisions

### Wave 1 — AI 費用保護（最高優先）

#### 1.1 Search Query 輸入長度限制
- `GET /api/v1/search/` 的 `q` 參數加入 `max_length=200`（FastAPI `Query` 驗證）
- `POST /api/v1/search/ai` 的 `AISearchRequest.query` 加入 `max_length=200`（Pydantic `Field`）
- 超過長度返回 422 Unprocessable Entity（FastAPI 預設行為）

#### 1.2 Rate Limiting（slowapi）
- 依賴：新增 `slowapi` + `limits` 至 `server/requirements.txt`
- 在 `main.py` 初始化 `Limiter`，以 `request.client.host`（IP）為 key
- 限制規則：
  - `GET /api/v1/search/`：**30 req/min** per IP
  - `POST /api/v1/search/ai`：**10 req/min** per IP（AI 端點費用較高）
  - 超過限制返回 **429 Too Many Requests**
- 在 `main.py` 加入全域 `RateLimitExceeded` exception handler，返回統一格式

### Wave 2 — 安全基本項

#### 2.1 清除 debug print 語句
- 掃描所有 `server/app/` Python 檔案，移除 `print()` 語句（共 39 處）
- 最高優先：`server/app/core/supabase.py` 第 15 行 — `print(f"DEBUG: Supabase Client initialized in {mode} mode. Key prefix: {key[:10]}...")` 洩漏 key 片段，**立即移除**
- 如有診斷需求，改用 Python 標準 `logging` 模組（level=DEBUG，production 預設不輸出）

#### 2.2 Exception 訊息不回傳 client
- 後端所有 `except Exception as e: raise HTTPException(detail=str(e))` 模式，改為回傳通用訊息
- 範例：`detail="Internal server error"` 或 `detail="Search service unavailable"`
- 實際錯誤訊息改記錄至 server log

#### 2.3 CORS 明確化
- `main.py` 中 `allow_methods=["*"]` 改為 `["GET", "POST", "PUT", "DELETE", "OPTIONS"]`
- `allow_headers=["*"]` 改為 `["Content-Type", "Authorization", "X-App-Language", "X-Region"]`

#### 2.4 httpx timeout
- 所有 `httpx.AsyncClient()` 加入統一 timeout：
  ```python
  httpx.AsyncClient(timeout=httpx.Timeout(connect=5.0, read=15.0, write=5.0, pool=5.0))
  ```
- 影響端點：所有在 `search.py` 中的 trending / details / search_ai 路由

### Wave 3 — 可靠性改善（可延後至下一 sprint）

#### 3.1 環境變數啟動驗證
- 在 `main.py` 的 lifespan startup 事件中驗證 `TMDB_API_KEY`、`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY` 等必要環境變數
- 若缺少，**立即 raise RuntimeError** 讓服務啟動失敗（快速失敗原則）

#### 3.2 datetime.fromisoformat 容錯
- 找出所有使用 `datetime.fromisoformat()` 的位置，加入 try/except 保護
- 解析失敗時回傳 `None` 或使用預設值，不讓單一錯誤資料格式破壞整個 response

## Risks / Trade-offs

- [Risk] **slowapi 在 Railway 的 proxy 環境下 IP 偵測可能失效** → Mitigation: 確認 Railway 是否正確傳遞 `X-Forwarded-For`，若需要則在 `Limiter` 設定 `key_func` 讀取 header
- [Risk] **httpx timeout 過短影響慢速 API 回應** → Mitigation: connect=5s 防止連線 hang，read=15s 已足夠一般 API；可透過環境變數調整
- [Risk] **移除 print 後喪失現有診斷能力** → Mitigation: 關鍵初始化資訊改用 `logging.info()`，確保有 log 但不洩漏 key
