## 1. 資料庫（migration 006）

- [ ] 1.1 撰寫 `server/migrations/006_engagement_events.sql`：`public.engagement_events` 表（欄位、check constraints、user_id／visitor_id 恰好一個、`on delete cascade`）、去重唯一索引、RLS 開啟且無 policy，可重複執行
- [ ] 1.2 同檔建立 `ops.v_engagement_daily` 與 `ops.v_engagement_rate_weekly`、真實用戶（寬鬆版）7／30 天 view，`revoke` public／anon／authenticated、`grant select` 給 `looker_ro`
- [ ] 1.3 檔尾附手動驗證 SQL；請 Tu 在 prod SQL Editor 執行並回報結果

## 2. 後端事件 API

- [ ] 2.1 先寫 pytest：事件值驗證、平台由 Origin 判斷（含缺 Origin）、token 主體優先、無 token 只收 open、重複送回 204 不重複、限流 429
- [ ] 2.2 新增 repository（service-role client，`on conflict do nothing`，寫入 await）
- [ ] 2.3 新增 service（主體解析、平台判斷、UTC day、資料最小化）
- [ ] 2.4 新增 endpoint `POST /api/v1/events`（可選 token、slowapi 60/minute），掛到 router
- [ ] 2.5 先寫 pytest：新增收藏成功會記 add_collection、事件寫入失敗不影響收藏回應
- [ ] 2.6 collection service 新增成功後呼叫 event service（失敗只記 log）
- [ ] 2.7 確認 `DELETE /me/data` 不刪事件、`clear_user_data()` 不被修改；跑全套 pytest

## 3. 前端：爬蟲判斷與根因修正

- [ ] 3.1 先寫 vitest：`botDetection` 的 render_service／webdriver／user_agent／native／真人各情境
- [ ] 3.2 實作 `client/src/lib/botDetection.ts`
- [ ] 3.3 先寫 vitest：`useAuth` 對 bot 不呼叫 `signInAnonymously` 且 loading 結束；真人照舊建立
- [ ] 3.4 修改 `useAuth` 的 `initAuth`
- [ ] 3.5 檢查依賴 token 的首頁元件在「無帳號且非載入中」時不卡住、不報錯

## 4. 前端：事件上報

- [ ] 4.1 先寫 vitest：`track` 同日同主體本機略過、失敗靜默、無 token 時帶 visitor_id 與 bot 標記、`/share/render` 不送
- [ ] 4.2 實作事件上報模組（visitor_id 產生與保存、本機去重 key 含主體）
- [ ] 4.3 `open`：auth 有結果後送（原生含回到前景；網頁頁面載入）；匿名登入失敗的真人記 visitor_id 非 bot
- [ ] 4.4 `browse`：首頁與館藏頁第一次 scroll／wheel／touch
- [ ] 4.5 `detail_view`：詳情頁載入成功
- [ ] 4.6 `search`：一般與 AI 搜尋實際送出請求時
- [ ] 4.7 `share`：`ShareModal` 與 `MonthlyRecapModal` 分享成功
- [ ] 4.8 跑 vitest 全套與 `next lint`、`npm run build`

## 5. 整合驗證

- [ ] 5.1 本機以 Puppeteer `/share/render` 實測：不建立帳號、不送事件、截圖不變
- [ ] 5.2 本機以爬蟲 User-Agent 的 headless 瀏覽器開首頁：不建立帳號、送出 bot open、首頁 JSON-LD 與標題照常
- [ ] 5.3 真人瀏覽器走一輪：匿名帳號照常建立、六種事件正確寫入（本機後端 + dev Supabase）
- [ ] 5.4 iOS 模擬器或真機走一輪核心動線，確認 UI 無變化、平台記為 ios

## 6. 部署、報表與文件

- [ ] 6.1 Tu 執行 migration 006 → push 後端 → Railway 驗證 → prod 新增收藏確認 add_collection 寫入
- [ ] 6.2 push 前端（Vercel）→ 以爬蟲 UA 與真人實測線上網頁
- [ ] 6.3 Looker：新增資料來源（Tu 輸入密碼）、建立「互動」分頁、真實用戶卡片、既有卡片標題加註
- [ ] 6.4 更新 `docs/OPS_DASHBOARD.md`（分頁表、指標定義、限制）與 `docs/app-store-privacy-answers.md`
- [ ] 6.5 Tu 在 App Store Connect 補「Usage Data → Product Interaction」
- [ ] 6.6 iOS 發版（與分享網址修復、依賴升級同批）：`npm run release` → `ios:sync` → `build:ios` → Archive → 送審
