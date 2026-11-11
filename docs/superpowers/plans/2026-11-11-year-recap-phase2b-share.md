# 年度 Recap 階段 2B（圖片輸出與分享）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用戶能把 Recap 的每個場景輸出成圖（9:16／4:5），逐張勾選，原生 App 一鍵「儲存全部到相簿」或「分享這一張」，網頁桌面下載；並記錄 `recap_opened`、`recap_shared` 事件（tasks.md 3.1–3.5）。

**Architecture:** 沿用 Puppeteer 分享圖服務：`/share/render` 新增 `recap-scene` 模板，載入 **2A 的同一批純展示場景元件**（`animate={false}`），所以預覽所見即輸出所得；前端沿用 `useProgressiveRenderQueue` 逐張產生並快取；原生走 Capacitor Filesystem（寫入快取目錄）＋Share（依 spike 0.2：Instagram 只收第 1 張，故主動作是「儲存全部」，另有「分享這一張」）。

**Tech Stack:** Next.js 14 靜態輸出、Puppeteer 微服務（`puppeteer-service/`，不改）、`@capacitor/share@7`、`@capacitor/filesystem@7`、FastAPI＋Supabase（事件）、Vitest。

**Spec:** `openspec/changes/year-recap/specs/recap-share/spec.md`、`tasks.md` 3.1–3.5、4.1–4.3；設計 `docs/superpowers/specs/2026-11-10-year-recap-design.md` §6；spike 結果見 `tasks.md` 0.2。前置：[階段 2A](2026-11-11-year-recap-phase2a-preview.md) 完成（場景元件、`RecapScene`、預覽頁、`recap-footer-slot`）。

## Global Constraints

- 全部文件、註解、commit 用繁體中文；用戶可見文字放 `locales.ts`（兩語系鍵集合相同）；文案正面、不責備。
- 輸出尺寸：9:16＝400×711、4:5＝400×500（Puppeteer `deviceScaleFactor: 2`，實際 PNG 為 800×1422／800×1000）；預設 9:16。
- **渲染頁不得有副作用**：不建立匿名帳號、不上報事件（沿用 `botDetection` 的 `render_service` 判定；場景元件不得使用 hook、不發 fetch）。
- **不得使用 `<a download>` 於原生 App**（WKWebView 無效）；網頁桌面可下載；任何路徑**不得顯示假成功**（只有系統分享面板實際回報「儲存到相簿」才說「已儲存到相簿」，其餘情況用中性文案或不宣稱）。
- 階段 2 的分享面板**不得顯示影片選項**。
- 心得內容不得在用戶不知情下送出：心得場景在面板中以實際輸出圖預覽；取消勾選必須排除；換句後輸出同步更新。
- 事件走既有 `engagement_events`：去重（主體＋事件＋平台＋UTC 日）、平台由後端依 Origin 判斷；`recap_*` 事件需登入（訪客只准 `open`，Recap 本來就需 token）。
- 下載線索常數集中在 `client/src/lib/recap/download.ts`（`DOWNLOAD_URL`、`STORE_LABELS`），預設 `DOWNLOAD_URL = 'https://apps.apple.com/app/id6761919955'`、`STORE_LABELS = ['App Store']`（官網 `index.html` 目前只有 App Store 連結，Google Play 尚未上架）；**待 Tu 確認**要 QR 指向 App Store、官網落地頁或雙平台導流頁，以及 Google Play 上架後是否加入。
- 前端 push 前必跑 `cd client && npx next lint && npx tsc --noEmit && npm test`；後端 pytest 用 dummy env。
- migration 010 由 Tu 在 Supabase dev 再 prod 執行，Claude 不執行（只做唯讀驗證）。
- 本計畫在分支 `worktree-year-recap-phase2`（與 2A 同一分支，2A 先完成）。

## Review Focus

