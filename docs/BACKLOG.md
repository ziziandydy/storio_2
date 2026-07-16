# Storio 專案待辦清單與未來優化 (Backlog & Future Improvements)

最後更新：2026-07-14

---

## 🎉 里程碑：v1.16.0（2026-07-16 App Store 已上架）

人物/類型搜尋擴充 (add-person-search) 上線，build 18。真機前先跑過 iOS 模擬器 CDP 驗證（見下方功能說明），確認搜尋 chip 跳轉與 push-based 返回動線在真實 WKWebView 下行為正確。

**版號**：v1.16.0（build 18）。送審前已通過：後端 CI 綠、`npm run build:ios` production build 乾淨、iOS 模擬器手動驗證核心動線。2026-07-14 送審，2026-07-16 審核通過並成功發佈。

---

## 🎉 功能：人物/類型搜尋擴充 (add-person-search)（2026-07-13 完成，v1.16.0 送審）

Details 頁的演員、導演、Studio、影視類型（電影/書籍作者）變為可點擊 chips，導向 Explore 搜尋頁顯示相關作品；返回用 `router.push` 回到原 details 頁。Explore 手動輸入人名（中英文皆可）也能自動偵測並回傳該人物完整作品清單，不需先知道要點哪裡。

- **後端**：details response additive 新增 `cast_refs`/`director_refs`/`genre_refs`/`company_refs`（TMDB numeric ID），既有欄位零回歸，已上架 iOS 舊版不受影響。標準搜尋（`GET /search/`）新增人名自動偵測（TMDB `search/multi` + `discover with_people`）與精準參數（`pid`/`cid`/`gid`/`author`），精準參數空結果不觸發 AI fallback。
- **前端**：details 頁 chips（cast/genre 既有 pill 加 onClick；director 由純文字重寫為 chip 列；Studio 由單一公司擴充為完整清單）；`*_refs` 缺失時 chip 降級為不可點純顯示，不壞版。
- **QA 抓到並修復的 bug**：Explore 手動輸入知名人物英文名（如 Christopher Nolan）時，TMDB `search/multi` 混入低相關度同名紀錄片標題，誤判為「標題命中」而不觸發人物 discover——改為優先判斷 `results[0]` 是否為人物，用真實 API 資料驗證修復（現在正確回傳《奧本海默》《星際效應》等作品）。
- **iOS 模擬器驗證**（送審前補跑，headless browser QA 之外的真機環境確認）：details → 點導演 chip → 搜尋結果正確（諾蘭完整作品清單，非誤判的紀錄片）→ 點返回鈕 → 正確回到原 details 頁，`router.push` 返回動線在真實 WKWebView 下行為符合預期。
- **範圍排除（v1 不做）**：書籍 genre（BISAC 分類）點擊、出版社點擊、獨立人物詳情頁。
- Spec：`openspec/changes/archive/2026-07-13-add-person-search/`（已歸檔）；設計文件：`~/.gstack/projects/ziziandydy-storio_2/iTubai-main-design-20260712-103457.md`

---

## 🎉 里程碑：v1.15.1（2026-06-09 送審 App Store）

真機回報兩個潛伏 bug（splash autoplay + 通知用戶名），build 17 已送審。

### ✅ 本批完成

1. **Splash 影片不自動播放**：`SplashScreen.tsx` 加 `videoRef`，在 `useEffect` 強制設 `video.muted = true` 並呼叫 `video.play()`。根因：React `muted` prop 只設 HTML attribute，不設 DOM property，iOS WKWebView autoplay 判斷 DOM property，故自動播放被擋（並出現播放鍵）。
2. **通知文字缺少用戶名稱**：`AppOpenReset.tsx` 從 `useAuth()` 取 `user`，讀 `user_metadata.display_name`（fallback `full_name` → `name` → `''`）傳給 `fetchNotificationState`。根因：第二個參數一直是空字串 `''`。

**版號**：v1.15.1（build 17）。

---

## 🎉 里程碑：v1.15.0（2026-06-07 真機驗證通過）

