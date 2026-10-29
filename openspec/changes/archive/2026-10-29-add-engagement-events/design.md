## Context

完整設計與所有已定案決定見 `docs/superpowers/specs/2026-10-29-engagement-events-design.md`（Tu 於 2026-10-29 核可）。本文件只摘要技術架構與取捨，細節以該文件為準。

現況：
- 營運報表（`docs/OPS_DASHBOARD.md`）的上線人數以 `auth.sessions` 近似，沒有任何互動事件。
- `client/src/app/layout.tsx` 掛載的 `AppOpenReset` 呼叫 `useAuth()`；`useAuth` 在無 session 時立即 `signInAnonymously()`，使任何訪客（含爬蟲、Puppeteer `/share/render`）都建立匿名帳號。
- 後端三層架構（endpoint → service → repository），寫入 Supabase 用 service-role client 並必須 `await`（Railway 上 fire-and-forget 會靜默失敗）。
- 前端為 Next.js 14 `output: 'export'`，iOS／Android 以 Capacitor 打包；前端改動需新版 App。

## Goals / Non-Goals

**Goals:**
- 六種事件分平台記錄，支援計算各行為的 engagement rate。
- 網頁疑似爬蟲另外標記並可計數。
- 分享圖服務與已知爬蟲不再建立匿名帳號。
- 舊版 App 不受影響，`add_collection` 對所有版本立即生效。

**Non-Goals:**
- 刪除既有帳號、修改 004／005 views。（原列「修改 `migrate_guest_data`」，2026-10-29 經 Tu 核可改為納入：migration 007 補權限檢查、`useAuth` 只建一個匿名帳號。）
- 事件內容細節（作品、搜尋字串、停留時間）。
- 漏斗互斥歸類、偽裝爬蟲偵測、Next 升級。

## Decisions

1. **事件存在 Supabase、經後端 API 寫入**，而非前端直接寫 Supabase 或接第三方分析服務。理由：符合三層架構與 RLS 全關的安全模式（比照 `ai_api_usage`）；資料留在自家資料庫，Looker 可直接讀；不新增第三方 SDK，隱私標籤影響最小。
2. **去重放在資料庫**：唯一索引 `(coalesce(user_id, visitor_id), event, platform, day)` 加 `on conflict do nothing`，前端另以 localStorage 做同日略過以減少請求。理由：資料庫是唯一可信的去重點，前端去重只是省流量。
3. **平台由後端依 `Origin` 判斷**（`capacitor://localhost` → ios、`https://localhost` → android、其他 → web），不採信前端值。理由：`add_collection` 在後端記錄、舊版 App 無法送新欄位，`Origin` 是唯一一致的訊號，且已由 CORS 設定驗證過。
4. **`add_collection` 在後端記錄**：collection service 新增成功後呼叫 event service，失敗只記 log。理由：三個前端入口共用同一 API，後端記錄最準、零前端改動、涵蓋舊版。
5. **爬蟲判斷在前端、集中一個模組**：路徑 `/share/render`、`navigator.webdriver`、User-Agent 名單。理由：建立匿名帳號發生在前端，判斷必須在 `signInAnonymously()` 之前；集中模組便於測試與擴充名單。替代方案「第一次互動才建帳號」與「要存資料才建帳號」改動大、影響真人體驗，Tu 已選 A 方案。
6. **無帳號訪客用 localStorage 隨機 UUID**，後端對無 token 請求只接受 `open`。理由：讓疑似爬蟲可計數，同時避免無帳號者灌入其他事件。
7. **`open` 等 auth 有結果才送**：有 token 記 `user_id`、判定 bot 記 `visitor_id`、真人匿名登入失敗記 `visitor_id` 且非 bot。理由：避免新用戶首訪被算成兩個主體。
8. **刪除語意**：`user_id` 外鍵 `on delete cascade` 處理刪帳號；`DELETE /me/data` 不刪事件，不在共用的 `clear_user_data()` 加刪除邏輯。

## Risks / Trade-offs

- [偽裝成真人的爬蟲會被算入 `open` 與寬鬆版真實用戶] → 報表標示限制；engagement rate 分子（browse 以後）仍可信。
- [爬蟲不保留儲存，訪客代號數接近來訪次數] → 報表標示「近似來訪次數」。
- [判定為 bot 的頁面沒有帳號，依賴 token 的元件可能卡住或報錯，影響 SEO] → 驗收要求以爬蟲 UA 實測首頁正常輸出（含 JSON-LD）、無無限轉圈、無錯誤。
- [`Origin` 判斷錯誤導致平台歸類錯] → 單元測試涵蓋三種 Origin 與缺少 Origin（視為 web）。
- [事件 API 被濫用] → slowapi 每 IP 每分鐘 60 次、無 token 只收 `open`、event／platform 以 check constraint 限定。
- [訪客轉正式帳號當天重複計算] → 已知取捨，正式註冊數極少。
- [前端事件需新版 App] → `add_collection` 由後端記錄先有資料；報表從上線日起算。

## Migration Plan

1. 後端與 migration 先上：Tu 在 prod SQL Editor 執行 `006_engagement_events.sql`（可重複執行）→ push 後端（Watch Paths 只觸發 `storio_2`）→ 確認 `add_collection` 開始寫入。
2. 前端網頁版隨 push 上 Vercel → 以爬蟲 UA 與真人實測。
3. iOS 隨下次發版（`npm run release` → `ios:sync` → `build:ios` → Archive）。
4. Looker 新增資料來源與「互動」分頁；Tu 補 App Store Connect 隱私標籤。
5. 回滾：後端可在 Railway 回滾；前端事件上報失敗靜默，不影響功能；`engagement_events` 表與 views 可保留不刪。

## Open Questions

無。所有問題已在設計文件中定案。