1. **預覽＝輸出**：心得場景換句後，輸出圖的引文與預覽一致；快取 key 必須隨 `locale`、`aspectRatio`、心得索引改變，否則會分享到舊圖（Task 5 測試）。
2. **取消勾選確實排除**：取消心得場景後「儲存全部」「下載全部」都不含它，包括它已先被渲染並快取的情況（Task 3、5、6 測試）。
3. **不顯示假成功**：用戶取消系統分享面板、分享被拒、寫檔失敗、其中一張渲染失敗，都不得顯示成功與觸發 `recap_shared`（Task 3、6 測試）。
4. **渲染頁無副作用**：載入 `recap-scene` 時不呼叫 `fetch`（除海報圖片）、不建立匿名帳號、不上報事件（Task 2 測試）。
5. **大量圖片的記憶體與清理**：15 張同時持有 Blob／objectUrl，面板關閉必須 `cleanup()`；原生寫入的快取檔分享完要盡力刪除，且失敗不得蓋掉分享結果（Task 3、5 測試）。

---

## 檔案結構

- Create `client/src/components/recap/scenes/ClosingScene.tsx`、`client/public/image/recap/download-qr.png`、`client/src/lib/recap/download.ts`
- Modify `client/src/components/recap/RecapScene.tsx`（接上 `closing`）
- Modify `client/src/app/share/render/page.tsx`（`recap-scene` 分支）；Create `client/src/lib/recap/renderPayload.ts`
- Create `client/src/lib/recap/shareImages.ts`（儲存、分享編排）
- Create `server/migrations/010_recap_events.sql`；Modify `server/app/schemas/event.py`、`client/src/lib/analytics.ts`；Modify `openspec/changes/year-recap/specs/recap-share/spec.md`
- Create `client/src/components/recap/RecapShareSheet.tsx`；Modify `client/src/app/recap/page.tsx`（接分享按鈕與事件）；Modify `client/src/i18n/locales.ts`（分享面板文案）
- Tests：各檔旁 `__tests__/`、`server/tests/test_events_api.py`

---

### Task 1: 結尾場景與下載線索（3.1 前半）

**Files:** Create `ClosingScene.tsx`、`client/src/lib/recap/download.ts`、`client/public/image/recap/download-qr.png`；Modify `RecapScene.tsx`；Test `client/src/components/recap/__tests__/ClosingScene.test.tsx`

**Interfaces:**
- Consumes：2A 的 `SceneProps`、`SceneFrame`、`copy.scene.closing`（含 `tagline`）。
- Produces：`DOWNLOAD_URL: string`、`STORE_LABELS: string[]`（見 Global Constraints）；`<ClosingScene />`——STORIO 品牌、標語 "Collect stories in your Folio"（兩語系都顯示英文標語）、`STORE_LABELS` 文字、QR 圖（`<img src="/image/recap/download-qr.png">`，含 alt）；`RecapScene` 的 `closing` 分支改為渲染它（`recap.closing` 永遠存在）。
- QR 產生：一次性腳本（不加入 `package.json`）：`npx --yes qrcode@1.5.4 -o client/public/image/recap/download-qr.png -w 512 -m 1 "<DOWNLOAD_URL>"`；PNG 納入版控。

- [ ] **Step 1: 寫失敗測試**：兩語系皆含 "Collect stories in your Folio"、"STORIO"、`STORE_LABELS` 每個名稱；有 `img[src="/image/recap/download-qr.png"]` 且 alt 非空；4:5 時 frame 高 500；`RecapScene` 以 `sceneKey="closing"` 渲染出 `scene-frame`（2A 先前回 null 的測試改為預期渲染）；`DOWNLOAD_URL` 為 https。
- [ ] **Step 2: 跑測試確認失敗。**
- [ ] **Step 3: 實作**元件、常數與 QR 檔（執行上述指令；用瀏覽器或 `file` 確認 PNG 為 512×512，並以手機相機掃描確認指向 `DOWNLOAD_URL`——Tu 可在 Task 7 驗證）。
- [ ] **Step 4: 跑測試確認通過。**
- [ ] **Step 5: Commit** — `feat(recap): 結尾場景與下載 QR`

### Task 2: 渲染路由支援 `recap-scene`（3.1 後半）

