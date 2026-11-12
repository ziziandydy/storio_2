## Why

年底是用戶最願意回顧、也最願意分享的時刻，Spotify、YouTube、Letterboxd、StoryGraph 都靠年度回顧帶動回流與分享。Storio 的用戶正是「收藏故事」的人，卻沒有任何年度回顧；現有只有月回顧（`MonthlyRecapModal`）。年度 Recap 的目標有三個：讓用戶**回味**自己的一年、**黏著並明年繼續使用**、並分享酷東西**吸引新用戶下載**。窗口為每年 11 月到隔年 2 月（華人過年前後也想回顧）。

完整設計（含 Tu 已核可的所有決定）：`docs/superpowers/specs/2026-11-10-year-recap-design.md`。

本變更涵蓋設計文件的**階段 1（資料基礎）與階段 2（Recap 本體，圖片版）**。階段 3（影片版）開工前另寫設計，不在本變更範圍。

## What Changes

- 新增並回填作品資料：`collections` 表新增片長、集數、類別、頁數欄位（migration 009）；新收藏時一併寫入，舊收藏在第一次計算 Recap 時補抓並寫回。
- 新增 Recap 統計 API：`GET /api/v1/collection/recap?year=YYYY`，回傳 15 個場景所需資料，並由後端判斷每個場景的出現條件。
- 新增 Recap 頁面：15 個場景的預覽（橫向瀏覽、數字進場動畫）、中英文。
- 新增圖片分享：每個場景輸出一張圖，比例 9:16 與 4:5 可切換，每張可勾選，走系統分享面板；沿用 Puppeteer 分享圖服務。
- 新增兩個入口：首頁限時卡片（11 月 1 日到 2 月底，可關閉）與 Profile 常駐入口（年份選單回看往年）。
- 新增往年回看權限判斷點 `canViewRecapYear`，目前一律放行，預留日後改為訂閱者限定。
- 新增互動事件 `recap_opened`、`recap_shared`。
- 不改動既有 API 行為；不含影片、音樂、推播、導演／演員／作者統計、重看、跟去年比、連續天數。

## Capabilities

### New Capabilities
- `recap-data`: 作品片長／集數／類別／頁數的儲存、新收藏寫入、舊收藏補抓與快取，以及時間、類別、年代分佈、稱號等統計規則。
- `year-recap`: Recap API、15 個場景的內容與出現條件、門檻（該年 ≥ 3 部）、年份定義、權限判斷、預覽畫面與中英文。
- `recap-entry`: 首頁限時卡片與 Profile 常駐入口的顯示規則、關閉狀態、年份選單、不足門檻時的提示。
- `recap-share`: 圖片分享流程、比例、勾選、品牌標誌與結尾下載引導、心得場景的私人內容保護、`recap_*` 事件。

### Modified Capabilities
<!-- 無：現有規格的要求沒有改變。年份判定沿用 collection-date-model（archived_date，為空時退回 created_at 日期），不修改它。 -->

## Impact

- **資料庫**：Supabase 執行 migration 009（Tu 操作；先 dev 後 prod）。
- **後端**（`server/app`）：`collection_service`／`collection_repo`／`item` schema（新收藏寫入新欄位）、新 recap endpoint／service／repository、補抓流程（TMDB、Google Books）。部署到 Railway 即生效。**依賴 PR #2 已合併**（同樣改動這幾個檔案）。
- **前端**（`client/src`）：新增 Recap 頁面與元件、首頁卡片、Profile 入口與年份選單、`i18n/locales.ts`、分享圖模板（沿用 `components/share/` 與 `useProgressiveRenderQueue`）。iOS／Android 需新版 App 才生效。
- **分享圖服務**：新增 Recap 場景的渲染路由與模板。
- **報表**：沿用既有 `engagement_events`，新增兩個事件名稱。
- **風險**：Capacitor Share 一次傳多張圖的行為需先驗證；舊收藏補抓可能受 TMDB／Google Books 速率限制；補抓不到資料的作品要正確落入「至少」文案。
- **不受影響**：既有收藏流程、月回顧、日曆檢視、舊版 App 相容性。
