# StorioWiki

這份文件總結了 Storio 2 的 codebase 架構、核心元件、上下游關係及主要功能。這將作為開發時的知識庫，幫助 Coding Agent 在使用 OpenSpec 進行提案與規劃前，能快速理解專案的背景脈絡。

## 1. 系統架構總覽 (Architecture Overview)

Storio 2 是一個強調「沉浸式行動優先 (Mobile-First)」的個人典藏室系統，核心概念為「Storio - Collect stories in your folio」。

*   **Frontend**: Next.js (React App Router) + Tailwind CSS，支援 Static HTML Export 並封裝於 **Capacitor (iOS)**。
*   **Backend**: FastAPI (Python)，部署於 Vercel Serverless Functions。
*   **Landing Page**: 獨立的 `index.html` (Tailwind CDN) 置於根目錄，支援 GitHub Pages 與多語系。
*   **Database & Auth**: Supabase (PostgreSQL) 提供資料庫、身分驗證（Anonymous Login、Google OAuth、**Apple Sign-In**）。Apple Sign-In 採 Hybrid 方案：iOS 原生用 `@capacitor-community/apple-sign-in`（Face ID），Web 用 `signInWithOAuth`。邏輯封裝於 `client/src/lib/appleAuth.ts`。

## 2. 核心目錄結構 (Directory Structure)

### Frontend (`client/`)
主要的 Next.js 應用程式，負責使用者介面與前端邏輯。

*   **`src/app/`**: Next.js App Router 的主要頁面與路由。
    *   `/auth` (登入/註冊)
    *   `/collection` (館藏管理)
    *   `/details` (作品詳細頁)
    *   `/profile` (使用者個人檔案)
    *   `/search` (搜尋功能)
    *   靜態頁面：`/privacy`, `/terms`
*   **`src/components/`**: 可複用的 UI 元件 (Components)。
    *   **核心視覺與功能元件**: `StoryCard` (卡片), `StoryDetailsView` (獨立詳情展示), `RateAndReflectForm` (評分與心得表單)。
    *   **互動模態框 (Modals)**: `AddFolioModal`, `AddToFolioModal`, `GuestLimitModal`, `MonthlyRecapModal`, `OnboardingModal` (登入引導), `OnboardingGuideModal` (首次使用功能學習卡，4 張卡片輪播), `ShareModal`。
    *   **分享圖片渲染頁**: `app/share/render/page.tsx` — Puppeteer 截圖目標頁，接受 `window.__RENDER_DATA__` 注入，載入字型後設定 `window.__RENDER_READY__`。
    *   **導覽與佈局 (Navigation & Layout)**: `NavigationFAB` (浮動操作按鈕，取代傳統底部導覽列), `ViewSwitcher`, `SectionSlider`, `HeroStats`, `HomeStats`。
*   **`src/lib/` & `src/utils/`**: 前端工具函式庫與 API client 設定。
*   **`src/hooks/`**: 客製化 React Hooks。
*   **`src/store/`**: 狀態管理 (State Management)。

### Backend (`server/`)
基於 FastAPI 構建的微服務層，處理業務邏輯與資料庫互動。

*   **`app/api/v1/endpoints/` (Controller Layer)**: 定義 API 路由。
    *   `ai.py` (AI 相關端點)
    *   `collection.py` (館藏管理端點)
    *   `details.py` (作品詳情與元資料)
    *   `search.py` (搜尋介面)
*   **`app/services/` (Service Layer)**: 核心業務邏輯，負責處理資料與外部 API 整合。
    *   `ai_recommendation_service.py` (基於 AI 的推薦邏輯)
    *   `gemini_service.py` (整合 Google Gemini API 的底層服務)
    *   `search_service.py` (跨來源/語意搜尋的核心邏輯)
    *   `collection_service.py` (使用者館藏 CRUD 邏輯)
    *   `trending_service.py` (處理熱門趨勢與排行)
*   **`app/repositories/` (Repository Layer)**: 資料存取層。
    *   `collection_repo.py`: 負責與 Supabase 資料庫進行直接的資料讀寫。
*   **`app/schemas/`**: Pydantic Models，處理 API 請求與回應的資料驗證。
    *   `item.py`

## 3. 核心功能與上下游關係 (Data Flow & Relations)

採用標準的 **Controller -> Service -> Repository (Supabase)** 三層架構。

1.  **使用者探索與搜尋 (Search & Discover)**:
    *   **UI**: 使用者在前端 `/search` 頁面輸入查詢。
    *   **API**: 呼叫後端 `search.py` 端點。
    *   **Service**: `search_service.py` 處理查詢，可能呼叫 `gemini_service.py` 解析語意，或向外部資料源 (如 TMDB) 抓取資料。
    *   **Response**: 將標準化的 `Schema` 回傳給前端展示。
2.  **館藏與心得管理 (Collection & Inscription)**:
    *   **UI**: 點擊 `StoryCard` 或是使用 `AddToFolioModal` 將作品加入館藏；在 `RateAndReflectForm` 撰寫心得。
    *   **API**: 透過 `collection.py` 端點進行資料更新。
    *   **Service & Repo**: `collection_service.py` 處理權限及資料整合後，交由 `collection_repo.py` 將資料寫入 Supabase。
