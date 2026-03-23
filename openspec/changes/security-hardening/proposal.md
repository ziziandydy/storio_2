## Why

Code Review 揭露數個資安與可靠性問題。其中最具商業影響的是：AI API（Gemini/OpenAI）完全沒有速率限制與輸入長度上限，任何人可以透過超長查詢或大量請求直接燒掉 API 費用。其次是後端 debug print 語句在 production log 中洩漏 API key 片段，以及外部 API 呼叫無 timeout 導致 request 永久 hang。

部分 Finding 已失效（#2 hardcoded IP 已於上次重構修復），部分屬於現階段可接受的 tech debt（CSP/HSTS 等 infrastructure 層設定）。

## What Changes

**Wave 1 — 商業價值優先（AI 費用保護）**：
- Search query 加入 `max_length=200` 限制，防止超長字串耗費 AI API
- 後端加入 Rate Limiting（`slowapi`），每個 IP 搜尋限制 30 req/min，AI 端點限 10 req/min

**Wave 2 — 安全基本項**：
- 清除所有 `print()` debug 語句（39 處），特別是 supabase.py 中洩漏 key 片段的那行
- Exception 訊息不回傳 client，改回傳通用錯誤碼
- CORS `allow_methods` / `allow_headers` 從 `["*"]` 改為明確清單
- 所有 `httpx.AsyncClient()` 加入 timeout（connect=5s, read=15s）

**Wave 3 — 可靠性改善（可延後）**：
- 啟動時驗證必要環境變數（TMDB_API_KEY、SUPABASE_URL 等）
- `datetime.fromisoformat` 加 try/except 保護

**不列入本次範圍**：
- `dangerouslySetInnerHTML`：資料來源為靜態 locales.ts，非 user input，真實 XSS 風險極低，列為 tech debt
- CSP / HSTS：Infrastructure 層設定，需 Vercel/Railway 平台配置，非 code level 修改
- Blocking call in async（#9）：需更大架構重構，現階段用戶量不構成問題
- Cache race condition（#11）：現階段用戶量不構成問題
- N+1 query（#21）：待 DB 效能出現瓶頸再處理

## Capabilities

### New Capabilities

- `api-rate-limiting`: 後端 Rate Limiting 機制，使用 slowapi 保護 AI 端點與搜尋端點

### Modified Capabilities

- `basic-search`: Search query 加入 max_length 輸入驗證
- `ai-search-engine`: AI 搜尋端點加入 rate limiting 與 timeout 保護

## Impact

- **後端新增依賴**: `slowapi`, `limits`
- **修改檔案**: `server/app/main.py`, `server/app/api/v1/endpoints/search.py`, `server/app/core/supabase.py`, `server/app/api/deps.py`, `server/app/services/search_service.py`（及相關 service 檔案）
- **無前端變動**（除移除 dangerouslySetInnerHTML 外均為後端）
- **無資料庫 Schema 變動**
