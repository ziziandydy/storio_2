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
    *   **Guest Mode**: 允許免登入試用，限制收藏 10 筆。

### 3.2 首頁 (Home)
*   **Hero Section**: 標題 "Your Digital Pensieve"。
*   **Stats Dashboard**: 顯示收藏總數、總時數，支援輪播切換統計維度。
*   **Section Sliders**: 包含 Trending Movies, Series, Books。

### 3.3 搜尋與探索 (Search)
*   **Bottom-Focused Design**: 搜尋框與過濾器固定於底部，手動觸發搜尋以優化 CJK 輸入體驗。
*   **API 整合**: 整合 TMDB 與 Google Books API。

### 3.4 詳情頁 (Details)
*   **Backdrop-First Design**: 頂部大面積背景海報，文字資訊位於海報下方黑色區塊。
*   **Social Sharing (Memory Card)**:
    *   **功能**: 將單一作品轉化為精美分享圖。
    *   **觸發**: 個人心得卡片右上角的分享圖示。
    *   **規格**: 9:16 PNG 格式（Instagram Story 優化）。
    *   **狀態**: 已實作，待 UAT 驗證。

### 3.5 收藏與心得 (Add to Folio Flow)
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
*   **Utility**: `getURL` 工具函式確保絕對 URL 重導向的健壯性。
*   **Libraries**: `html-to-image`, `downloadjs`。

### 4.2 Backend (Server)
*   **Database**: Supabase (PostgreSQL)。
*   **Storage**: 建立 `avatars` 公開儲存池，並配置 RLS 權限。
*   **Logic**: 實作 `migrate_guest_data` 儲存程序。

---

## 5. 待優化與未來規劃 (Roadmap)
*   **Social Sharing UAT**: 驗證分享圖片在行動端之佈局與下載正確性 (Current Focus)。
*   **PWA**: 實作 PWA 支援 (Next Step)。
*   **Profile Page**: 完善個人檔案頁面的統計圖表 (Charts)。
*   **Export**: 匯出 Folio 資料 (CSV/JSON)。