v1.14.0 上線後真機回報的三個 bug 修復 + 後端測試 CI，已完成並真機驗證。

### ✅ 本批完成

1. **後端測試 CI（P0）**：`.github/workflows/backend-tests.yml`，push/PR 觸發 pytest（dummy env，36 tests）。發版安全網第一層。
2. **導航 bug（P1）**：`AddToFolioModal` 內部導航 `window.location.href` → Next `router.push`，修 Capacitor 靜態 export 下「Go to my Storio 跳首頁」。
3. **通知 Primer polish（P2）**：Primer enable 成功後 `onComplete` 關卡片；`@capacitor/app` `appStateChange` 在 app 回前台重新檢查權限自動同步（修 13.5「deny→系統設定開→回 app 無反應」閉環）。OpenSpec 歸檔。
4. **時區修復（P3）**：方案 C 拆欄位——collections 新增 `archived_date` (date) 純日期欄位，`created_at` 收斂為建立時間。前端 `dateUtils` 全程無時區偏移。修「選 30 顯示 29」（負時區）。含 Supabase migration（dev+prod 已執行）。OpenSpec 歸檔。
5. **額外抓到**：`created_at` 為 None 覆蓋 DB default 成 null 的回歸（模擬器驗證時發現，上線前修掉）。

**版號**：v1.15.0（build 15）。OpenSpec specs 新增 `collection-date-model`、更新 `local-notifications`。

---

## 🚧 v1.14.0 規劃中（等待 v1.13.0 審核通過後實作）

**核心功能**：個人化本機通知（Local Notification）

### 功能概覽

| 功能 | 說明 |
|------|------|
| Log a story 通知 | 距上次典藏 ≥ 3 天時提醒 |
| Folio reflection 通知 | 未評分收藏或心得逾期時提醒 |
| 行為學習時段 | 靜默學習用戶活躍時段，自動調整通知時間 |
| 智慧忽略偵測 | 連續 3 次未回應自動停止該觸發路徑 |
| Permission Primer | 首筆 Storio 後才請求 iOS 通知權限 |
| Profile > Notifications | 主開關 + 兩個類型開關 |

**OpenSpec**：`openspec/changes/local-notifications/`
**PRD**：見 `docs/PRD.md` Section 3.7
**技術決策**：見 `openspec/changes/local-notifications/design.md`

> v1.14.0 不開放使用者自行設定時間與間隔，全部 hardcoded 於 `notification-config.ts`。
> v1.15.x 將視情況加入：Push Notification（n8n）、通知時間自訂 UI。

---

## 🎉 里程碑：v1.13.0 送審 App Store（2026-06-03）

v1.13.0（build 13）修復三個 bug 後送審：編輯 Storio 日期無效、Monthly Recap 書籍圖片（Google Books CORS）、混合搜尋/AI Search 空結果。

### ✅ 本版修復（v1.13.0）

1. **編輯 Storio 日期無效**：`RateAndReflectForm` 補傳 `initialDate`，`handleUpdate` 傳遞 `created_at` 至 API，service 層允許更新 `created_at`。

2. **Monthly Recap 書籍圖片（Google Books）無法渲染**：`MonthlyRecapTemplate` 外部圖片改走後端 proxy，修復 Puppeteer headless Chrome 的 CORS 限制。

3. **混合搜尋 / AI Search 空結果**：
   - 後端：語意搜尋（TMDB Discover / Google Books）空結果時 fallback 到 `fallback_query` 關鍵字搜尋
   - 前端：移除 `isSemanticQuery` 的 `q.length > 12`（避免精確標題誤送 AI endpoint）
   - 前端：keyword 搜尋空結果時自動 fallback 到 `/search/ai`

---

## 🎉 里程碑：v1.0 正式上架 App Store（2026-04-17）

Storio 1.0 正式通過 Apple 審核並上架 App Store。歷經動態島修復、Puppeteer 截圖重構、Apple Sign-In 整合、多次送審拒絕修復（NSCameraUsageDescription、隱私標籤、建構環境變數），最終成功上架。

