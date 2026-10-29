## Why

營運報表無法回答「有多少真實用戶打開了 App、打開後做了什麼」：上線人數只是 `auth.sessions` 的近似值，且偵察發現根 layout 的 `useAuth()` 會對**任何訪客**（含會執行 JavaScript 的爬蟲與我們自己的分享圖服務 `/share/render`）自動建立匿名帳號，讓帳號數、新註冊與啟用率的分母被大量灌水（約 2,588 帳號僅約 19 個正式註冊）。這次與下一次 iOS 發版同批上線，讓之後的產品決策（例如「新用戶不收藏」）建立在可信的數字上。

完整設計（含 Tu 已核可的所有決定）：`docs/superpowers/specs/2026-10-29-engagement-events-design.md`。

## What Changes

- 新增六種互動事件記錄：`open`、`browse`、`detail_view`、`search`、`add_collection`、`share`，依平台（iOS／Android／web）分開，同主體同日同事件只記一次。
- 新增後端 API `POST /api/v1/events`（endpoint → service → repository），平台由 `Origin` 標頭判斷；`add_collection` 由後端在新增收藏成功後記錄，舊版 App 也涵蓋。
- 網頁版疑似爬蟲判斷（User-Agent 名單、`navigator.webdriver`），以瀏覽器內隨機訪客代號記錄 `open` 並標記，可在報表計數。
- **修正根因**：`/share/render` 與判定為爬蟲的網頁訪客不再建立 Supabase 匿名帳號；真人與原生 App 流程不變。
- 新 migration `006_engagement_events.sql`：`public.engagement_events` 表與 `ops` 報表 views，授權 `looker_ro`。
- Looker 新增「互動」分頁與「真實用戶」（寬鬆版）卡片；既有被灌水的卡片標題加註。
- App Store Connect 隱私標籤補「使用資料：產品互動」；更新 `docs/app-store-privacy-answers.md` 與 `docs/OPS_DASHBOARD.md`。

## Capabilities

### New Capabilities
- `engagement-events`: 互動事件的定義、前端上報、後端 API、去重、平台判斷與資料保存／刪除語意。
- `bot-traffic-guard`: 網頁疑似爬蟲判斷、不為非真人建立匿名帳號、以訪客代號計數。
- `engagement-reporting`: `ops` 報表 views、engagement rate 與真實用戶定義、Looker 互動分頁。

### Modified Capabilities
- `share-render-route`: 分享圖渲染頁不建立帳號、不記錄任何互動事件。

## Impact

- **前端**（`client/src`）：`hooks/useAuth.ts`、新增爬蟲判斷與事件上報模組、`AppOpenReset`／根 layout、首頁與館藏頁（browse）、詳情頁、搜尋頁、`ShareModal`、`MonthlyRecapModal`。iOS／Android 需新版 App 才生效。
- **後端**（`server/app`）：新 events endpoint／service／repository、collection service 新增成功後記錄事件、slowapi 限流。push 即生效（Railway）。
- **資料庫**：Supabase prod 執行 migration 006（Tu 操作），以及 migration 007（重建 `migrate_guest_data`，補上呼叫者與來源帳號檢查）；不修改既有 004／005 views。
- **報表**：Looker 新增資料來源與分頁（Tu 輸入 `looker_ro` 密碼）。
- **隱私**：App Store Connect 隱私標籤需 Tu 補填；Google Play Data Safety 於 Android 上架時補。
- **不受影響**：真人使用體驗、既有 API 行為、舊版 App 相容性。
