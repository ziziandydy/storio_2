# Design: 人物/類型搜尋擴充

## Context

Storio 的詳情頁（`StoryDetailsView`）已顯示演員、導演、Studio、類型與書籍作者，但均為不可互動的展示資訊；搜尋（v1.15 後為 keyword-first + AI fallback）只能以標題查詢。TMDB discover（`with_people`/`with_companies`/`with_genres`）與 Google Books `inauthor:` 在 API 層完整支援「依人物/類型探索」。

關鍵現況（經 code review 實證，見已核准設計文件）：

- `ItemDetailResponse` 只存名稱字串，`_fetch_tmdb_details` 丟棄 TMDB numeric ID，而 discover 只吃 ID。
- `StoryDetailsView` 的 cast/genres 已是 pill 樣式；directors 是 `join(', ')` 純文字；Studio 只顯示 `production_companies[0]`。
- `router.back()` 僅用於 details 頁自身返回鈕，跨頁往返（details→search→back）在 Capacitor iOS WebView 未經驗證。
- iOS 靜態 export（`output: 'export'`），所有路由走 query parameter。

## Goals / Non-Goals

**Goals:**

- details 頁的人物/Studio/類型可點擊，跳轉至搜尋頁顯示相關作品，並可返回原 details 頁。
- Explore 搜尋能力涵蓋人物（演員/導演/作者）、公司、影視類型。
- 影視 details 跳轉只出影視結果；書籍 details 只出書籍結果。

**Non-Goals:**

- 書籍 genre（BISAC 英文分類）點擊——v1 不做。
- 出版社（publisher）點擊——v1 不做。
- 人物詳情頁（Letterboxd 式 `/person` 頁）——未來有用戶量再議。
- details 頁內嵌相關作品抽屜（bottom sheet）——列為未來體驗優化。

## Decisions

### D1: ID 缺口採 A-1（schema 帶 ID），以「加欄位」而非「改欄位」落地

details response **保留既有字串陣列欄位不動**（cast/directors/genres/production_companies），**新增** `cast_refs`/`director_refs`/`genre_refs`/`company_refs` 為 `[{id, name}]`；新前端 chips 讀 `*_refs`，舊欄位供已上架 iOS 舊版持續使用。

- 理由：chip 點擊零額外延遲、無同名誤判（勝過 A-2 by-name 反查的額外 API call 與歧義）；additive 欄位讓已上架且無法強制更新的 iOS 舊版完全不受影響，回歸風險趨近零。
- 代價：response payload 名稱短期重複存在；舊欄位待 iOS 版本淘汰後於未來版本移除。
- 書籍作者例外：Google Books `inauthor:` 吃名稱字串，authors 維持字串陣列即可（無 ID 需求）。

### D2: person 查詢用 `with_people`，不用 `with_cast`+`with_crew`

TMDB discover 同時帶 `with_cast` 與 `with_crew` 是 AND 語意（同時演又導），`with_people` 才是原生 cast-or-crew。單一參數、單次呼叫。

### D3: `/search/by` 為獨立 endpoint，不塞進既有 `/search/` 或 `/search/ai`

- 理由：discover 查詢與 keyword/語意搜尋的參數形態、快取特性、rate limit 需求皆不同；獨立 route 讓三層架構每層職責單純。書籍 `inauthor:` 路徑從 AI intent 流程抽出，重用 `search_google_books` 的組 query 邏輯。
- 分流矩陣：

| by \ type | movie / tv | book |
|-----------|-----------|------|
| person | TMDB discover `with_people` | Google Books `inauthor:` |
| company | TMDB discover `with_companies`（schema 新增欄位） | 不提供 |
| genre | TMDB discover `with_genres`（chip 帶 ID） | v1 不做 |

### D4: 搜尋頁 `by` 模式空結果不觸發 AI fallback

discover 空結果就是事實答案（該導演沒有其他作品），與 keyword 搜尋「可能打錯字」的語境不同。顯示既有 No Results 樣式。

### D5: 返回先驗 `router.back()`，備援 `router.push`

實作第一步在 iOS 模擬器驗證 details→search→back 的 back stack（scroll position、狀態保留）。不成立則 chip 跳轉時把來源 details 的 `type`/`id` 帶進 search URL，返回改 `router.push` 回 details。

### D6: genre 在地化交給 TMDB

TMDB 帶 `language=zh-TW` 自動回中文 genre 名稱，chip 帶 genre ID 跳轉，前端不建對照表。

## Risks / Trade-offs

- [API contract 變更破壞既有渲染] → D1 採 additive `*_refs` 欄位，既有欄位不動，舊版 iOS 零影響；驗收仍含「details 頁既有顯示不回歸」；後端 pytest 覆蓋新 schema。
- [`router.back()` 跨頁行為不符預期] → D5 備援方案，且列為 tasks 第一步（先驗證再蓋 UI）。
- [TMDB rate limit（新查詢型態增加用量）] → discover 為單次查詢、無扇出；`/search/by` 沿用既有 limiter（30/min）。
- [同名 Studio/公司多筆] → company chip 帶 TMDB company ID（來自 details response），無反查歧義。
- [`with_people` 對超多產人物回傳過廣] → 沿用 discover 預設 `popularity.desc` 排序，取前 20 筆，與現行 trending/discover 行為一致。

## Migration Plan

無資料庫變更。D1 為 additive contract：Railway 後端可先行部署（舊版前端/iOS 完全不受影響），Vercel 與 iOS 新版隨後上線讀取 `*_refs`。無需部署協調、可獨立 rollback（撤前端即可，後端新欄位為 no-op）。舊字串欄位的移除排入未來版本（待 iOS 舊版佔比趨零）。

## Open Questions

- 無（design 階段已清空；`router.back()` 驗證屬 tasks 執行項）。
