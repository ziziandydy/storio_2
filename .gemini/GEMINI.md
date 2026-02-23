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

## 4. 術語規範 (Terminology Guidelines)
**嚴禁使用**任何與「沙漠、金字塔、挖掘、磚塊」相關的隱喻或詞彙：
- ❌ **禁止使用**: Desert, Pyramid, Sand, Dig, Bricks, Excavation, Pharaoh.
- ✅ **建議使用**: 
  - **Folio**: 指稱整個 App 或個人的收藏空間。
  - **Stories**: 用於數量的計數單位 (如 "12 Stories")，呼應 Storio 核心概念。
  - **Items / Stories / Memories**: 指稱單一的收藏作品。
  - **Archivist / Keeper / Curator**: 用於用戶等級或身份。
  - **Inscription**: 指撰寫心得的行為。

## 5. 開發規範 (Development Standards)
- **Documentation First**: 開發前務必詳閱 `docs/PRD.md` 確認產品規格，並參考 `docs/` 中的測試文件。
- **Task Management**: 開始工作前，請務必檢查 `docs/BACKLOG.md` 確認當前任務優先級。
- **Startup Protocol**: 啟動開發環境時，**務必優先讀取並遵循 `docs/DEV_SETUP.md`** 的指令。必須使用子 Shell (Subshell) 與 `nohup ... < /dev/null` 組合，以確保進程在 Agent 環境下穩定存活。
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

## 7. Agents & Skills (Available Tools)
善用以下專門 Agent 與 Skill 來輔助開發：
- **Agents**:
  - `codebase_investigator`: 用於複雜的代碼庫分析、架構理解與 Root Cause Analysis。
- **Skills** (位於 `.agents/skills/`):
  - `ralph-tui-prd`: 協助 PRD 撰寫與 TUI 相關任務。
  - `tdd`: 提供 TDD (Test-Driven Development) 最佳實踐、介面設計與重構建議。
  - `user-journeys`: 定義與分析使用者旅程 (User Journeys)。
  - `wireframe-prototyping`: 協助 UI 原型設計與 Wireframing。