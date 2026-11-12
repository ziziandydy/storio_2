## Context

收藏表 `collections` 目前只存標題、類型、年份、評分、心得、`archived_date`、`created_at`、季數、重看次數等。片長、類別、頁數只在詳情頁即時向 TMDB／Google Books 取得，沒有落地，所以「花了多少時間」「偏愛什麼類別」目前算不出來。日期語意由 `collection-date-model` 規定：`archived_date` 是純日期字串，為空時退回 `created_at` 的日期部分。

分享圖由 Puppeteer 微服務渲染 Next.js 頁面（`/share/render`），月回顧已有 `MonthlyRecapModal` 與 `useProgressiveRenderQueue`；原生 App 只走系統分享面板，不可用 `<a download>`。互動事件已有 `engagement_events` 與 `POST /api/v1/events`。

完整產品設計：`docs/superpowers/specs/2026-11-10-year-recap-design.md`（含 15 個場景、門檻、入口、窗口）。

## Goals / Non-Goals

**Goals:**
- 以可靠的資料算出 15 個場景，缺資料時誠實標示（「至少」「約」「估算」）而非給精確假數字。
- 圖片版全場景可分享；中英文；階段 1 與階段 2 可各自獨立合併。
- 往年回看權限只有一個判斷點，以後改為訂閱者限定不需動到呼叫端。

**Non-Goals:**
- 影片、動畫輸出、音樂（階段 3，另寫設計）。
- 導演／演員／作者統計、重看、跟去年比、連續收藏天數、排行榜、推播提醒、付費牆本身。

## Decisions

### 1. 新欄位直接加在 `collections`
`runtime_minutes`、`episode_total`、`genres text[]`、`page_count`（migration 009，`IF NOT EXISTS`，不回填舊資料於 migration 內）。
- **替代方案**：以 `(media_type, external_id)` 為鍵的共用 metadata 表，多位用戶共享補抓結果、少打外部 API。
- **為何不選**：目前只有約 20 位收藏過的用戶，補抓量很小；單表無 join、與既有 repo 寫法一致。若日後量大再抽表，欄位語意不變。

### 2. 統計在後端即時計算，不存快照
Recap 內容在 11–12 月（「今年到目前為止」）會隨收藏變動，快照會過期；每位用戶資料量小，即時計算成本可忽略。1 月起內容固定，但一樣即時算，避免兩套路徑。

### 3. 舊收藏補抓：在 Recap 請求內、有時間預算、結果寫回
第一次要算某年時，找出缺資料的作品，以有限並行（建議 5）向 TMDB／Google Books 取詳情並寫回欄位；整體有時間預算，超過就先回傳已有的，回應帶 `metadata_pending`（尚未補完的數量），前端可再取一次。失敗的作品視為「無資料」，下次再試。
- **替代方案**：背景 job。Railway 上 fire-and-forget 不可靠（見專案記憶），不採用。

### 4. 由後端決定每個場景是否出現
回應的每個場景要嘛是資料物件、要嘛是 `null`（條件不足）；前端只渲染非 null 的場景，不複製門檻邏輯。圖片張數與日後影片長度因此自動縮短。

### 5. 年份與月份：沿用 `collection-date-model`
一律以 `archived_date` 字串（為空時退回 `created_at` 日期部分）取年、月，不做時區轉換。

### 6. 入口顯示用輕量端點
新增 `GET /api/v1/collection/recap/years`，回傳「該年 ≥ 3 部」的年份清單與各年部數，供首頁卡片與 Profile 年份選單使用，不必載入完整 Recap。

### 7. 往年權限放在後端單一函式
`canViewRecapYear(user_id, year)` 目前恆回傳 true，Recap API 與年份清單都經過它；前端不自行判斷權限。

### 8. 稱號與年代分佈：規則式、決定性
同樣輸入必得同樣輸出，不呼叫 AI。稱號由「最多的類別」「最多的媒體類型」「最投入月份」「作品平均年份」對照預先寫好的中英文稱號表（約 8–12 個，文案由 Tu 審閱）。年代分佈 = 電影與影集依發行年份分到十年、各十年幾部（由舊到新）；「老靈魂」稱號用作品發行年份中位數距今 ≥ 20 年（只在後端判斷，不對外顯示）。

### 9. 分享圖：沿用 Puppeteer 渲染與漸進佇列
新增 Recap 場景的渲染路由與模板，遵循 `share-render-route` 規格（不建立匿名帳號、不記錄事件）。比例 9:16 與 4:5。原生走 Capacitor Filesystem + Share：主動作「儲存全部到相簿」，每場景另有「分享這一張」；一次傳多張給其他 App 只作次要選項（0.2 spike：iOS 分享面板可一次傳 30 張並全數存相簿，訊息可收 15 張，Instagram 只收第 1 張）；網頁桌面保留下載。

### 10. 心得場景的私人內容保護
預覽時用戶可換句、可取消勾選任一張；分享預設全選但不得在用戶不知情下送出心得內容（預覽中即可見該張圖）。

## Risks / Trade-offs

- [Capacitor Share 一次傳多張在各 App 行為不一] → 0.2 spike 已驗證 iOS（Instagram 只收 1 張），已採備案；Android 與 Threads／FB／X 尚未驗證。
- [補抓受 TMDB／Google Books 速率限制、首次開啟變慢] → 有限並行、時間預算、寫回快取、`metadata_pending` 重取。
- [舊影集沒有季數，集數與時間只能估] → 文案用「約」；有資料才加總，標示「至少」。
- [書的時間以每小時 40 頁估算，個人差異大] → 標示「估算」，常數集中定義。
- [資料少的用戶看到空洞 Recap] → 門檻 ≥ 3 部，每個場景獨立出現條件，不足整張跳過且不顯示責備提示。
- [11 月看到的內容之後會變] → 11–12 月明確標示為「今年到目前為止」，1 月起才是完整版。
- [階段 1 與 PR #2 改到同一批檔案] → PR #2 合併回 main 後才開工。

## Migration Plan

1. PR #2 合併回 main。
2. Tu 在 Supabase dev 再 prod 執行 `009_recap_metadata.sql`（冪等，僅新增欄位）。
3. 後端部署 Railway（新欄位為可為 null，舊版 App 不受影響）。
4. 階段 2 的前端隨下一次 iOS／Android 發版；階段 1 單獨合併時用戶看不到變化。
5. 回滾：後端回退版本即可；欄位保留不影響舊程式。

## Open Questions

- 稱號表的中英文文案（約 8–12 個）：實作時先出草案，由 Tu 審閱。
- Recap 事件名稱 `recap_opened`、`recap_shared` 是否需要在 `events` API 的白名單與 `engagement_reporting` 報表 views 登錄：實作時確認。
- 結尾場景的下載線索形式（QR code 連結到哪個網址）：實作時決定，需中英文版。