**Files:** Modify `client/src/app/share/render/page.tsx`；Create `client/src/lib/recap/renderPayload.ts`；Test `client/src/app/share/render/__tests__/page.recap.test.tsx`、`client/src/lib/recap/__tests__/renderPayload.test.ts`

**Interfaces:**
- Consumes：`RecapScene`、`translations`、`RecapData`、`SceneKey`。
- Produces：
  - `RenderPayload` 擴充：`template` 加 `'recap-scene'`；`item.recap?: RecapData`、`item.sceneKey?: SceneKey`；`RenderSettings` 加 `locale?: 'zh-TW' | 'en-US'`、`recapReflectionIndex?: number`。
  - `buildRecapPayload(recap: RecapData, sceneKey: SceneKey): Omit<RenderPayload, 'settings'>`（`template: 'recap-scene'`）。
  - `recapRenderSettings(opts: {aspectRatio: RecapAspect; locale: 'zh-TW' | 'en-US'; reflectionIndex: number}): RenderSettings`：只含這三個值（供快取 key 雜湊）。
  - 渲染頁 `recap-scene` 分支：`<div data-screenshot style={{display:'inline-block'}}><RecapScene … copy={translations[locale].recap} animate={false} /></div>`；`locale` 缺漏退回 `'zh-TW'`；字型預載的 `contentText` 在 recap 模板時改用 `document.body.innerText`（涵蓋所有場景文字，確保 CJK 子集下載）。

- [ ] **Step 1: 寫失敗測試**：`buildRecapPayload` 的 `template`、`item.sceneKey`、`item.recap.year`；`recapRenderSettings` 只含三鍵；渲染頁（設定 `window.__RENDER_DATA__` 後）對 `sceneKey='total'` 渲染出 `scene-frame` 且文字為所選語系（zh-TW／en-US 各一）；`aspectRatio: '4:5'` → frame 高 500；`sceneKey` 對應欄位為 null → 不崩潰（渲染空框或錯誤狀態，且仍設定 `__RENDER_READY__`）；**無副作用**：渲染期間 `fetch` 未被呼叫、`supabase.auth.signInAnonymously` 未被呼叫、`track` 未被呼叫；既有 `memory-card`／`monthly-recap` 分支行為不變（既有測試仍過）。
- [ ] **Step 2: 跑測試確認失敗。**
- [ ] **Step 3: 實作**。
- [ ] **Step 4: 跑測試確認通過**，並跑 `npm test` 全套。
- [ ] **Step 5: Commit** — `feat(recap): 分享渲染頁支援 Recap 場景`

### Task 3: 儲存與分享編排（3.3）

**Files:** Create `client/src/lib/recap/shareImages.ts`；Test `client/src/lib/recap/__tests__/shareImages.test.ts`

**Interfaces:**
- Consumes：`@capacitor/core`（`Capacitor.isNativePlatform`）、`@capacitor/filesystem`、`@capacitor/share`、`blobToBase64`（`lib/share-api`）。
- Produces（皆為 async，回傳 `ShareOutcome = {status: 'saved' | 'shared' | 'cancelled' | 'error'; message?: string}`；**只有 `saved` 可顯示「已儲存到相簿」**）：
  - `saveAllImages(images: {name: string; blob: Blob}[], opts: {title: string}): Promise<ShareOutcome>`：原生——依序以 `Filesystem.writeFile`（`Directory.Cache`，檔名 `storio-recap-<name>_<timestamp>.png`）寫入，收集 uri，一次呼叫 `Share.share({title, files: uris})`；回傳 `activityType` 含 `SaveToCameraRoll` → `saved`；有其他 `activityType` 或 Android 無 activityType → `shared`；例外訊息含 `cancel`（不分大小寫）→ `cancelled`；其他例外或任一寫檔失敗 → `error`。結束後**盡力**刪除所寫檔案（失敗只記 log，不改結果）。網頁——`navigator.canShare?.({files})` 為真則 `navigator.share({files, title})`；否則依序觸發下載（每張間隔 ≥ 150ms）；回傳 `shared`（分享）或 `saved`（下載視為已儲存）。
  - `shareOneImage(image: {name: string; blob: Blob}, opts: {title: string; text?: string}): Promise<ShareOutcome>`：原生單檔 `Share.share({title, text, url: uri})`；網頁同上邏輯（單檔）。
  - 空陣列 → `{status: 'error', message: 'no_images'}`，不呼叫任何外掛。