---

## ✅ 最近完成 (Completed)

1.  **搜尋 Auto 模式改為 Keyword-First** *(2026-07-11)*:
    *   移除 Auto 模式的正則語意預判，改為一律先 keyword 搜尋、依當前分頁過濾後為空才自動 fallback 到 AI。
    *   Keyword 模式改為純關鍵字（空結果顯示 No Results，不再偷打 AI），三模式行為獨立。
    *   Spec：`docs/superpowers/specs/2026-07-11-auto-search-keyword-first-design.md`

1.  **iOS App Store v1.0 正式上架** *(2026-04-17)*:
    *   Build 3 通過 Apple 審查，Storio 1.0 正式上架 App Store。
    *   修復項目：`NSCameraUsageDescription`、`NSFaceIDUsageDescription`、隱私標籤（Name/Email 改為 Authentication）、移除無效測試帳號、修正建構環境變數（build-ios.sh 暫移 .env.local）。
    *   官網新增 Support & FAQ 區塊（修復 Apple Support URL 拒絕問題）。

2.  **iOS App Store 審核被拒修復（Build 2）** *(2026-04-10)*:
    *   **根本原因**：`Info.plist` 缺少 `NSCameraUsageDescription`，Profile 頭像 `<input type="file" accept="image/*">` 觸發相機選項時，iOS TCC crash（Bug Type 309 / SIGABRT）。
    *   **修復**：補齊 `NSCameraUsageDescription`（頭像拍照）與 `NSFaceIDUsageDescription`（Apple Sign-In）。
    *   **版號**：Xcode Build Number 從 1 升至 2，版號維持 1.0。
    *   **策略調整**：改為先 TestFlight 內部測試（相機/FaceID 權限提示驗證），通過後再送審。

2.  **iOS App Store Phase 1：Xcode & Apple Developer 設定** *(2026-04-10)*:
    *   App Icons 所有尺寸填滿（AppIcon.co 生成）。
    *   Bundle ID `com.storio.app` 與 Apple Developer Console 確認一致。
    *   版號升至 `1.0.0`（`package.json` + Xcode Build Number）。
    *   Sign in with Apple Capability 已加入 Xcode Signing & Capabilities。
    *   Deployment Target 確認 iOS 14.0+。
    *   隱私政策 URL `/privacy` 頁面內容確認符合 Apple 審查要求。

2.  **帳號刪除 UAT 測試（add-account-deletion Tasks 4.1~4.3）** *(2026-04-10)*:
    *   測試「清除資料」：`collections` 與 `stories` 紀錄移除，帳號 Profile 保留。
    *   測試「刪除帳號」：Supabase Auth 使用者已不存在，關聯資料同步清除。
    *   驗證多語系切換在 Privacy & Safety 頁面與 Modal 中正確。

3.  **iOS 動態島 UI Bug 修復** *(2026-04-07 真機驗證通過)*:
    *   修復動態島透明穿透問題（safe-area 遮罩、BACK 按鈕、Toast、Modal 關閉鈕位置）。
    *   修復動態島區域透明穿透與返回鍵遮擋問題。
    *   全頁面 QA 掃描通過，真機驗證（iPhone 16 Pro）。

4.  **分享圖片 Puppeteer 微服務 (Share Image Puppeteer Refactor)** *(2026-04-05)*:
    *   以 Railway Puppeteer 截圖微服務（`puppeteer-service/`）完全取代 `html-to-image`，徹底解決 `preserve-3d`、`backdrop-filter` 在 Safari/WKWebView 截圖失真問題。
    *   前端新增 `/share/render` 渲染頁，`ShareModal` 與 `MonthlyRecapModal` 改呼叫 Puppeteer service API。
    *   TTL Cache (`render-cache.ts`) + queue 機制確保不重複截圖、不阻塞 UI。
    *   10 個模板（6 MemoryCard + 4 MonthlyRecap）E2E 驗證全數通過，含繁體中文渲染。
    *   **修復 CJK 字型 Bug**：Puppeteer headless Chrome 在 `uppercase` + CSS 繼承 font-family 組合下無法正確載入 Noto TC 字型。修復方式：所有 CJK + `uppercase` 元素直接設定 `font-serif` / `font-sans`，不依賴繼承。
    *   `3d` 模板 preserve-3d 效果已可正確截圖（原 html-to-image 限制已解除）。

