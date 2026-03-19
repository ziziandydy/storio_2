# Storio 專案待辦清單與未來優化 (Backlog & Future Improvements)

2026-02-21 UAT 測試後紀錄。

## ✅ 最近完成 (Completed)
1.  **隱私與安全性 (Privacy & Safety)**:
    *   在 Profile 頁面實作 `Privacy & Safety` 子視圖。
    *   實作「清除所有資料」與「刪除帳號」功能，整合後端 API。
    *   採用與 `StoryCard` 刪除一致的 UX，需輸入確認字串 ("CLEAR DATA" / "DELETE ACCOUNT")。
    *   (待 UAT 驗證)
2.  **正式產品介紹頁 (Landing Page Refinement)**:
    *   重構 `index.html` 為沉浸式產品介紹頁。
    *   實作「金探子」滑鼠跟隨光暈、啟動展開動畫。
    *   實作雙語切換 (EN/ZH) 邏輯。
    *   整合「多次觀看紀錄」、「AI 共筆心得」等核心敘事。
    *   展示團隊成員與 Builder 轉型故事。
2.  **Sprint 7 基礎建設 (Native iOS Refactor)**:
    *   **路由靜態化**: 將 `/details/[type]/[id]` 重構成 `/details?id=...`，確保 `output: 'export'` 成功。
    *   **原生分享整合**: 導入 `@capacitor/share` 與 `@capacitor/filesystem` 解決 iOS 分享空白問題。
    *   **啟動體驗優化**: 設定 `launchAutoHide: false` 並更換原生 Splash 圖檔為純黑，實現無縫進入動畫。
    *   **動態島適配**: 修正 Header `sticky` 邏輯與安全區域遮罩，防止內容穿透動態島。
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
    - 設定 Google/Apple OAuth。
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

### 🐛 Known Issues (Bugs to Fix)
- [ ] **分享預覽與匯出圖片空白 (Share Image Blank Issue Returned)**: 在 Preview 和實際分享時，圖片又出現無法正確帶入的問題。(*Note: 先前修復包含 `html-to-image` 的 Safari 緩存問題但似乎已失效或有新狀況，待下次開發時排查*)。
  - *Previous Fix Attempt*: Added `includeQueryParams: true` to prevent Base64 cache collisions, explicitly set CORS (`crossOrigin="anonymous"`), and apply image `w` compression payload thinning.

## 📅 SPRINT 6: 月度回顧與擴充功能 (已完成核心分享機制)
- [x] **月度回顧**: 實作行事曆視圖的總結分享 (Instagram 貼文格式)。

## 🔮 未來開發事項 (Future Roadmap)
- [ ] **分享格式擴充**: 實作不同比例的圖片分享 (Portrait 4:5, Square 1:1)。
- [ ] **智慧提醒 (Notifications)**: 規劃與客製化推播通知功能，提醒用戶記錄。
- [ ] **影像辨識 (Vision AI)**: 支援上傳票根或截圖，自動辨識並快速加入 Memory。
- [ ] **新增類別 (Shows)**: 擴充系統以支援「展演 (Show)」類別（如表演、劇場、演唱會等），包含搜索與建立 Memory。
- [ ] **Apple Sign-in**: 待註冊 Apple Developer 帳號後串接。
- [ ] **智慧搜尋 (AI Search)**: 將現有搜尋升級為 AI 驅動的自然語言搜尋，允許使用者透過中英文、作者、書名、作品特色等描述快速尋找與發現作品。
- [ ] **分季收藏 (Seasons)**: 讓使用者可以自由新增影集的不同季別，例如只將已觀看的第 1~5 季加入收藏，而尚未觀看的第 6~8 季則保留。

## 🎨 UI/UX 優化 (UI/UX Polish)
- [x] **多次觀看記錄 (Multi-View)**: 已確立設計方向，針對重複觀看同一作品，將建立**多張獨立的 Memory Card**。
- [x] **社群功能**: 目前確認**沒有社群發佈的規劃**，專注於個人典藏室體驗。
- [x] **社群功能**: 目前確認**沒有社群發佈的規劃**，專注於個人典藏室體驗。