# Proposal: 人物/類型搜尋擴充（add-person-search）

## Why

使用者看完作品詳情後想找「同導演/同演員/同 Studio/同類型」的其他作品，目前必須跳出 app 去 Google 再回來手動搜尋標題——「探索→典藏」核心迴圈在這裡斷掉。TMDB discover 與 Google Books `inauthor:` 在 API 層完整支援此能力，屬低風險高價值的體驗補全（源自 dogfooding 痛點，設計已核准：`~/.gstack/projects/ziziandydy-storio_2/iTubai-main-design-20260712-103457.md`）。

## What Changes

- 後端 details response 的 cast/directors/genres/production_companies 由字串陣列改為 `{id, name}` 物件陣列（**API contract 變更**，前端同步改；A-1 子方案）。
- 後端新增 `GET /api/v1/search/by` endpoint：person（TMDB discover `with_people`）、company（`with_companies`，schema 新增欄位）、genre（`with_genres`）；書籍作者走 Google Books `inauthor:` 獨立路徑（不經 AI intent parser）。
- 前端 details 頁的演員/導演/Studio/類型變為可點 chips：cast/genres 既有 pill 加 onClick；directors 由純文字重寫為 chip 元素；Studio 由單一顯示擴充為清單。
- 前端搜尋頁新增 `by` 參數結果模式（query-param 驅動，符合靜態 export）；`by` 模式空結果顯示 No Results，不觸發 AI fallback。
- 返回機制：`router.back()`，實作前先於 iOS 模擬器驗證跨頁 back stack；不成立則改用帶 query 的 `router.push` 返回。
- 範圍排除：書籍 genre（BISAC 英文分類）v1 不做；出版社點擊 v1 不做。

## Capabilities

### New Capabilities
- `person-discover-search`: 依人物（演員/導演/作者）、製作公司、影視類型探索作品的搜尋能力——涵蓋 `/search/by` endpoint、details response 攜帶 ID、details 頁 chips 跳轉與返回動線。

### Modified Capabilities
- `search-ui-experience`: 搜尋頁新增 `by` 參數結果模式（chips 跳轉的落點），且此模式空結果不觸發 AI fallback。

## Impact

- **後端**：`server/app/schemas/item.py`（ItemDetailResponse 人物/公司/類型改 `{id,name}`）、`server/app/schemas/search.py`（TMDBDiscoverParams 加 `with_companies`/`with_people`）、`server/app/services/search_service.py`（`_fetch_tmdb_details` 保留 ID、新增 discover-by 查詢）、`server/app/api/v1/endpoints/search.py`（新 route）。
- **前端**：`client/src/components/StoryDetailsView.tsx`（chips 化，三種等級改動）、`client/src/app/search/page.tsx`（`by` 模式）、`client/src/app/details/page.tsx`（返回驗證）。
- **測試**：後端 pytest 需覆蓋新 endpoint 與 schema 變更；CI（backend-tests.yml）需綠。
- **風險**：details response contract 變更需確認既有前端渲染不回歸；`router.back()` 跨頁行為未驗證（有 fallback 方案）。