2.  **首次使用引導學習卡 (Onboarding Feature Guide)** *(2026-03-20)*:
    *   新增 `OnboardingGuideModal`：4 張卡片輪播（Embla Carousel + dot indicator 可點擊回上一步）。
    *   新增 `FeatureGuideCard`：Storio / Explore & Collect / Score & Reflect / Recap & Share。
    *   略過 / 底部按鈕使用 `safe-area-inset` 適配 iOS 瀏海 & Home Indicator。
    *   首頁登入流程結束後 400ms 延遲 fade-in，`localStorage` 控制不重複顯示。
    *   Profile → About 新增「如何使用 / How to Use」入口（可重新觀看）。
    *   支援繁中 / 英文雙語，統一使用 `locales.ts`。
2.  **隱私與安全性 (Privacy & Safety)** *(實作完成，待 UAT 驗證)*:
    *   在 Profile 頁面實作 `Privacy & Safety` 子視圖。
    *   實作「清除所有資料」與「刪除帳號」功能，整合後端 API。
    *   採用與 `StoryCard` 刪除一致的 UX，需輸入確認字串 ("CLEAR DATA" / "DELETE ACCOUNT")。
    *   OpenSpec change: `add-account-deletion`（剩 4.1~4.3 UAT 測試任務未完成）
2.  **正式產品介紹頁 (Landing Page Refinement)**:
    *   重構 `index.html` 為沉浸式產品介紹頁。
    *   實作「金探子」滑鼠跟隨光暈、啟動展開動畫。
    *   實作雙語切換 (EN/ZH) 邏輯。
    *   整合「多次觀看紀錄」、「AI 共筆心得」等核心敘事。
    *   展示團隊成員與 Builder 轉型故事。
2.  **Sprint 7 基礎建設 (Native iOS Refactor)** *(路由靜態化完成；iOS 原生部分待 Apple Developer 帳號)*:
    *   **路由靜態化**: ✅ 將 `/details/[type]/[id]` 重構成 `/details?id=...`，確保 `output: 'export'` 成功。
    *   **原生分享整合**: ✅ 導入 `@capacitor/share` 與 `@capacitor/filesystem` 解決 iOS 分享空白問題。
    *   **啟動體驗優化**: 設定 `launchAutoHide: false` 並更換原生 Splash 圖檔為純黑，實現無縫進入動畫。
    *   **動態島適配**: 修正 Header `sticky` 邏輯與安全區域遮罩，防止內容穿透動態島。
    *   OpenSpec change: `ios-static-export-refactor`（Tasks 4.x~7.x 需 Apple Developer 帳號，暫緩）
3.  **Profile 頁面重構 (UX Polish)**:
    *   移除未開發完成的「安全性與隱私」與「通知」。
    *   重構「聯絡我們」為次級頁面 (Sub-view)，支援自動帶入標題的 `mailto:` 功能。
    *   將版號改為動態讀取 `package.json`。
4.  **自動化 Release 流程**: 導入 `standard-version` 實作自動版號升級與 `CHANGELOG.md` 生成。
5.  **訪客登入 Logo**: 修復 `OnboardingModal.tsx` 中損壞的 Logo 路徑。
2.  **描述文字截斷**: 在 `StoryDetailsView.tsx` 實作「查看更多」/「顯示部分」功能。
3.  **隱藏未評分顯示**: 在 `StoryCard.tsx` 中，將尚未評分的項目完全隱藏評分指標。
4.  **重複收藏警告**: 更新 `AddToFolioModal` 與 `DetailsPage`，若已收藏則提示「再次觀看/閱讀」的意圖，而非簡單的警告。
5.  **空白心得設計**: 重新設計 `/collection/[id]` 中的個人心得卡片，使其在沒有內容時依然優雅。
6.  **導覽一致性**: 將首頁的手動 FAB 替換為統一的 `NavigationFAB`，並更新顏色以符合 Storio 美學。
7.  **術語優化**:
    - 將 "Builder" 替換為 "Apprentice"。
    - 英文版統一將 "TV Series" 改為 "Series"。
    - 更新「新增/詳情」按鈕。