- [ ] **Step 1: 寫失敗測試**（mock Capacitor 三個模組與 `navigator.share`／`canShare`）：原生＋`activityType: 'com.apple.UIKit.activity.SaveToCameraRoll'` → `saved`；原生＋`RemoteOpenInApplication-ByCopy` → `shared`；`Share.share` 拋 `Error('Share canceled')` → `cancelled` 且不為成功；`writeFile` 第 2 張拋錯 → `error` 且**不呼叫** `Share.share`；`Share.share` 被呼叫時 `files` 長度等於輸入張數、順序一致；分享後 `Filesystem.deleteFile` 被呼叫 N 次，`deleteFile` 拋錯不改變 `saved`；單張 `shareOneImage` 使用 `url` 而非 `files`；網頁＋`canShare` 為假 → 觸發 N 次 `<a download>` 點擊且回 `saved`（網頁才可以）；原生路徑**不**建立 `<a download>`；空陣列 → `error`。
- [ ] **Step 2: 跑測試確認失敗。**
- [ ] **Step 3: 實作**。
- [ ] **Step 4: 跑測試確認通過。**
- [ ] **Step 5: Commit** — `feat(recap): 儲存全部與分享單張的原生／網頁編排`

### Task 4: 事件 `recap_opened`、`recap_shared`（3.4）

**Files:** Create `server/migrations/010_recap_events.sql`；Modify `server/app/schemas/event.py`、`client/src/lib/analytics.ts`、`openspec/changes/year-recap/specs/recap-share/spec.md`；Test `server/tests/test_events_api.py`、`client/src/lib/__tests__/analytics.test.ts`

**Interfaces:**
- Produces：`ApiEvent` 與 `ClientEvent` 新增 `'recap_opened' | 'recap_shared'`；migration 010 放寬 `engagement_events.event` 的 CHECK（約束名 `engagement_events_event_check`，先 `drop constraint if exists` 再 `add constraint`，清單含原 6 個加 2 個，冪等）。報表 view（`ops.v_engagement_daily`、`v_engagement_rate_weekly`）不列舉事件名，會自動多出這兩個事件；Looker 若有固定事件清單需 Tu 手動加。
- **Ruling（我的決定，需寫入 spec）**：既有事件表沒有承載欄位、且每日去重，無法記錄「年份」「場景數」；spec 改為「記錄是否開啟／分享（用戶數）」，年份與場景數不記錄（若日後需要，另開 migration 加 `meta jsonb`）。

- [ ] **Step 1: 寫失敗測試**：後端——登入用戶 POST `{"event":"recap_opened"}` → 204 且 `record` 以該事件呼叫；`recap_shared` 同；未登入送 `recap_opened` → 401（訪客只准 `open`）；未知事件仍 422；`add_collection` 仍 422。前端——`track('recap_opened')` 送出 `{event: 'recap_opened'}` 並帶 Authorization；同日同事件第二次不再送（去重 key 沿用）；無 token 時不送（非 `open`）。
- [ ] **Step 2: 跑測試確認失敗。**
- [ ] **Step 3: 實作** migration（檔頭說明背景、先 dev 再 prod、冪等、附驗證查詢：`select pg_get_constraintdef(oid) from pg_constraint where conname = 'engagement_events_event_check';`）、後端 Literal、前端型別；改 spec 文字（兩個 Scenario 與 Requirement 去掉年份與場景數）。實作前用 dev 的唯讀 MCP 確認約束名稱確實是 `engagement_events_event_check`；不一致就以實際名稱為準並記錄。
- [ ] **Step 4: 跑測試確認通過**（後端全套、前端 `analytics.test.ts`）。
- [ ] **Step 5: Commit** — `feat(recap): 新增 recap_opened／recap_shared 事件與 migration 010`
- [ ] **Step 6（Tu）:** 在 Supabase dev 執行 `010_recap_events.sql` 並跑驗證查詢；通過後 prod 再執行。**未執行前不得讓前端送這兩個事件到對應環境**（會被 CHECK 擋成 500；`track` 會吞錯，但請先跑 migration 再測）。