3.  **首次使用引導 (Onboarding Flow)**:
    *   **啟動序列**: Native Splash → Web 飛入動畫 → Auth 檢查（未登入 → `OnboardingModal`）→ 首頁 → 功能學習卡
    *   **登入方式**: Google OAuth（web redirect）、Apple Sign-In（iOS native Face ID / web OAuth redirect）、訪客模式（Anonymous Auth）
    *   **Apple Sign-In 架構**: `isNativePlatform()` 偵測環境；native → `SignInWithApple.authorize()` + `supabase.signInWithIdToken()`；web → `supabase.signInWithOAuth()`；取消偵測 code 1001 靜默處理
    *   **學習卡觸發**: 首頁 `useEffect` 檢查 `localStorage('storio_onboarding_seen')`，無紀錄則延遲 400ms 顯示 `OnboardingGuideModal`
    *   **重看入口**: Profile → About → 「如何使用」，強制開啟不重置 localStorage 狀態
4.  **個人頁面與分享 (Profile & Social Share)**:
    *   **UI**: `/profile` 頁面顯示用戶的 `HeroStats` 及等級稱號 (Leveling System)。
    *   **功能**: 利用 `ShareModal` 與 `MonthlyRecapModal` 將個人的館藏與心得產生圖片或連結分享至社群平台。

## 4. 給 Coding Agent 的 OpenSpec 工作流指引

當準備使用 OpenSpec 進行新功能提案 (Proposal)、規格規劃 (Spec) 或開發時，請遵循以下步驟：

1.  **背景知識同步**: 優先閱讀本文件 (`StorioWiki.md`) 以了解目前整個 repo 的架構脈絡，以及在哪個層級 (Frontend Component, Backend Service, Repository) 修改最合適。
2.  **確認開發規範**: 參考 `GEMINI.md` 確認專案的「術語規範」(如禁用 Desert/Bricks)、「視覺設計」(如 Storio Gold, Backdrop-First) 及「開發規範」(TDD, Service Layer)。
3.  **檢視現有 Spec**: 檢查 `docs/SPRINT_X_SPEC.md` 與 `docs/PRD.md` 以確認需求邊界與歷史決策。
4.  **OpenSpec 提案**:基於上述背景，利用 OpenSpec (`.agent/skills/openspec-*`) 撰寫 `proposal.md` 或是 `spec.md`，並確保符合 Controller -> Service -> Repository 的後端結構及前端元件拆分邏輯。

## 5. 部署架構與資源評估 (Deployment & Resource Assessment)

目前 Production 環境採用全免費方案組合，以最小化初期營運成本。

### 部署服務分配

*   **前端 (Frontend)**: Vercel (Hobby Tier)
*   **後端 (Backend)**: Railway (Starter / Free Tier)
*   **資料庫與驗證 (Database & Auth)**: Supabase (Free Tier)

### 承受使用量上限與擴充評估 (Scaling Triggers)

基於目前各平台的免費方案限制，系統在以下情況會遭遇瓶頸，需要考慮付費升級：

1.  **Supabase (Free Tier)**
    *   **當前限制**: 500MB 資料庫空間、2GB 頻寬/月、5萬月活躍用戶 (MAU - Auth)。最致命的是**連續 7 天無活動會自動暫停 (Pause)**。
    *   **擴充時機**:
        *   **自動暫停困擾**: 若專案流量不穩定，導致服務頻繁進入睡眠，冷啟動過慢嚴重影響使用者體驗時 (升級 Pro 方案可防止暫停)。
        *   **資料量增長**: 若未來開放更多元資料欄位或圖片儲存機制，導致 500MB 空間 / 1GB File Storage 面臨耗盡。
        *   **連線數與頻寬**: 每月 egress 流量超過 2GB。
2.  **Railway (Free Tier)**
    *   **當前限制**: 記憶體限制 (通常為 512MB RAM)，提供定額的月執行時數 (500小時) 或是每月 $5的免費額度。
    *   **擴充時機**:
        *   **記憶體溢出 (OOM)**: FastAPI 處理大量並發請求，或是引入較大的 AI 套件/模型庫運算導致 512MB 記憶體耗盡。
        *   **執行時段與額度耗盡**: 月底前免費額度提早耗盡導致後端服務強迫下線。
3.  **Vercel (Hobby Tier)**
    *   **當前限制**: 100GB 頻寬/月，Serverless Action 執行時間硬限制為 **10 秒**。
    *   **擴充時機**:
        *   **Serverless 超時**: 若 Next.js Server Actions (例如：生成分享圖片、或呼叫 AI API 時) 等待後端處理的時間超過 10 秒，會直接被 Vercel 中斷並報錯。此時需升級 Pro (可延長為 15~300 秒) 或是將耗時邏輯完全移交非同步的 Railway 背景處理。
        *   **CDN 流量突增**: 社群分享帶來突發流量，導致每月 100GB 頻寬用盡。
