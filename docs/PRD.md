# Storio 2 產品需求文件 (PRD) - v5.2

**最後更新日期**: 2026-02-23
**版本狀態**: Production Candidate
**核心概念**: "Collect stories in your folio."

---

## 1. 產品願景與核心隱喻
**Storio** 是一個致力於「收藏記憶」的數位空間。不同於一般的清單工具，Storio 將收藏書籍與影視作品的行為儀式化。

*   **核心隱喻**: **儲思盆 (Pensieve)** 與 **個人典藏室 (Folio)**。
*   **用戶體驗目標**: 靜謐、沉浸、精緻。每一次的「收藏」都是一次「銘刻 (Inscription)」。
*   **術語規範**:
    *   ❌ **嚴禁使用**: Desert, Pyramid, Sand, Dig, Bricks (雖然主色調為沙漠金，但文案需保持現代與典藏感，避免考古隱喻)。
    *   ✅ **必須使用**: Folio (館藏), Stories (故事/藏品), Memories (記憶), Curator (策展人/用戶).
    *   ✅ **UI 術語統一**: 
        *   首頁導航探索: "Explore" (探索) 
        *   加入館藏行為: "Add to Storio" (加入 / 加入 Storio)
        *   撰寫心得: "Reflection" (心得)
        *   社群評分: "Rating" (評分) 
        *   個人評分指標 (未評分時): "SCORE" (取代舊的 RATE)
        *   Collection ID: 統一使用 `REF_` 開頭。

---

## 2. 視覺設計系統 (Design System)

### 2.1 色彩計畫 (Color Palette)
系統採用深色模式 (Dark Mode Only)，強調內容的沉浸感。

*   **Global Background (Folio Black)**: `#0d0d0d`
    *   用於全站背景，創造深邃空間感。
*   **Surface / Card (Card Surface)**: `#121212`
    *   用於卡片、Modal、區塊背景。
    *   Hover 狀態: `#1a1a1a`。
*   **Primary Accent (Storio Gold)**: `#c5a059`
    *   用於 Logo、主要按鈕、選取狀態、圖示高亮、星級評分、編輯/分享小圖示。
*   **Text Colors**:
    *   Primary: `#ffffff` (標題、重要資訊)
    *   Secondary: `#e0e0e0` (次要資訊)
    *   Description: `#888888` (標籤、輔助說明)
*   **Borders (Outline)**: `#2a2a2a` (細微的邊框分割)。

### 2.2 排版與佈局 (Layout & Typography)
*   **Font**: Inter / Roboto (內文), Serif (標題，增添典藏感)。
*   **Mobile First**: 所有設計優先考量 iPhone 16 Pro 比例，最大化可視空間。
*   **Navigation**:
    *   **FAB (Floating Action Button)**: 位於右下角，整合「搜尋」與「導航」功能，取代傳統底部導航欄 (Tab Bar)。
    *   **Dynamic Header**: 登入後，首頁右上角的個人檔案按鈕會自動切換為用戶頭像（若已上傳）。

---

## 3. 功能模組與規格 (Functional Specifications)

### 3.1 啟動與引導 (Onboarding)
*   **Splash Screen**: 播放 `/video/splash.mp4`，結束後淡出。
*   **Onboarding Modal**:
    *   **Layout**: 動態佈局，支援 Google, Apple OAuth 與 Email OTP (6 位數驗證碼)。
    *   **Profile Completion (Sprint 4)**:
        *   **觸發**: 新用戶首次登入後彈出，包含：使用者名稱、性別 (下拉選單)、生日 (日期選擇器)。
        *   **頭像上傳**: 支援點擊頭像區域選取檔案或拍照上傳至 Supabase Storage (限制 5MB)。
        *   **跳過機制**: 使用者可選「暫時跳過」，標記存於 `sessionStorage`，確保不會在同一次 Session 中重複干擾。
*   **Guest Mode**: 允許免登入試用，限制收藏 10 筆。達上限時出現 `GuestLimitModal` 引導註冊。

### 3.2 首頁 (Home)
*   **Hero Section**: 標題 "Your Digital Pensieve"。
*   **Stats Dashboard**: 顯示收藏總數。
*   **稱號系統 (Title System)**: 依據收藏數給予成就稱號：
    *   `> 99`: Pharaoh
    *   `>= 50`: Architect
    *   `>= 10`: Scribe
    *   `< 10`: Apprentice
*   **Section Sliders**: 包含 Trending Movies, Series, Books。

### 3.3 搜尋與探索 (Search)
*   **Bottom-Focused Design**: 搜尋框與過濾器固定於底部，手動觸發搜尋以優化 CJK 輸入體驗。
*   **API 整合**: 整合 TMDB 與 Google Books API。

