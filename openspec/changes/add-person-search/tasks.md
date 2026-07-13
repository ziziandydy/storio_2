## 1. 前置驗證（先消風險再蓋 UI）

- [x] 1.1 **決策（未跑模擬器 spike）**：目前無開啟中的模擬器與 webinspectord_sim socket，重新起完整 CDP 驗證環境屬獨立操作任務且過去有踩雷紀錄。直接採用 D5 已規格化的安全 fallback：**`router.push` 帶來源 `type`/`id` 參數返回**（不依賴 `router.back()` 跨頁 back stack 的不確定行為）。此路徑本就是 design.md 明文核准的備援選項，行為確定、可測試，故跳過 spike 直接採用。

## 2. 後端：schema 與 refs（TDD）

- [x] 2.1 撰寫 `ItemDetailResponse` refs 欄位測試：details 回傳含 `cast_refs`/`director_refs`/`genre_refs`/`company_refs`（`{id,name}`），且既有字串欄位內容不變
- [x] 2.2 `server/app/schemas/item.py` 新增 `EntityRef` model 與四個 `*_refs` 欄位（additive，預設空陣列）
- [x] 2.3 `_fetch_tmdb_details` 保留 TMDB ID：組 cast/directors/genres/production_companies 時同步填入 `*_refs`（directors 含 TV created_by）
- [x] 2.4 跑測試綠 + 確認書籍 details 不受影響（authors 維持字串陣列）

## 3. 後端：標準搜尋擴充——人名偵測 + 精準參數（TDD）

- [x] 3.1 `server/app/schemas/search.py`：`TMDBDiscoverParams` 新增 `with_people`、`with_companies` 欄位
- [x] 3.2 撰寫測試：影視查詢改走 `search/multi` 後標題搜尋行為不回歸（鎖住既有 `test_search_endpoint` 行為）
- [x] 3.3 撰寫測試：人名偵測——multi 首位為 person 且標題命中為 0/極少 → `discover with_people` 回作品；輸入標題有命中則不切換；全程無 LLM 呼叫
- [x] 3.4 撰寫測試：精準參數 `pid`/`cid`/`gid` → 直接 discover；`author` → `inauthor:`；`cid`/`gid` 對 book 忽略；帶參數時跳過偵測
- [x] 3.5 Service 層實作：`search_multi` 影視側改用 TMDB `search/multi` + 人名偵測切換；書籍側 free-text 與 `inauthor:` 合併去重；精準參數分流（重用 discover 組參與 `search_google_books` 邏輯）
- [x] 3.6 Controller：`GET /search/` 接受選用參數 `pid`/`cid`/`gid`/`author` 並透傳 service（沿用既有 30/min limiter）
- [x] 3.7 全套 pytest 綠（43 passed, 2 skipped — 隔離 .env 驗證）

## 4. 前端：details 頁 chips

- [ ] 4.1 `StoryDetailsView.tsx`：cast pills 與 genre pills 加 onClick，讀 `*_refs` 導向 `/search?q=<名稱>&pid=...`（或 `gid`；名稱 `encodeURIComponent`；影視帶 Movies/Series 分頁、書籍帶 Books 分頁）
- [ ] 4.2 directors/creators 由 `join(', ')` 純文字重寫為 chip 元素列
- [ ] 4.3 Studio 區塊由單一 `production_companies[0]` 擴充為完整清單 chips（`cid`）
- [ ] 4.4 書籍 authors 變為可點 chips（`q=<作者>&author=<作者>`）
- [ ] 4.5 `*_refs` 缺失時（舊快取/例外）chips 降級為不可點純顯示，不壞版

## 5. 前端：搜尋頁參數透傳

- [ ] 5.1 `search/page.tsx` 解析 `pid`/`cid`/`gid`/`author`：進頁以 `q` 填入輸入框並直接載入結果；fetch 時透傳精準參數
- [ ] 5.2 帶精準參數時空結果顯示既有 No Results，確認無 `/search/ai` 請求；使用者修改文字重新送出時清除精準參數（回歸自由搜尋）
- [ ] 5.3 返回動線依 1.1 結論實作（back 或 push），驗證回到原 details 頁正常渲染
- [ ] 5.4 `npm run lint && npx tsc --noEmit` 乾淨

## 6. 驗證與收尾

- [ ] 6.1 gstack headless browser 過 DoD 案例：演員/導演/Studio/類型/作者 chips、Explore 手動輸入人名（中英文各一）必出作品、媒體範疇隔離、中文編碼、返回、精準參數空結果無 AI、標題搜尋不回歸
- [ ] 6.2 回歸確認：details 頁既有顯示無變化（新舊欄位並存）、既有搜尋三模式（Auto/AI/Keyword）行為不變
- [ ] 6.3 CI 綠後更新 `docs/BACKLOG.md` 與 `docs/StorioWiki.md`（搜尋擴充與 chips 動線）
- [ ] 6.4 openspec archive change（specs merge 回 openspec/specs/）