8.  **身分驗證與引導 (Auth & Onboarding)**:
    - 實作 Email OTP 登入流程。
    - 優化 Onboarding Modal 佈局 (動態寬度)。
    - 設定 Google/Apple OAuth。✅ Apple Sign-In 已完成（native + web hybrid）。✅ Google Sign-In 已完成（native iOS，v1.1.3）。
9.  **館藏與詳情 (Collection & Details)**:
    - 修復 "Series" 顯示為 "Book" 的 Bug。
    - 實作安全的刪除對話框 (需輸入 "REMOVE")。
    - 支援自訂收藏日期。
    - 優化行事曆視圖 (聚焦當月，為未來留白)。
    - 優化 StoryDetailsView 佈局 (高斯模糊背景、海報下方顯示 Metadata)。
10. **搜尋 (Search)**:
    - 實作手動觸發搜尋 (Enter/點擊)。
    - 修復手機版鍵盤收合問題。
    - 優化輸入框佈局 (右側送出按鈕、針對中日韓語系優化輸入狀態)。
11. **AI 功能**:
    - 加入 OpenAI 作為建議功能的備援。
    - 修復建議渲染邏輯 (傳遞劇情大綱)。
12. **書籍詳情 (Book Details)**:
    - 在檔案區加入 ISBN (可複製)、出版商、頁數資訊。
    - 加入「閱讀指南」(Google Play 連結)。
    - 在媒體區加入「試閱」與封面縮圖。
    - **深度客製化分享 (Share & Export)**:
        - 實作 `ShareModal` 提供即時預覽、內容開關。
        - 比例切換: 暫時隱藏 4:5 與 1:1，專注於 9:16 (IG Story) 最佳體驗。
        - 按鈕視覺: 移除不自然的金色陰影，改用一致的細邊框發光樣式 (`bg-white/10`)，模板選單改為兩欄 (2-column) 佈局。
    - **視覺模板完成**:
        - **Default**: 模糊背景 + 懸浮卡片。
        - **Pure**: 極簡滿版海報 Overlay (底部 Logo 簡化)。
        - **Ticket**: 復古電影票根 (Logo 簡化)。
        - **Retro TV**: CRT 螢幕效果，支援 "TV Series" 標籤。
        - **Shelf**: 深色圖書館背景，評分移至上方，心得移至下方浮水印卡片。
        - **Desk (New)**: 桌面平放視角 (`desk_bg.jpg`)，書本完美置中，文字與評分完全移出書本封面，展現極致寫實感。
    - **統一設計**: 全模板導入 **Stamp Rating (印章評分)** 元件。
    - **原生分享**: 整合 Web Share API，支援 iOS/Android 原生分享選單。
14. **測試強韌性 (Test Robustness)**:
    - 重構 Playwright 測試 (`guest_limit`, `search_and_collect`) 以支援多語系環境與 UI 動畫等待。
15. **Sprint 5.5 UI/UX 細節優化 (Terminology & Consistency)**:
    - **多國語系字串與術語統一**:
        - "加入" 動作統一為 "Add to Storio" / "加入"。
        - 切換頁籤的 "Search" 改為 "Explore" / "探索"。
        - 撰寫心得統一為 "Reflection" / "心得" (取代 Note/Inscribe)。
        - 英文版社群評分顯示 "Rating"，中文顯示 "評分"。
    - **視覺與排版修正**:
        - 針對未評分卡片的金色呼吸字串從 `RATE` 改為 `SCORE`。
        - 詳情頁 (`StoryDetailsView`) 重新接回後台 `public_rating` 資料，顯示社群評分 (Star icon)。
        - 強制將撰寫心得 (`RateAndReflectForm`) 的輸入框與 AI 潤飾限制在 100 字 (含字數計數器)。
        - 館藏 ID 前綴由 `FOLIO_REF_` 簡化為 `REF_`。
        - 修正首頁 `HeroStats` 與 `RateAndReflectForm` 按鈕中 Hardcoded 寫死的英文字串，全面接入 `locales.ts`。
    - 實作 PWA 支援，使用者可將 Web App 加入主畫面。
