# Storio 2 產品需求文件 (PRD) - v5.1 (Current State)

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
    *   ✅ **必須使用**: Folio (館藏), Stories (故事/藏品), Memories (記憶), Inscription (撰寫心得), Curator (策展人/用戶).

---

## 2. 視覺設計系統 (Design System)

### 2.1 色彩計畫 (Color Palette)
系統採用深色模式 (Dark Mode Only)，強調內容的沉浸感。

*   **Global Background (Folio Black)**: `#0d0d0d`
    *   用於全站背景，創造深邃空間感。
*   **Surface / Card (Card Surface)**: `#121212`
    *   用於卡片、Modal、區塊背景。
    *   Hover 狀態: `#1a1a1a`。
*   **Primary Accent (Storio Gold)**: `#c5a059` (修正自舊版橘色)
    *   用於 Logo、主要按鈕、選取狀態、圖示高亮、星級評分。
    *   *注意*: 這是品牌的核心識別色，需嚴格執行。
*   **Text Colors**:
    *   Primary: `#ffffff` (標題、重要資訊)
    *   Secondary: `#e0e0e0` (次要資訊)
    *   Description: `#888888` (標籤、輔助說明)
*   **Borders (Outline)**: `#2a2a2a` (細微的邊框分割)。

### 2.2 排版與佈局 (Layout & Typography)
*   **Font**: Inter / Roboto (內文), Serif (標題，增添典藏感)。
*   **Mobile First**: 所有設計優先考量 iPhone 16 Pro 比例，最大化可視空間。
*   **Navigation**:
    *   **FAB (Floating Action Button)**: 位於右下角，整合「搜尋」與「導航」功能，取代傳統底部導航欄 (Tab Bar)，以釋放螢幕空間。
    *   **Header**: 沉浸式透明 Header，隨捲動出現毛玻璃效果 (`backdrop-blur`)。

---

## 3. 功能模組與規格 (Functional Specifications)

### 3.1 啟動與引導 (Onboarding)
*   **Splash Screen**: 播放 `/video/splash.mp4`，結束後淡出。
*   **Onboarding Modal**:
    *   **Layout**: 動態佈局，輸入 Email/OTP 時隱藏側邊圖片以最大化輸入空間。
    *   **Auth Options**: 
        *   Google, Apple (Supabase OAuth)。
        *   **Email OTP**: 輸入 Email -> 接收 6 位數驗證碼 -> 登入 (取代 Magic Link)。
    *   **Guest Mode**: 允許免登入試用，限制收藏 10 筆。
    *   **Visuals**: 背景圖 `/image/authBackground.webp` (設定 `sizes` 屬性)，Logo 無背景色。

### 3.2 首頁 (Home)
*   **Hero Section**: 
    *   標題: "Your Digital Pensieve" (你的數位儲思盆)。
    *   背景: 帶有漸層遮罩的 Hero Image。
*   **Stats Dashboard**: 
    *   顯示收藏總數、總時數。
    *   支援輪播切換不同維度的統計 (本週、趨勢)。
*   **Section Sliders**:
    *   包含: Trending Movies, Trending Series, Trending Books。
    *   **Terminology**: 英文介面統一使用 "Series" (非 TV Series)。
    *   **視覺**: 隱藏捲軸 (`scrollbar-hide`)，卡片具備 `snap-center` 效果。

### 3.3 搜尋與探索 (Search)
*   **Bottom-Focused Design**: 
    *   搜尋框與過濾器固定於底部。
    *   **Manual Trigger**: 輸入時不自動搜尋，需按下 Enter (自動收起鍵盤) 或點擊搜尋圖示才觸發。
    *   **UX Optimization**: 搜尋按鈕移至輸入框右側 (使用 ArrowUp Icon)，與清除按鈕整合，提升單手操作性。解決了 CJK 輸入法重複問題。
    *   **Filters**: Movies / Series (合併顯示), Books。
*   **API 整合**:
    *   **Movies/Series**: 整合 TMDB API (雙重搜尋)。
    *   **Books**: 整合 Google Books API，並透過 AI (Gemini) 進行本地化推薦。

