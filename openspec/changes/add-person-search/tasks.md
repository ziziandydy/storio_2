## 1. 前置驗證（先消風險再蓋 UI）

- [ ] 1.1 iOS 模擬器驗證 `router.back()` 跨頁 back stack：details → search → back 是否正確回到原 details（scroll/狀態）；記錄結論，不通過則後續採 `router.push` 帶來源參數返回（D5）

## 2. 後端：schema 與 refs（TDD）

- [ ] 2.1 撰寫 `ItemDetailResponse` refs 欄位測試：details 回傳含 `cast_refs`/`director_refs`/`genre_refs`/`company_refs`（`{id,name}`），且既有字串欄位內容不變
- [ ] 2.2 `server/app/schemas/item.py` 新增 `EntityRef` model 與四個 `*_refs` 欄位（additive，預設空陣列）
- [ ] 2.3 `_fetch_tmdb_details` 保留 TMDB ID：組 cast/directors/genres/production_companies 時同步填入 `*_refs`（directors 含 TV created_by）
- [ ] 2.4 跑測試綠 + 確認書籍 details 不受影響（authors 維持字串陣列）

## 3. 後端：/search/by endpoint（TDD）

- [ ] 3.1 `server/app/schemas/search.py`：`TMDBDiscoverParams` 新增 `with_people`、`with_companies` 欄位
- [ ] 3.2 撰寫 endpoint 測試：person×movie（discover with_people）、person×book（inauthor 不經 LLM）、company×movie、genre×tv、不支援組合回 400、rate limit 掛載
- [ ] 3.3 Service 層新增 discover-by 查詢：`with_people`/`with_companies`/`with_genres` 走 TMDB discover（popularity.desc、前 20 筆、無海報過濾）；book×person 重用 `search_google_books` 組 `inauthor:` query
- [ ] 3.4 `server/app/api/v1/endpoints/search.py` 新增 `GET /by` route（`@limiter.limit("30/minute")`，參數驗證）
- [ ] 3.5 全套 pytest 綠

## 4. 前端：details 頁 chips

- [ ] 4.1 `StoryDetailsView.tsx`：cast pills 與 genre pills 加 onClick，讀 `*_refs` 的 ID 導向 `/search?by=...`（名稱 `encodeURIComponent`；影視 details 帶 `type=movie|tv`，書籍帶 `type=book`）
- [ ] 4.2 directors/creators 由 `join(', ')` 純文字重寫為 chip 元素列
- [ ] 4.3 Studio 區塊由單一 `production_companies[0]` 擴充為完整清單 chips
- [ ] 4.4 書籍 authors 變為可點 chips（帶名稱，`by=person&type=book`）
- [ ] 4.5 `*_refs` 缺失時（舊快取/例外）chips 降級為不可點純顯示，不壞版

## 5. 前端：搜尋頁 by 模式

- [ ] 5.1 `search/page.tsx` 解析 `by`/`id`/`name`/`type` 參數：有 `by` 時呼叫 `/api/v1/search/by`，跳過一般搜尋與 AI fallback
- [ ] 5.2 結果頁顯示查詢對象標題（如「Christopher Nolan 的作品」），結果用既有 StoryCard grid
- [ ] 5.3 by 模式空結果顯示既有 No Results，確認無 `/search/ai` 請求
- [ ] 5.4 返回動線依 1.1 結論實作（back 或 push），驗證回到原 details 頁正常渲染
- [ ] 5.5 `npm run lint && npx tsc --noEmit` 乾淨

## 6. 驗證與收尾

- [ ] 6.1 gstack headless browser 過 DoD 八案例：演員/導演/Studio/類型/作者 chips、媒體範疇隔離、中文編碼、返回、Explore 直接搜人名、空結果無 AI
- [ ] 6.2 回歸確認：details 頁既有顯示無變化（新舊欄位並存）、既有搜尋三模式行為不變
- [ ] 6.3 CI 綠後更新 `docs/BACKLOG.md` 與 `docs/StorioWiki.md`（新 endpoint 與 chips 動線）
- [ ] 6.4 openspec archive change（specs merge 回 openspec/specs/）