### Task 5: 分享面板（3.2、3.5）

**Files:** Create `client/src/components/recap/RecapShareSheet.tsx`；Modify `client/src/i18n/locales.ts`（`recap.share.*` 文案）；Test `client/src/components/recap/__tests__/RecapShareSheet.test.tsx`

**Interfaces:**
- Consumes：`useProgressiveRenderQueue`、`getRenderServiceHealth`（冷啟動檢查，沿用 `MonthlyRecapModal` 的 60 秒逾時處理）、`buildScenes`、`buildRecapPayload`、`recapRenderSettings`、`saveAllImages`、`shareOneImage`、`track`。
- Produces：`<RecapShareSheet isOpen onClose recap reflectionIndex locale />`：
  - 比例切換 9:16／4:5（預設 9:16；**沒有影片選項**）。
  - 場景清單 = `buildScenes(recap, {forShare: true})`（含結尾，不含「繼續收藏」）；每項有勾選框（預設全選）、縮圖（已渲染則顯示快取 PNG，否則轉圈）。
  - 渲染：`allTemplates` 為目前勾選的場景鍵；`settings = recapRenderSettings({aspectRatio, locale, reflectionIndex})`；勾選一個尚未渲染的場景時 `prioritize(key)`；比例、語系或 `reflectionIndex` 改變 → 快取自動失效並重排（沿用 queue 的 settings hash 行為）。
  - 進度「已產生 n/m」（m＝勾選數）。
  - 主按鈕：原生「儲存全部到相簿」、網頁「下載全部」；只在所有**勾選**場景都已渲染時可按；每張縮圖旁「分享這一張」（原生）。
  - 結果提示：依 `ShareOutcome`——`saved` 才顯示「已儲存到相簿」；`shared` 顯示中性「已完成」；`cancelled` 不顯示成功；`error` 顯示錯誤與重試。`saved`／`shared` 時 `track('recap_shared')`。
  - 關閉時 `cleanup()`。勾選為 0 時主按鈕停用。

- [ ] **Step 1: 寫失敗測試**（mock `useProgressiveRenderQueue`、`shareImages`、`analytics`、`getRenderServiceHealth`）：預設全選且數量等於 `buildScenes(forShare:true)`；不含「繼續收藏」；沒有影片相關文字；取消心得 → 傳給 `saveAllImages` 的 images 不含心得、`allTemplates` 不含 `reflection`（**即使 `getCacheEntry('reflection')` 仍回傳舊快取**，Review Focus 2）；切 4:5 後 settings 的 `aspectRatio` 為 `'4:5'`；`reflectionIndex` 由 0 變 1 → settings 的 `recapReflectionIndex` 變為 1；有勾選場景尚未渲染 → 主按鈕停用；`saveAllImages` 回 `cancelled` → 不顯示「已儲存」且不呼叫 `track('recap_shared')`；回 `saved` → 顯示「已儲存到相簿」並 `track('recap_shared')` 一次；回 `shared` → 中性文案；回 `error` → 錯誤與可重試；單張分享呼叫 `shareOneImage` 且只傳該場景；關閉時呼叫 `cleanup`；服務逾時顯示重試而非無限轉圈。
- [ ] **Step 2: 跑測試確認失敗。**
- [ ] **Step 3: 實作**（版面參考 `MonthlyRecapModal` 的底部抽屜與冷啟動 UI，但場景清單為縮圖格；文案寫入 `locales.ts` 兩語系並加入 `recapLocales` 鍵集合測試）。
- [ ] **Step 4: 跑測試確認通過**，`npm test` 全套。
- [ ] **Step 5: Commit** — `feat(recap): Recap 分享面板（比例、勾選、儲存全部、分享單張）`

