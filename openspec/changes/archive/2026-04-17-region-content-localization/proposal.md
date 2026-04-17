## Why

後端所有 TMDB 與 AI 推薦的 `region` 參數全部寫死為 `"TW"`，前端 `settingsStore` 的 `region` 欄位從未傳至後端，也沒有 UI 讓用戶設定地區。Storio 用戶分佈於台灣、香港、加拿大、新加坡、美國等地，應依用戶所在地區動態提供 trending 與內容推薦，而非一律回傳台灣資料。

## What Changes

- 新增 `client/src/utils/detectRegion.ts`：從裝置 locale 自動推導 ISO 3166-1 region code
- 修改 `client/src/store/settingsStore.ts`：`region` 改為 lazy init（detectRegion()）
- 修改 `client/src/app/profile/page.tsx`：新增 Region 設定 sub-view（20 個精選地區）
- 修改 `client/src/i18n/locales.ts`：新增 Region 設定相關 i18n 字串
- 修改前端所有 API 呼叫：加入 `X-Region` header
- 修改 `server/app/api/deps.py`：新增 `get_region()` dependency（讀 `X-Region` header）
- 修改 `server/app/api/v1/endpoints/search.py`：trending / search / ai 路由加入 region
- 修改 `server/app/services/search_service.py`：拆除所有寫死 `"TW"` 改為動態參數
- 修改 `server/app/services/ai_recommendation_service.py`：Gemini prompt + cache key 加入 region
- 修改 `server/app/services/semantic_search_service.py`：AI 搜尋 system prompt 加入 language + region
- 修改 `server/app/services/trending_service.py`：cache key 加入 region

## Capabilities

### New Capabilities

- `region-settings-ui`：Profile 設定頁新增 Region 選擇器，支援 20 個精選地區，初始值從裝置 locale 自動偵測
- `region-aware-content`：前後端 region 動態化——前端傳 `X-Region` header，後端依 region 決定 TMDB trending 地區、AI 書單市場、AI 搜尋上下文

### Modified Capabilities

（無既有 spec 層級的行為變更）

## Impact

- **前端**：`settingsStore.ts`、`profile/page.tsx`、`search/page.tsx`、`locales.ts`
- **後端**：`deps.py`、`search.py`、`search_service.py`、`ai_recommendation_service.py`、`semantic_search_service.py`、`trending_service.py`
- **快取影響**：`trending_service.py` cache key 加入 region，原有 `"TW"` 快取仍有效（key 為 `movie_zh-TW_TW`）
- **不影響**：auth 流程、collection、details（已有 region query param）、分享功能