### 3.4 詳情頁 (Details)
*   **Backdrop-First Design**: 頂部大面積背景海報，文字資訊位於海報下方黑色區塊 (包含支援 TMDB/Google Books 之 Community Rating)。
*   **Social Sharing & Visual Templates (New Feature)**:
    *   **核心功能**: 將單一作品轉化為高度客製化的精美分享圖 (PNG)，支援原生系統分享 (Web Share API) 與下載。
    *   **分享機制**:
        *   優先使用 Web Share API 呼叫系統分享。
        *   分享時的預設文案需跟隨系統語系 (`i18n/locales.ts`) 翻譯，並附帶 `Frontend URL` 連結。
        *   備援提供「下載圖片」與「複製圖片」。
    *   **互動模式**: 
        *   點擊詳情頁分享按鈕開啟全螢幕預覽。
        *   為提升行動端相容性，所有變形語法（`transform` 與 `scale`）皆需使用 Tailwind CSS `className` 實作，避免 inline `style` 被忽略導致未置中。
        *   底部抽屜 (Drawer) 提供模板切換、比例調整 (9:16, 4:5, 1:1) 與內容開關。
        *   所有的選項按鈕與文字標籤皆已全面接入 i18n 多國語系架構，隨設定即時切換。
        *   點擊預覽區域時，抽屜自動收合，方便檢視完整視覺效果。
    *   **視覺模板 (Templates)** (呈兩欄式網格排列):
        *   **Default (Blur)**: 經典高斯模糊背景，搭配懸浮卡片與統一的「印章評分 (Stamp Rating)」。
        *   **Pure (Image)**: 極簡滿版海報，資訊與印章直接疊加 (Overlay)，強調視覺衝擊力。(底部 Logo 精簡為 STORIO)。
        *   **Ticket (Cinema)**: 復古電影票根設計，帶有虛線打孔細節，移除多餘的 QR Code 以保持俐落。
        *   **Retro TV (CRT)**: 復古 CRT 螢幕外框，帶有掃描線與螢幕反光效果。
            *   針對 "TV" 類型顯示 "TV Series" 標籤。
            *   海報採用 `object-contain` 確保完整顯示不被裁切。
        *   **Bookshelf (3D 書櫃)**: 擬真 3D 精裝書模型。
            *   **環境**: 置於深色圖書館木紋書櫃前 (`#2a1a10`)，帶有柔和的聚光燈陰影。
            *   **細節**: 固定書背寬度展現厚實感，評分 (Rating) 放大置於書本正上方，心得 (Reflection) 以深色質感玻璃卡片浮動於畫面正下方，避免遮擋封面。
        *   **Desk (桌面平放)**: 擬真桌面平拍視角。
            *   **環境**: 使用自訂的高畫質木紋桌面背景照 (`desk_bg.jpg`)，帶有咖啡杯與鋼筆的實景畫面。
            *   **細節**: 書本完美置中於畫面，帶有微幅的 `translateY(-30px)` 與真實光影的 Drop Shadow。評分獨立置於整張圖的右上角，標題與心得獨立置於整張圖的左下角/正下方，確保書本封面 100% 完整無遮擋。
    *   **統一語彙**: 所有模板皆採用統一設計的 **Stamp Rating (印章評分)** 元件，以傾斜角度與粗襯線字體呈現，強化「審核/收藏」的儀式感。

### 3.5 收藏與心得 (Add to Folio Flow)
*   **字數限制機制**: 寫入心得 (Reflection) 時，強制實施 100 字上限，以維持紀錄的精煉與卡片排版的美觀。AI 建議與潤飾內容也會受到同樣的 100 字限制。
*   **Guest Data Migration (Sprint 4)**:
    *   **功能**: 當訪客決定註冊時，其收藏紀錄自動轉移至新帳號。
    *   **實現**: 透過後端 RPC `migrate_guest_data` 處理。

### 3.6 我的館藏 (My Storio)
*   **Calendar View**:
    *   **Monthly Recap Share**: 點擊月份標題旁分享按鈕，生成 4:5 比例的閱聽總結圖片。
    *   **狀態**: 已實作，待 UAT 驗證。
*   **User Card (Profile)**:
    *   **整合設計**: 名稱、性別、生日直接顯示於主卡片底部（兩欄網格）。
    *   **微型圖示按鈕**: 編輯/儲存/取消按鈕移至卡片左/右上角，釋放底部空間。

---

## 4. 技術架構 (Technical Architecture)

### 4.1 Frontend (Client)
*   **State Management**: Zustand (`userStore` 處理全域用戶狀態同步, `viewStore`, `settingsStore`)。
*   **Localization (i18n)**: 內建靜態字典檔 (`locales.ts`) 與 `useTranslation` hook，支援 `en-US` 與 `zh-TW`。所有新增的 UI 文本（包含 Web Share API 所需字串）均需加入翻譯字典。
*   **Utility**: `getURL` 工具函式確保絕對 URL 重導向的健壯性。
*   **Libraries**: `html-to-image`, `downloadjs`。

### 4.2 Backend (Server)
*   **Database**: Supabase (PostgreSQL)。
*   **Storage**: 建立 `avatars` 公開儲存池，並配置 RLS 權限。
*   **Logic**: 實作 `migrate_guest_data` 儲存程序。

---

## 5. 待優化與未來規劃 (Roadmap)
*   **Social Sharing UAT**: 驗證分享圖片在行動端之佈局與下載正確性 (Current Focus)。
*   **Share Formats**: 支援不同比例的分享圖片 (4:5, 1:1)。
*   **Notifications**: 實作推播通知客製化提醒用戶記錄。
*   **Vision AI**: 支援影像辨識票根或截圖來快速加入 Memory。
*   **New Category (Shows)**: 擴充對「展演 (Show)」類別的支援 (表演、劇場、演唱會)。
*   ~~**PWA**: 實作 PWA 支援 (Next Step)。~~ (✅ 已完成，使用者可將網頁加入主畫面)
*   **Profile Page**: 完善個人檔案頁面的統計圖表 (Charts)。
*   **Export**: 匯出 Folio 資料 (CSV/JSON)。