### 3.4 詳情頁 (Details) - `/details/[type]/[id]`
*   **Backdrop-First Design**:
    *   頂部大面積背景海報 (Opacity 0.6, 無模糊)，底部帶有漸層 (`via-folio-black/20`, `to-folio-black/80`)。
    *   **Header Info**: 標題、導演/作者、年份等資訊位於**海報下方**的黑色區塊，避免文字與影像重疊。
    *   **Category Badge**: 標題上方顯示作品類別標籤 (如 MOVIE, SERIES, BOOK)。
*   **Content**:
    *   顯示 Cast (演員/作者群)。
    *   顯示 Overview (支援展開)。
    *   **The Dossier (檔案卷宗)**: 2x2 數據網格。
        *   Movie/Series: Box Office, Studio, Origin, Language.
        *   Book: ISBN (可複製), Publisher, Pages, Language.
    *   **Where to Watch/Read**:
        *   Movie/Series: 串流與租借平台 Logo (TMDB Provider)。
        *   Book: Google Play 購買連結 (若可販售)。
    *   **Related Media**: 預告片與劇照區塊，移至左側欄位最下方 (Overview 之後)。書籍包含 "Read Sample" 與多尺寸封面。
*   **Actions**:
    *   Sticky "Add" 按鈕 (或 "Edit" 若已收藏)。
    *   若已收藏，顯示個人的評分與心得卡片。

### 3.5 收藏與心得 (Add to Folio Flow)
*   **Modal Flow**:
    1.  **Rate & Reflect Form**:
        *   **Layout**: Archived At (Date) -> My Rating -> My Reflection。
        *   **Date Picker**: 支援自訂收藏日期，顯示格式 `MMM DD YYYY`。
        *   **AI Suggestions**: 始終顯示建議 (傳遞 synopsis 給 AI)。
        *   **AI Refine**: 潤飾心得。
    2.  **Success State**:
        *   Icon: Storio Gold 打勾。
        *   按鈕: "Go to My Storio", "Continue Browsing" (i18n)。

### 3.6 我的館藏 (My Storio) - `/collection`
*   **Layout**: Mobile 雙欄 (1x1)，Desktop Bento Grid。
*   **Calendar View**:
    *   **Default View**: 進入時自動定位於**當前月份**。
    *   **Future Spacer**: 保留當月下方的空白區塊 (代表下個月)，但不顯示文字，且禁止繼續向下滑動載入未來月份。
*   **Story Card**: 
    *   Overlay 按鈕簡化為 "Add" 與 "Details"。
    *   顯示 "Series" 標籤。
*   **Item Detail**:
    *   Delete Confirm: 彈出 Modal 要求輸入 "REMOVE" 確認。
    *   Back Button: 簡化為 "Back" (無 Collection 字樣)。

---

## 4. 技術架構 (Technical Architecture)

### 4.1 Frontend (Client)
*   **Framework**: Next.js 14 (App Router).
*   **State Management**: Zustand (`viewStore`, `settingsStore`).
*   **Styling**: Tailwind CSS + Framer Motion (Animations).
*   **Internationalization**: Custom Hook (`useTranslation`), 支援 `zh-TW` 與 `en-US`。
*   **Auth**: Supabase Auth (OAuth + Email OTP)。

### 4.2 Backend (Server)
*   **Framework**: Python 3.12 + FastAPI.
*   **Database**: Supabase (PostgreSQL).
*   **ORM**: 原生 Supabase Client (`postgrest`), 配合 Pydantic Schemas。
*   **Services**:
    *   `SearchService`: 整合 TMDB 與 Google Books API (新增 `langRestrict` 與 `projection=full`)。
    *   `GeminiService`: 
        *   生成書籍推薦。
        *   生成心得建議 (加入 OpenAI 備援)。
        *   潤飾心得。
    *   `CollectionService`: 處理 CRUD 與商業邏輯。

### 4.3 資料模型 (Schema Key Changes)
*   **StoryCreate**: 
    *   新增 `created_at: Optional[datetime]`，支援自訂日期。
*   **API Response**:
    *   `directors`: `List[str]`
    *   `authors`: `List[str]`
    *   `related_media`: `List[MediaAsset]`

---

## 5. 待優化與未來規劃 (Roadmap)
*   **Social Sharing**: 實作 Memory Card 與 Calendar Recap 分享功能 (Sprint 4)。
*   **PWA**: 實作 PWA 支援 (Next Step)。
*   **Profile Page**: 完善個人檔案頁面的統計圖表 (Charts)。
*   **Export**: 匯出 Folio 資料 (CSV/JSON)。