17. **Sprint 7 基礎建設 (Native iOS Refactor)**:
    - **動態網路適配**: 實作自動偵測與綁定區網 IP 腳本 (`get-ip.js`)，解決 iOS Simulator / 真機測試時跨網段的 CORS 與連線失聯問題。
    - **iOS 模擬器除錯**: 排除了 503 Backend 無法回傳 CORS Headers 的假錯覺，確保 `cap sync` 與 Xcode 的靜態資源更新流程順暢。
    - **原生視覺優化**: 取代預設 Capacitor Splash Screen 與 Icon。實作 `NativeSplash.hide()` 以無縫銜接 Web 端飛入動畫。
    - **路由降級策略**: 將原有的 Next.js App Router 的動態路由 (`[id]`) 完全重構成依賴 Query Parameters 的靜態頁面，使得 `output: 'export'` 能夠 100% 成功。

## 🚀 SPRINT 5: 深度客製化分享 (已完成大部分核心功能)
- [x] **分享控制中心**: 實作 `ShareModal` 提供即時預覽、比例切換 (9:16, 4:5, 1:1) 與內容開關。
- [x] **主視覺模板**:
    - [x] **預設模糊 (Default Blur)**
    - [x] **純海報 (Pure Image)**
    - [x] **電影票根 (Cinema Ticket)**
    - [x] **3D立體書 (3D Paperback)**: 包含書櫃環境與厚度優化。
    - [x] **復古電視 (Retro TV)**: 新增模板。
- [x] **典藏容量限制 (Guest Limit Upsell)**: 完成訪客 10 筆上限與引導註冊流程。
- [x] **原生分享 (Native Sharing)**: 整合 Web Share API。

### 🔒 Security & Reliability (Wave 3 Deferred — 2026-03-24)

> 以下項目來自 security-hardening change Wave 3，已分析影響範圍與嚴重度。

- [x] **[REL-1] 環境變數啟動驗證 (Env Var Startup Validation)** *(已完成 2026-03-24)*
  - **說明**：`TMDB_API_KEY`、`SUPABASE_URL`、`SUPABASE_ANON_KEY` 缺少時，服務仍正常啟動，直到第一次請求才會拋出錯誤（Supabase 連線失敗 / TMDB API 401）。
  - **影響範圍**：所有 API endpoints，Railway 部署後偵錯困難。
  - **Severity**：`Medium` — 不影響正常運行的使用者，但部署時若漏設 env var 會造成所有功能靜默失效，難以即時察覺。
  - **修復方向**：在 `server/app/main.py` 的 FastAPI `lifespan` startup event 中驗證必要 env var，缺少時立即 `raise RuntimeError` 中止啟動。

- [x] **[REL-2] datetime 解析容錯 (datetime.fromisoformat Error Handling)** *(已完成 2026-03-24)*
  - **說明**：`server/app/repositories/collection_repo.py:110` 使用 `datetime.fromisoformat()` 解析 Supabase 回傳的 `created_at`，若欄位為 `None` 或格式異常（如時區字串差異），直接拋出 `ValueError` / `TypeError`，導致整個 API call 500。
  - **影響範圍**：`GET /api/v1/collection/` — 館藏列表頁面完全無法載入。
  - **Severity**：`Medium-High` — 資料異常時影響核心功能，使用者看到空白頁面且無有意義的錯誤訊息。
  - **修復方向**：對所有 `datetime.fromisoformat()` 呼叫加入 `try/except (ValueError, TypeError)`，解析失敗返回 `None`，上層 service 層以 `None` 作為預設值排序。

