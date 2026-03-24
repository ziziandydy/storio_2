# Storio 2 Project - Gemini Instruction Manual

你是 Storio 2 專案的專屬開發 Agent。在協助開發此專案時，請務必遵守以下規範：

## 1. 語言與溝通 (Language & Communication)
- **語系**：**繁體中文 (zh-TW)** (包含所有文件、註解與對話)。
- **語氣**：專業、精簡、充滿創造力。

## 2. 核心技術棧 (Official Stack)
- **Frontend**: Next.js (React) + Tailwind CSS (部署於 Vercel)。
- **Backend**: FastAPI (Python) (部署於 Vercel Serverless Functions)。
- **Database**: **Supabase (PostgreSQL)**。
- **Auth**: **Supabase Auth** (包含 Anonymous Login)。

## 3. 視覺設計與產品概念 (Unified Design System & Concept)
- **核心概念**: **"Storio - Collect stories in your folio"**。
- **隱喻**: 一個靜謐的個人典藏室或「儲思盆 (Pensieve)」，用於收藏與回顧心愛的作品與感悟。
- **佈局**: 
  - **首頁**: Mobile-First 沉浸式體驗，橫向滑動列表。
  - **館藏頁**: Bento Grid (便當盒佈局)，帶有智慧提示圖示 (羽毛筆/星星)。
  - **詳情頁**: Backdrop-First 設計，純黑 Loading 背景 (`bg-[#000000]`)。
- **色彩**: `#0d0d0d` (Folio Black), `#121212` (Card Surface), `#c5a059` (Storio Gold)。
- **行動優先細節**: 偏好最大化行動裝置的螢幕顯示空間，使用 Floating Action Button (FAB) 作為主要操作入口（取代底層導覽列），並將 Profile 圖示放置於右上角。

## 4. 術語規範 (Terminology Guidelines)
**嚴禁使用**任何與「沙漠、金字塔、挖掘、磚塊」相關的隱喻或詞彙：
- ❌ **禁止使用**: Desert, Pyramid, Sand, Dig, Bricks, Excavation, Pharaoh.
- ✅ **建議使用**: 
  - **Folio**: 指稱整個 App 或個人的收藏空間。
  - **Stories**: 用於數量的計數單位 (如 "12 Stories")，呼應 Storio 核心概念。
  - **Items / Stories / Memories**: 指稱單一的收藏作品。
  - **Archivist / Keeper / Curator**: 用於用戶等級或身份。
  - **Collections / Items**: 作為收藏集的通用名稱 (取代 Bricks)。
  - **Inscription**: 指撰寫心得的行為。

## 5. 開發規範 (Development Standards)
- **知識庫與架構理解 (Critical)**: **開發與提案前，務必詳閱 `docs/StorioWiki.md`** 以理解整個 repo 的背景知識、元件架構、上下游關係。接著才能使用 OpenSpec 進行後續的提案 (Proposal) 與規劃。
- **Documentation First**: 開發前詳閱 `docs/PRD.md` 確認產品規格，並參考 `docs/` 中的測試文件。
- **Task Management**: 開始工作前，請務必檢查 `docs/BACKLOG.md` 確認當前任務優先級。
- **Startup Protocol**: 啟動開發環境時，**務必優先讀取並遵循 `docs/DEV_SETUP.md`** 的指令。必須使用子 Shell (Subshell) 與 `nohup ... < /dev/null` 組合，以確保進程在 Agent 環境下穩定存活。
- **API Keys**: Agent 可使用環境變數中 `AIzaSyDB` 開頭的 Gemini API Key。若 Gemini 失敗，可使用 `sk-proj-...` 開頭的 OpenAI API Key 作為備援，且不能因為書籍推薦功能 (Gemini/OpenAI) 失敗而阻擋電影或影集的查詢。
- **No Lock-in**: 使用 SQLAlchemy 或標準 Supabase Python Client。
- **Testing**: 遵循 TDD，使用 Pytest 與 Playwright。
- **Service Layer**: Controller -> Service -> Repository (Supabase)。
- **Mobile First**: 優先適配 iPhone 16 Pro 比例，最大化可視空間。
- **Components**:
  - `StoryDetailsView`: 共用的詳情展示元件。
  - `RateAndReflectForm`: 共用的評分與心得表單 (含 AI)。
  - `StoryCard`: 支援呼吸燈提示的卡片元件。

## 6. 影像生成規範 (Nano Banana Extension)
在使用影像生成工具時，請遵循以下核心原則：
- **精確數量**: 嚴格遵守 `--count=N` 參數。
- **視覺一致性**: `/story` 指令需維持色調、角色設計與藝術風格的高度統一。
- **文字準確性**: 確保影像中的文字拼寫正確且符合專業語境。
- **高品質標準**: 產出具備現代感、精緻且符合 "Storio Gold" 美學的視覺素材。

## 7. 新功能開發流程（強制執行）

收到任何功能需求或開發任務時，**必須**依序執行以下流程，**不得跳過任何步驟**：

