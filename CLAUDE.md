# CLAUDE.md — Storio 2 開發指引

> 本文件為 Claude Code 在 Storio 2 專案中的核心指引。開始任何工作前請務必閱讀。

---

## 語言規範

- 所有對話、文件、程式碼註解一律使用**繁體中文 (zh-TW)**。
- 語氣：專業、精簡、充滿創造力。

---

## 專案概覽

**Storio** 是一個「沉浸式個人典藏室」App，核心概念：**"Collect stories in your folio"**。
使用者可以典藏電影、影集、書籍，撰寫心得，並生成精美的分享圖片。

---

## 技術棧

| 層級 | 技術 |
|------|------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Native Wrapper | Capacitor (iOS) |
| Backend | FastAPI (Python) — Railway 部署 |
| Database & Auth | Supabase (PostgreSQL + Anonymous Auth) |
| Landing Page | `index.html` (Tailwind CDN，GitHub Pages) |

---

## 目錄結構速覽

```
storio_2/
├── client/src/
│   ├── app/            # Next.js 路由 (auth, collection, details, profile, search)
│   ├── components/     # 可複用 UI 元件
│   ├── hooks/          # 客製化 React Hooks
│   ├── lib/ & utils/   # 工具函式庫與 API client
│   └── store/          # 狀態管理
├── server/app/
│   ├── api/v1/endpoints/   # Controller 層 (ai, collection, details, search)
│   ├── services/           # Service 層 (業務邏輯)
│   ├── repositories/       # Repository 層 (Supabase 讀寫)
│   └── schemas/            # Pydantic Models
├── docs/               # PRD, Wiki, Backlog, Sprint Specs
├── openspec/           # OpenSpec 變更提案 (changes/, specs/)
└── GEMINI.md           # 專案核心規範 (必讀)
```

---

## 開發前必讀清單

1. **`docs/StorioWiki.md`** — 了解架構脈絡、元件關係、上下游依賴（每次開發前必讀）
2. **`GEMINI.md`** — 術語規範、視覺設計規則、開發標準
3. **`docs/BACKLOG.md`** — 確認當前任務優先級與已知 Bug
4. **`docs/PRD.md`** — 確認產品規格邊界
5. **`docs/DEV_SETUP.md`** — 啟動開發環境的正確指令

---

## 後端架構規範

嚴格遵守三層架構：

```
Controller (endpoints/) → Service (services/) → Repository (repositories/) → Supabase
```

- 禁止在 Controller 層直接操作資料庫。
- 使用 Pydantic Schema 進行 API 資料驗證。

---

## 核心 UI 元件

| 元件 | 用途 |
|------|------|
| `StoryCard` | 支援呼吸燈提示的收藏卡片 |
| `StoryDetailsView` | 共用詳情展示 (Backdrop-First 設計) |
| `RateAndReflectForm` | 評分與心得表單 (含 AI 潤飾，100字限制) |
| `ShareModal` | 分享圖片生成 (多模板：Default/Pure/Ticket/RetroTV/Shelf/Desk) |
| `NavigationFAB` | 浮動操作按鈕 (取代底部導覽列) |

---

## 視覺設計系統

- **主色**: `#0d0d0d` (Folio Black), `#121212` (Card Surface), `#c5a059` (Storio Gold)
- **設計哲學**: Backdrop-First，純黑 Loading 背景 (`bg-[#000000]`)
- **行動優先**: 優先適配 iPhone 16 Pro，FAB 作主操作，Profile 圖示右上角
- **佈局**: 首頁橫向滑動、館藏頁 Bento Grid、詳情頁沉浸式

---

## 術語規範（嚴格執行）

| 禁止使用 | 應使用 |
|----------|--------|
| Desert, Pyramid, Sand, Dig | Folio, Stories, Memories |
| Bricks, Excavation | Collections, Items |
| Note / Inscribe | Reflection / 心得 |
| Builder | Apprentice |
| TV Series | Series |

---

## 可用 Skills

```
react-expert                    # React Hooks 最佳實踐
supabase-postgres-best-practices # PostgreSQL schema & RLS 設計
tdd                             # TDD 最佳實踐
user-journeys                   # 使用者旅程分析
wireframe-prototyping           # UI 原型設計
find-skills                     # 尋找新技能
openspec-propose                # 新功能提案
openspec-apply-change           # 執行 OpenSpec 任務
openspec-explore                # 探索模式（思考夥伴）
openspec-archive-change         # 歸檔已完成的變更
```

---

## 測試規範

- 遵循 **TDD**（先寫測試再實作）
- **後端**: Pytest — `server/tests/`
- **前端/E2E**: Playwright
- 禁止為了讓測試通過而 mock 資料庫（使用真實 Supabase 連線）

---

## OpenSpec 工作流

有新功能需求時，請依序：

1. 閱讀 `StorioWiki.md` 確認架構脈絡
2. 確認 `GEMINI.md` 術語與視覺規範
3. 執行 `/openspec-propose` 生成提案
4. 審閱 `openspec/changes/<name>/` 的 proposal.md 與 tasks.md
5. 執行 `/openspec-apply-change` 逐步實作

---

## 已知重要 Bug

- **分享圖片空白 (ShareModal)**: `html-to-image` 在 Safari/iOS 上的 CORS 與快取問題，待排查。
  詳見 `openspec/changes/fix-share-image-blank/` 與 `docs/BUG_REPORT_SHARE_IMAGE.md`。

---

## 部署資源

| 服務 | 平台 | 方案 |
|------|------|------|
| Frontend | Vercel | Hobby |
| Backend | Railway | Free Tier |
| Database & Auth | Supabase | Free Tier |

> 注意：Supabase Free Tier 連續 7 天無活動會自動暫停。
