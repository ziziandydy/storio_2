# Storio 2 產品需求文件 (PRD) - v5.0 (Current State)

**最後更新日期**: 2026-02-22
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
    *   背景圖: `/image/authBackground.webp` (需設定 `sizes` 屬性)。
    *   Logo: 純圖示，**無背景色**。
    *   登入選項: Google, Apple (Supabase Auth)。
    *   **訪客模式 (Guest)**: 允許免登入試用，限制收藏 **10** 筆資料。
    *   文案需強調 "Begin your curation journey"。

### 3.2 首頁 (Home)
*   **Hero Section**: 
    *   標題: "Your Digital Pensieve" (你的數位儲思盆)。
    *   背景: 帶有漸層遮罩的 Hero Image。
*   **Stats Dashboard**: 
    *   顯示收藏總數、總時數。
    *   支援輪播切換不同維度的統計 (本週、趨勢)。
*   **Section Sliders (橫向滑動列表)**:
    *   包含: Trending Movies, Trending Series, Trending Books。
    *   **視覺**: 隱藏捲軸 (`scrollbar-hide`)，卡片具備 `snap-center` 效果。
    *   **行為**: 點擊卡片開啟詳情，點擊卡片上的 "+" 直接開啟收藏 Modal。
    *   **View All**: 列表末端提供 "Find Stories" 卡片，導向搜尋頁 (影集導向 `filter=tv`)。

### 3.3 搜尋與探索 (Search)
*   **Bottom-Focused Design**: 
    *   搜尋框與過濾器 (Tabs) 固定於螢幕**底部**，便於單手操作。
    *   Tabs: Movies/TV (合併), Books。
*   **API 整合**:
    *   **Movies/TV**: 整合 TMDB API，同時搜尋電影與影集。
    *   **Books**: 整合 Google Books API，並透過 AI (Gemini) 進行本地化推薦與封面優化。
*   **結果展示**: 
    *   Grid 佈局。
    *   點擊卡片顯示 Overlay (包含 "Add to Storio" 與 "View Details" 按鈕)。

### 3.4 詳情頁 (Details) - `/details/[type]/[id]`
*   **Backdrop-First Design**:
    *   頂部大面積背景海報 (Opacity 0.6, 無模糊)，底部帶有漸層 (`via-folio-black/20`, `to-folio-black/80`)。
    *   **Header Info**: 標題、導演/作者、年份等資訊**移至海報下方**的黑色區塊，避免文字與影像重疊。
*   **Content**:
    *   顯示 Cast (演員/作者群)。
    *   顯示 Overview (劇情簡介)，過長時支援 "View More" 展開。
    *   **Related Media**: 預告片與劇照區塊，位於 Overview 下方。
*   **Actions**:
    *   Sticky "Add to Storio" 按鈕 (或 "Edit" 若已收藏)。
    *   若已收藏，顯示個人的評分與心得卡片 (Refection Snippet)。
*   **Data Handling**: 
    *   支援 `directors` 與 `authors` 陣列顯示。
    *   優先顯示中文元數據 (透過 `langRestrict` 與 `projection=full`)。

### 3.5 收藏與心得 (Add to Folio Flow)
*   **Modal Flow**:
    1.  **Duplicate Check**: 若已收藏，詢問是否為 "Re-watch" (重複觀看) 或 "Edit"。
    2.  **Rate & Reflect Form**:
        *   **Rating**: 1-10 星級評分 (支援小數點與懸停預覽)。
        *   **Date Picker**: **新增功能**，允許使用者自訂收藏日期 (預設今天)。
        *   **Reflection**: 心得文字輸入框。
        *   **AI Suggestions**: 根據 `title` 與 `synopsis` 自動生成 3 句短評建議，**始終顯示**供使用者點選。
        *   **AI Refine**: 使用 Gemini/OpenAI 潤飾使用者輸入的心得。
    3.  **Success State**:
        *   Icon: 使用 Storio Gold (`#c5a059`) 的打勾圖示。
        *   標題: "Successfully add to storio"。
        *   按鈕: 
            *   Primary: "Go to My Storio" (導向 `/collection`)。
            *   Secondary: "Continue Browsing" (關閉 Modal)。

### 3.6 我的館藏 (My Storio) - `/collection`
*   **Layout**:
    *   **Mobile**: **嚴格雙欄佈局 (2 Columns)**，卡片比例 1:1 或自適應，不跨欄。
    *   **Desktop**: **Bento Grid**，特定卡片跨行 (`row-span-2`) 或跨列 (`col-span-2`)，創造視覺韻律。
*   **View Switcher**: 支援 List (Grid), Calendar, Gallery 視圖切換。
*   **Story Card**:
    *   **Adaptive Aspect Ratio**: 移除硬編碼比例，適應 Bento Grid。
    *   **Indicators**: 顯示評分、媒體類型 (Movie/Book/TV)、日期。
    *   **Smart Hints**: 若無心得，顯示 "Inscribe" 提示 (羽毛筆圖示)。
    *   **Viewing Number**: 支援顯示 "2nd View", "3rd View" 標記。

---

## 4. 技術架構 (Technical Architecture)

### 4.1 Frontend (Client)
*   **Framework**: Next.js 14 (App Router).
*   **State Management**: Zustand (`viewStore`, `settingsStore`).
*   **Styling**: Tailwind CSS + Framer Motion (Animations).
*   **Internationalization**: Custom Hook (`useTranslation`), 支援 `zh-TW` 與 `en-US`。
*   **Utilities**: `tailwind-scrollbar-hide` 用於隱藏捲軸。

### 4.2 Backend (Server)
*   **Framework**: Python 3.12 + FastAPI.
*   **Database**: Supabase (PostgreSQL).
*   **ORM**: 原生 Supabase Client (`postgrest`), 配合 Pydantic Schemas。
*   **Services**:
    *   `SearchService`: 整合 TMDB 與 Google Books API。
    *   `GeminiService`: 
        *   生成書籍推薦。
        *   生成心得建議 (`generate_reflection_suggestions`)。
        *   潤飾心得 (`refine_reflection`)。
        *   **Fallback**: 若 Gemini 失敗，自動切換至 OpenAI (`gpt-4o-mini`)。
    *   `CollectionService`: 處理 CRUD 與商業邏輯 (如訪客限制、重複觀看計算)。

### 4.3 資料模型 (Schema Key Changes)
*   **StoryCreate**: 
    *   新增 `created_at: Optional[datetime]`，支援自訂日期。
*   **API Response**:
    *   `directors`: `List[str]`
    *   `authors`: `List[str]`
    *   `related_media`: `List[MediaAsset]`

---

## 5. 待優化與未來規劃 (Roadmap)
*   **Profile Page**: 完善個人檔案頁面的統計圖表 (Charts) 與設定功能。
*   **Social**: 增加分享收藏清單至社群媒體的功能。
*   **Export**: 匯出 Folio 資料 (CSV/JSON)。
*   **Performance**: 優化大量圖片載入效能 (Lazy Loading & Blur Placeholders)。

---

這份文件反映了截至目前為止的所有代碼變更與設計調整。