### Task 6: 接上預覽頁與事件

**Files:** Modify `client/src/app/recap/page.tsx`；Test `client/src/app/recap/__tests__/page.share.test.tsx`

**Interfaces:**
- Consumes：2A 預覽頁的 `reflectionIndex` state 與 `recap-footer-slot`、`RecapShareSheet`、`track`。
- Produces：`ready` 時頁尾顯示「分享」按鈕（`copy.share`）開啟 `RecapShareSheet`；預覽頁**每次進入且資料 `ready` 時只呼叫一次** `track('recap_opened')`（重取 `metadata_pending` 不重複；`not_enough`／`error` 不呼叫）；`reflectionIndex` 與 `locale` 傳入面板。

- [ ] **Step 1: 寫失敗測試**：`ready` → 呼叫 `track('recap_opened')` 恰一次，即使 `metadata_pending` 觸發重取導致 `data` 換新物件；`not_enough`、`error`、`loading` 不呼叫；按「分享」→ 面板開啟並收到目前的 `reflectionIndex`；在預覽換句（索引 0→1）後開面板 → 收到 1；`forbidden` 不顯示分享按鈕。
- [ ] **Step 2–4:** 紅 → 實作 → 綠。
- [ ] **Step 5: Commit** — `feat(recap): 預覽頁接上分享面板與 recap_opened 事件`

### Task 7: 驗證與交接（4.1–4.3）

- [ ] **Step 1: 自動化驗證**：`cd client && npx next lint && npx tsc --noEmit && npm test`；後端全套 pytest（dummy env）。預期全過。
- [ ] **Step 2: 真實渲染煙霧測試**（沿用 `docs/DEV_SETUP.md` §5 啟動 backend、frontend、puppeteer-service，`FRONTEND_URL=http://localhost:3010`）：用 dev 有資料的帳號取得一份 `RecapData`（`/api/v1/collection/recap?year=2026`），對 `POST http://localhost:4000/render` 逐一送 15 個 `sceneKey` × 兩種比例（共 30 張，用腳本迴圈、輸出到 scratchpad，不進版控）；確認每張 PNG 寬度 800、高 1422／1000、檔案 > 10KB、無逾時；目視檢查：中文字不是方框、海報有載入、結尾 QR 清楚、心得引文正確。任何一張失敗先修再往下。
- [ ] **Step 3: `/qa`（gstack）**：390px 寬、中英文；預覽頁、分享面板（網頁版：勾選、比例、進度、下載）；資料多／少／無心得／無書各一帳號；截圖存證。
- [ ] **Step 4: 勾選** `openspec/changes/year-recap/tasks.md` 3.1–3.5、4.1–4.2；4.3 留給 Tu。更新 `docs/StorioWiki.md`（分享面板、渲染模板、事件）。Commit — `docs: year-recap 階段 2B 完成`。
- [ ] **Step 5（Tu）iOS 真機清單 4.3**：iPhone XR 連線後，Claude 以 `docs/DEV_SETUP.md` Q9 流程安裝：(a) 預覽橫滑與計數動畫、(b) 分享面板產生 15 張的時間與記憶體是否穩定、(c)「儲存全部到相簿」相簿張數正確、(d)「分享這一張」可直接到 Instagram Story、(e) 取消分享面板不顯示成功、(f) 心得換句後輸出圖同步、取消勾選確實排除、(g) 結尾 QR 以手機相機掃描指向正確網址、(h) 先跑完 migration 010（dev）後確認事件有記錄。
- [ ] **Step 6:** 通過後走發佈：`/review` → `openspec-archive-change`（year-recap，同步 main specs）→ `npm run release` → `ios:sync` → `build:ios` → Archive 上傳（階段 1 與 2 同一版；每一步依 CLAUDE.md 的對外動作確認規則先問 Tu）。
