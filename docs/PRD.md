# Storio 2 產品需求文檔 (PRD) v5.0

## 1. 產品概述 (Product Overview)

**Storio** 是一個專為收藏家打造的數位典藏室（Folio）。我們相信每一部電影、每一本書籍都是一段值得珍藏的記憶（Story）。有別於傳統的清單工具，Storio 提供一個靜謐、沉浸且具備儀式感的空間，讓用戶如博物館策展人般，細細打磨並展示自己的精神收藏。

### 1.1 核心價值 (Core Values)
*   **典藏儀式感 (Ritual)**：從搜尋、評分到撰寫感悟，每一個步驟都經過精心設計。
*   **沉浸式美學 (Immersion)**：以 **"Storio Gold" (#e96c26)** 與 **"Folio Black" (#0d0d0d)** 為主色調。
*   **隱私與專屬 (Privacy)**：這裡是用戶的 "Pensieve"（儲思盆），優先保障個人隱私。
*   **精準數據 (Accuracy)**：串接 TMDB 與 Google Books，確保 Metadata 準確。

---

## 2. 用戶角色與流程 (User Roles & Flows)

### 2.1 角色定義
*   **Guest (見習生)**：
    *   **限制**：最多收藏 10 則 Stories。
    *   **權益**：體驗完整 UI，可隨時無縫升級。
*   **Curator (館長)**：
    *   通過 Email 或第三方（Google/Apple）登入。
    *   **權益**：無限制收藏、雲端同步、多裝置存取、社群分享。

### 2.2 核心流程 (Core User Flow)
```mermaid
graph TD
    A[啟動 App] --> B{初次訪問?}
    B -- 是 --> C[Onboarding Modal]
    B -- 否 --> D{檢查 Session}
    
    C --> C1[Google/Apple/Email 登入]
    C --> C2[Continue as Guest (提示限制)]
    
    C1 --> E[首頁 (Curated Stats)]
    C2 --> E
    D --> E
    
    E --> F[搜尋 & 收藏]
    E --> G[My Storio (多種視圖)]
```

---

## 3. 功能需求 (Functional Requirements)

### 3.1 初始化與身份驗證 (Onboarding & Auth)
*   **強制引導 (Onboarding Modal)**：
    *   若用戶未登入 (無 Session)，啟動時強制彈出全版或半版 Modal。
    *   **選項**：
        1.  **Continue with Google**
        2.  **Continue with Apple**
        3.  **Continue with Email**
        4.  **Continue as Guest** (需以次要樣式呈現，並在點擊時或下方註明「Guest 僅限收藏 10 則 Stories」)。
*   **狀態同步**：登入後自動合併 Guest 時期的資料 (若有)。

### 3.2 首頁：策展數據 (Home: Curated Stats)
*   **統計儀表板 (Carousel Dashboard)**：
    *   **輪播展示**：支援左右滑動切換不同維度的數據（7天/30天/本週/本月/年度/趨勢圖）。
    *   **客製化**：用戶可於 Profile 頁面的 "Statistics" 設定中自由勾選要顯示的卡片。
    *   **視覺**：採用極簡數字 (Serif) 與微型長條圖 (Bar Chart)，配合 Storio Gold 主色調。
*   **入口引導**：儀表板下方提供顯眼的 "View My Storio" 按鈕，引導進入館藏。

### 3.3 搜尋優化 (Search UX)
*   **底部操作區 (Bottom Bar)**：將搜尋框與篩選器移至螢幕底部，背景採用 Backdrop Blur，優化大螢幕手機的單手操作體驗。
*   **空狀態 (Empty State)**：採用 "Find the stories here" 的極簡設計，搭配水平排列的微弱圖示 (Film/Book/Ticket)，營造探索氛圍。

### 3.4 我的館藏 (My Storio: View Modes)
*   **視圖切換器 (View Switcher)**：在頁面頂部允許用戶切換以下模式：
    1.  **List View (Default)**：現有的 Bento Grid 佈局，適合快速瀏覽與管理。
    2.  **Calendar View**：
        *   以月曆形式展示，標記用戶在哪一天收藏了作品。
        *   點擊日期可展開該日的收藏清單。
    3.  **Gallery Mode (Gallery)**：
        *   **沉浸式藝廊**：全螢幕或大尺寸卡片輪播 (Carousel)。
        *   **互動**：左右滑動切換作品，強調海報與 Backdrop 的視覺衝擊。
        *   **資訊**：僅顯示標題、評分與一句短評，點擊可進入詳情。

### 3.4 收藏與詳情 (Collection & Details)
*   **收藏流程**：維持現有的 "Add to Folio" -> "Rate & Reflect" 流程。
*   **Social Card (分享卡片)**：
    *   在詳情頁新增 "Share" 按鈕。
    *   生成一張包含海報、評分、用戶心得與 Storio Logo 的精美圖片 (PNG)。
    *   風格需符合 "Museum Ticket" 或 "Bookplate" 的設計感。

---

## 4. 技術架構 (Technical Architecture)

*   **Frontend**: Next.js 14+, Tailwind CSS, Framer Motion (用於 Gallery 滑動與 View 切換動畫)。
*   **Backend**: FastAPI, Supabase (PostgreSQL)。
*   **Auth**: Supabase Auth (Google, Apple, Email, Anonymous)。
*   **Image Generation**: 使用 `satori` 或 `html2canvas` 或後端 `Pillow` 生成 Social Card。

---

## 5. 未來規劃 (Roadmap)

*   **Phase 2 (Current)**: Onboarding 優化、數據統計、多視圖瀏覽、社群分享。
*   **Phase 3**: 資料匯入 (Letterboxd/Goodreads)、公開個人頁面 (Public Profile)。