### 🐛 Known Issues (Bugs to Fix)
- [x] **分享預覽與匯出圖片空白 (Share Image Blank Issue — Round 2)**: *(已修復 2026-03-20)*
  - **Root Cause 1**：`proxy.py` 手動設定 `Access-Control-Allow-Origin: *` 與 `CORSMiddleware` 的 `allow_credentials=True` 產生規範衝突，導致 Safari 拒絕 CORS 回應。→ 已移除手動 Header。
  - **Root Cause 2**：`3d` 書架模板使用外部 Unsplash URL 作為 CSS `background-image`，繞過 Proxy 機制，`html-to-image` 無法安全抓取，觸發 Tainted Canvas。→ 已下載圖片至本地 `library_bg.jpg` 並改為 `<img>` 標籤。
  - **加強**：新增 `SHARE_DEBUG` 全流程 log（6 個環節）與空白圖自動偵測，方便未來真機除錯。
- [x] **`3d` 書架模板截圖視覺失真 (CSS 3D Transforms)** *(已修復 2026-04-05)*: 改用 Puppeteer 微服務截圖後，`preserve-3d` 透視效果完整保留，3D 書本視覺正常。`html-to-image` 限制已解除。
- [x] **行事曆視圖進入時跳至一月 (CalendarView Month Jump Bug)**: *(已修復 2026-03-20)* IntersectionObserver 在掛載瞬間觸發 `loadMoreMonths('prev')`，將舊月份 prepend 至頂部，導致頁面跳回最舊月份。→ 新增 `isScrollReadyRef`，等初始 `scrollIntoView` 完成後才開放 Observer 觸發。

## 📅 SPRINT 6: 月度回顧與擴充功能 (已完成核心分享機制)
- [x] **月度回顧**: 實作行事曆視圖的總結分享 (Instagram 貼文格式)。

## 🔮 未來開發事項 (Future Roadmap)
- [ ] **分享格式擴充**: 實作不同比例的圖片分享 (Portrait 4:5, Square 1:1)。
- [x] **智慧提醒 (Notifications)**: ✅ 已完成（v1.14.0，見 `docs/PRD.md` Section 3.7 與 `openspec/changes/archive/`）。
- [ ] **影像辨識 (Vision AI)**: 支援上傳票根或截圖，自動辨識並快速加入 Memory。
- [ ] **新增類別 (Shows)**: 擴充系統以支援「展演 (Show)」類別（如表演、劇場、演唱會等），包含搜索與建立 Memory。評估結論見 `~/.gstack/projects/ziziandydy-storio_2/iTubai-main-design-20260712-103457.md`（擱置中，重啟門檻：Ticketmaster TW API 覆蓋率 spike 或 3+ 用戶明確需求）。
- [x] **Apple Sign-in**: ✅ 已完成（2026-04-05）。Hybrid 方案：iOS 原生用 Face ID（`@capacitor-community/apple-sign-in` + `signInWithIdToken`），Web 用 OAuth redirect。GitHub Actions 每 5 個月自動更新 JWT Secret Key。
- [x] **智慧搜尋 (AI Search)**: ✅ 已完成（v1.13.0 起上線 Auto/AI/Keyword 三模式搜尋；v1.16.0 擴充人物/類型 chips 探索，見上方 add-person-search 條目）。
- [ ] **分季收藏 (Seasons)**: 讓使用者可以自由新增影集的不同季別，例如只將已觀看的第 1~5 季加入收藏，而尚未觀看的第 6~8 季則保留。

## 🎨 UI/UX 優化 (UI/UX Polish)
- [x] **多次觀看記錄 (Multi-View)**: 已確立設計方向，針對重複觀看同一作品，將建立**多張獨立的 Memory Card**。
- [x] **社群功能**: 目前確認**沒有社群發佈的規劃**，專注於個人典藏室體驗。
- [x] **社群功能**: 目前確認**沒有社群發佈的規劃**，專注於個人典藏室體驗。