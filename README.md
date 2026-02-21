# Storio 2 (Folio & Memories)

![Storio Gold Banner](https://via.placeholder.com/1200x300/0d0d0d/e96c26?text=Storio+Folio)

## 1. 產品概述
**Storio** 是一款結合了「書籍」與「影視」的沉浸式館藏 App。我們將收藏行為轉化為在「儲思盆 (Pensieve)」中保存記憶的過程，讓每一次的紀錄都充滿儀式感。

核心理念：**"Storio - Collect stories in your folio"**

詳細產品需求請參閱：[Storio 產品需求文檔 (PRD) v4.0](docs/PRD.md)

## 2. 核心架構 (Agent-Centric)
本專案採用 Agent-Centric 架構，由後端 Python Agent 驅動核心邏輯。

### 🤖 Agents (代理)
- **CuratorAgent (策展人)**: 負責管理 Folio 內容、處理收藏邏輯、支持重複觀看 (Rewatch) 紀錄。
- **SearchAgent (搜查官)**: 負責調用外部 API (TMDB, Google Books) 尋找作品。
- **ScribeAgent (書記)**: 負責處理心得記錄、AI 潤飾。

### 🛠 Skills (技能)
- **TMDBSkill**: 串接 TMDB API (Movie/TV 雙源)。
- **GoogleBooksSkill**: 串接 Google Books API。
- **SupabaseSkill**: 處理資料庫 CRUD、Auth 驗證與權限。
- **AISkill**: 整合 Gemini/OpenAI 進行心得潤飾與建議。

## 3. 技術堆疊
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Python 3.12 (FastAPI), Pydantic
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Anonymous Login)
- **Design System**: "Folio Black" (#0d0d0d) + "Storio Gold" (#e96c26)

## 4. 特色功能 (v2.1)
- **Curated Stats Dashboard**: 首頁沉浸式數據儀表板，支援輪播展示個人收藏統計（7天/30天/年度/趨勢圖），並可於 Profile 頁面客製化。
- **Bottom-Focused Search**: 針對行動裝置優化的搜尋介面，將搜尋框與篩選器移至底部，提升單手操作體驗。
- **Memory Timeline**: 在詳情頁展示同一作品的多次觀看紀錄 (1st View, 2nd View...)，方便回顧不同時期的感悟。
- **Archival Inscription**: 擬真檔案卡風格的心得撰寫區，支援印章式評分與無縫編輯。
- **Backdrop-First Design**: 沉浸式詳情頁，讓影像說故事。
- **Guest Access**: 完整的訪客體驗（限 10 筆收藏），並提供 Onboarding 引導。

## 5. 安裝與執行

### Client (Frontend)
```bash
cd client
pnpm install
pnpm dev
```

### Server (Backend)
```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8010
```