### 設計階段
1. **`/office-hours`（可選）** — 新功能方向不確定時，先用 YC 六個 forcing questions 釐清需求
2. **`superpowers:brainstorming`** — 探索需求，對齊設計方向（**禁止在此步驟前寫任何程式碼**）
3. **`wireframe-prototyping`** — 若涉及 UI 變更，先視覺確認
4. 閱讀 `docs/StorioWiki.md` 確認架構脈絡，確認 `GEMINI.md` 術語規範
5. **`openspec-propose`** — 將 brainstorming 結論正式化為 proposal/design/specs/tasks
6. **`/plan-ceo-review`（可選）** — 對方向與範圍有疑慮時，做 CEO 視角的策略確認
7. **`/plan-eng-review`（可選）** — 架構複雜時，在寫程式前先做工程審查

### 實作階段
8. **`superpowers:writing-plans`** — 將 tasks.md 拆解為有依賴關係的實作步驟
9. **`superpowers:using-git-worktrees`** — 建立隔離功能分支
10. **`superpowers:test-driven-development`** — 先寫測試，再寫實作
11. **`openspec-apply-change`** — 按 tasks.md 逐一實作

### 完成階段
12. **`/qa`（gstack）** — 若涉及 UI 變更，headless browser 自動掃 UI bug、截圖存證、自動修復
13. **`superpowers:verification-before-completion`** — 跑全套測試，確認通過才宣告完成
14. **`/review`（gstack）** — Pre-landing code review（SQL 安全、LLM trust boundary 等）
15. **`openspec-archive-change`** — 歸檔變更

### 部署驗證階段（每次部署後必跑）
16. **`/gstack` browse** — 部署至 Vercel / Railway 後，headless browser 驗證 production 頁面：
    ```bash
    $B goto https://storio-2.vercel.app
    $B console          # 確認無 JS error
    $B responsive /tmp/prod-responsive   # mobile / tablet / desktop 三張截圖
    ```

> **Bug 修復**可簡化為：`/investigate`（gstack，有 browser 截圖） 或 `superpowers:systematic-debugging`（純程式碼） → TDD → 實作 → `/qa` 驗證

---

## 8. Agents & Skills (Available Tools)
善用以下專門 Agent 與 Skill 來輔助開發：
- **Agents**:
  - `codebase_investigator`: 用於複雜的代碼庫分析、架構理解與 Root Cause Analysis。
- **Skills — 流程管理 (superpowers)**:
  - `superpowers:brainstorming`: 新功能前必用，探索需求與設計方向
  - `superpowers:writing-plans`: 將 spec 拆解為實作步驟
  - `superpowers:executing-plans`: 按計畫執行，含 review checkpoints
  - `superpowers:test-driven-development`: TDD 流程，先測試再實作
  - `superpowers:systematic-debugging`: 遇到 bug 時系統化排查（純程式碼，無 browser）
  - `superpowers:verification-before-completion`: 宣告完成前必跑驗證
  - `superpowers:using-git-worktrees`: 建立隔離功能分支
  - `superpowers:finishing-a-development-branch`: 決定如何整合完成的分支
- **Skills — OpenSpec 工作流**:
  - `openspec-propose`: 新功能提案（生成 proposal/design/specs/tasks）
  - `openspec-apply-change`: 執行 OpenSpec 任務
  - `openspec-explore`: 探索模式（思考夥伴）
  - `openspec-archive-change`: 歸檔已完成的變更
- **Skills — gstack（瀏覽器 QA 與部署驗證，已安裝於 `~/.claude/skills/gstack`）**:
  - `gstack` / `$B`: headless Chromium — 截圖、驗部署、dogfood UI 流程
  - `/qa`: 自動 QA — headless browser 找 UI bug → 自動修 → commit → 重驗
  - `/review`: Pre-landing code review（SQL 安全、LLM trust boundary）
  - `/investigate`: 系統化 debug，含 browser 截圖存證（有 UI 問題時優先用此）
  - `/ship`: 完整 ship 流程 — merge base、run tests、bump VERSION、CHANGELOG、push、PR
  - `/office-hours`: YC 腦力激盪 — 六個 forcing questions 釐清需求與價值（用在 brainstorming 前）
  - `/plan-ceo-review`: CEO 視角 plan review — 挑戰前提、找 10-star 產品、確認方向夠大膽
  - `/plan-eng-review`: Eng Manager 視角 plan review — 架構、資料流、edge cases、測試覆蓋
- **Skills — 領域技術**:
  - `find-skills`: 幫助您發掘並安裝開源 Agent 技能生態系統中的新技能。
  - `react-expert`: 提供 React 特性、Hooks 最佳實踐與 Server Components 等進階開發建議。
  - `supabase-postgres-best-practices`: 協助撰寫符合官方最佳實踐的 PostgreSQL schemas、優化查詢與設計 RLS 安全政策。
  - `tdd`: 提供 TDD (Test-Driven Development) 最佳實踐、介面設計與重構建議。
  - `user-journeys`: 定義與分析使用者旅程 (User Journeys)。
  - `wireframe-prototyping`: 協助 UI 原型設計與 Wireframing。
