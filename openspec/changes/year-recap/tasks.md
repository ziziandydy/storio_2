## 0. 前置

- [ ] 0.1 確認 PR #2（first-collect-activation）已合併回 main，並從最新 main 開實作分支
- [ ] 0.2 Spike：Capacitor Share 一次傳 15 張圖在 iOS 與 Android 的行為與上限；記錄結果並決定備案（分批或先存相簿）

## 1. 階段 1：資料基礎（後端）

- [ ] 1.1 新增 `server/migrations/009_recap_metadata.sql`（`runtime_minutes`、`episode_total`、`genres text[]`、`page_count`，`IF NOT EXISTS`，附驗證查詢）
- [ ] 1.2 `item` schema 與 `collection_repo` 支援新欄位（皆可為 null）；測試：舊資料與舊版 App 回應不變
- [ ] 1.3 `collection_service.add_story` 收藏時寫入已取得的片長、集數、類別、頁數；取不到時留 null 且不阻擋收藏（先寫測試）
- [ ] 1.4 補抓服務：找出缺資料的收藏，有限並行（5）向 TMDB／Google Books 取詳情並寫回；時間預算與 `metadata_pending`；失敗視為無資料（先寫測試，外部 API 用 mock）
- [ ] 1.5 統計模組：年份歸屬（`archived_date`，退回 `created_at` 日期）、時間估算（電影、影集、書每小時 40 頁，只加總有資料者）、類別前三、故事年齡與最愛年代、每月計數與最高月、收藏月數、年度之最、開始與結束、心得挑選
- [ ] 1.6 稱號：規則式稱號表（中英文草案約 8–12 個）與決定性選取；測試同輸入同輸出
- [ ] 1.7 `canViewRecapYear` 單一函式（恆 true）與測試
- [ ] 1.8 `GET /api/v1/collection/recap?year=`：門檻 404（含 `needed`）、權限 403、15 個場景資料或 null（controller → service → repository）
- [ ] 1.9 `GET /api/v1/collection/recap/years`：達標年份與部數
- [ ] 1.10 後端全套 pytest 通過（CI dummy env）；Tu 在 Supabase dev 再 prod 執行 migration 009（Tu 操作）

## 2. 階段 2：Recap 前端

- [ ] 2.1 `i18n/locales.ts` 新增 Recap 全部文案（zh-TW／en），含稱號表、估算標示、鼓勵文案
- [ ] 2.2 API client 與 `useRecap(year)`、`useRecapYears()` hooks（含 `metadata_pending` 重取一次）
- [ ] 2.3 場景元件：15 個場景（開場、總數、電影、影集、書、偏愛類別、故事年齡、稱號、每月節奏、月最投入、收藏月數、年度之最、開始與結束、心得、結尾），背景海報依類型；數字計數動畫，`prefers-reduced-motion` 時直接顯示
- [ ] 2.4 Recap 預覽頁：橫向瀏覽、11–12 月「到目前為止」標示、心得換句、訪客登入提示、最後一頁「繼續收藏」（導向 `/search?focus=1`，不輸出為圖）
- [ ] 2.5 首頁限時卡片：窗口（11/1–2 月底）、年份對應、達標才顯示、依年份關閉記在 localStorage（try/catch）
- [ ] 2.6 Profile「年度 Recap」常駐一列與年份選單；不足門檻顯示鼓勵文案
- [ ] 2.7 元件與 hook 的 Vitest 測試（窗口邊界日期、關閉狀態、不足門檻、場景為 null 時跳過）

## 3. 階段 2：圖片分享

- [ ] 3.1 分享圖服務：Recap 場景渲染路由與模板（9:16、4:5），遵循 `share-render-route`（不建帳號、不記事件）；角落 Storio 標誌；結尾場景含標語與下載線索（中英文）
- [ ] 3.2 分享面板：比例切換、逐張勾選（預設全選）、產生進度（沿用 `useProgressiveRenderQueue`）
- [ ] 3.3 原生分享：寫入檔案後走系統分享面板傳多張，依 0.2 的結論處理備案；網頁桌面保留下載；不使用 `<a download>`
- [ ] 3.4 事件：`recap_opened`、`recap_shared`（確認 events API 白名單與報表 views 是否需登錄）
- [ ] 3.5 心得私人內容保護：預覽所見即輸出所得，取消勾選確實排除

## 4. 驗證與發佈

- [ ] 4.1 前端 `npx next lint`、`tsc`、Vitest 全過；後端 pytest 全過
- [ ] 4.2 `/qa`：390px 手機寬度，中英文，資料多／少／無心得／無書各一種帳號
- [ ] 4.3 iOS 真機：分享多張、觸覺、計數動畫（Tu 操作）
- [ ] 4.4 `/review` → `openspec-archive-change` → `npm run release` → `ios:sync` → `build:ios`（階段 1 與 2 同一版）
