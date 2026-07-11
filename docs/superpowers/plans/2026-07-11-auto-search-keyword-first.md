# Auto 搜尋模式改為 Keyword-First 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto 搜尋模式移除正則語意預判，改為一律先 keyword 搜尋、以當前分頁過濾後為空才 fallback 到 AI；Keyword 模式改為純關鍵字不再偷打 AI。

**Architecture:** 純前端單檔變更（`client/src/app/search/page.tsx`）。三個搜尋模式（0: Auto, 1: AI, 2: Keyword）的路由邏輯收斂：`isAiSearch` 只在手動選 AI 模式時為 true；fetch effect 內的空結果 fallback 條件限定 Auto 模式，且判空改用「依當前 filter 過濾後的結果」。後端 API 完全不動。

**Tech Stack:** Next.js 14 (App Router) + TypeScript + Tailwind。驗證用 gstack headless browser（client 無單元測試框架，Playwright 落後未進 CI——依 spec 決議用瀏覽器驗證）。

**Spec:** `docs/superpowers/specs/2026-07-11-auto-search-keyword-first-design.md`

## Global Constraints

- 註解一律繁體中文（zh-TW）。
- 禁止改動後端（`server/**`）與 API 契約。
- 術語規範：Reflection（非 Note）、Series（非 TV Series）等，見 `CLAUDE.md`。
- Loading UX 維持現狀：fallback 過程不顯示紫色 AI overlay、結果不加標註。
- dev server 埠：client `npm run dev` 跑在 **3010**。

---

### Task 1: 修改搜尋模式路由與 fallback 邏輯

**Files:**
- Modify: `client/src/app/search/page.tsx:44-53`（模式判斷區塊）
- Modify: `client/src/app/search/page.tsx:163-187`（fetch effect 的 fallback 區塊）

**Interfaces:**
- Consumes: 既有 `searchMode`（`0 | 1 | 2`，0=Auto、1=AI、2=Keyword）、`filter`（`'movie' | 'book' | 'tv'`）、`StoryResult` 型別。
- Produces: `isAiSearch: boolean`（= `searchMode === 1`），供 line 133 fetch 分支與 line 262 AI overlay 沿用，名稱不變。

- [ ] **Step 1: 移除正則語意預判**

將 `client/src/app/search/page.tsx` 第 48–53 行：

```tsx
  // Semantic Intent Detection (Auto Mode)
  // 只有明確的描述性/意圖關鍵字才觸發 AI Search，長度不作為判斷依據（避免精確標題誤判）
  const isSemanticQuery = (q: string) => /怎麼|什麼|關於|想要|推薦|年代|哪部|哪一|有沒有|類似|風格|氛圍|心情|感覺/.test(q);
  const isAutoSemantic = searchMode === 0 && isSemanticQuery(query);
  const actualSearchMode = searchMode === 0 ? (isAutoSemantic ? 1 : 2) : searchMode;
  const isAiSearch = searchMode === 1 || isAutoSemantic;
```

替換為：

```tsx
  // Auto 模式（searchMode === 0）一律先跑 keyword 搜尋，
  // 結果經當前分頁過濾後為空時才 fallback 到 AI（見 fetch effect）
  const isAiSearch = searchMode === 1;
```

注意：`isSemanticQuery`、`isAutoSemantic`、`actualSearchMode` 在檔案中無其他使用處（已確認），直接刪除即可。`query` state 仍被清除鈕顯示邏輯使用，保留。

- [ ] **Step 2: fallback 條件收斂到 Auto 並改用過濾後判空**

將 fetch effect 內（原第 163–166 行附近）：

```tsx
        const primaryResults = data.results ?? [];

        // Keyword search 空結果時，自動 fallback 到 AI Search 尋找相似作品
        if (primaryResults.length === 0 && !isAiSearch) {
```

替換為：

```tsx
        const primaryResults = data.results ?? [];

        // Auto 模式：keyword 結果依當前分頁過濾後為空時，才 fallback 到 AI Search
        // （Keyword 模式不 fallback，空結果就顯示 No Results）
        const visibleResults = primaryResults.filter((item: StoryResult) =>
          filter === 'book'
            ? item.media_type === 'book'
            : item.media_type === 'movie' || item.media_type === 'tv'
        );

        if (visibleResults.length === 0 && searchMode === 0) {
```

過濾邏輯需與 render 端 `filteredResults`（movie/tv 視為同組、book 獨立）一致。fallback 的 AI 請求 body（`media_type` 依 filter 帶值）與後續 `setResults` 邏輯不動。

- [ ] **Step 3: Lint 與型別檢查**

```bash
cd /Users/iTubai/Sites/storio_2/client && npm run lint && npx tsc --noEmit
```

Expected: lint 無 error（既有 warning 不管）；tsc 無 error。若出現 `no-unused-vars`（例如 `Sparkles` import 因本次刪碼變成未使用），一併移除該 import。

- [ ] **Step 4: Commit**

```bash
git add client/src/app/search/page.tsx
git commit -m "refactor(search): Auto 模式改為 keyword-first，AI fallback 收斂至 Auto 並以過濾後結果判空

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Headless browser 驗證四案例

**Files:**
- 無程式碼變更；證據截圖存 scratchpad。

**Interfaces:**
- Consumes: Task 1 完成後的 dev build；client dev server（port 3010）與後端 API（依 `docs/DEV_SETUP.md` 啟動本機 FastAPI，或 `.env.local` 指向的後端）。
- Produces: 四張驗證截圖 + network 請求紀錄結論。

- [ ] **Step 1: 啟動環境**

依 `docs/DEV_SETUP.md` 啟動後端與 `cd client && npm run dev`（port 3010）。確認 `http://localhost:3010/search` 可開。

- [ ] **Step 2: 案例 ① — Auto 搜精確片名**

用 gstack browse 開 `http://localhost:3010/search`，Auto 模式輸入「星際效應」送出。
Expected: 出現 keyword 結果；network **無** `/api/v1/search/ai` 請求。截圖存證。

- [ ] **Step 3: 案例 ② — Auto 搜描述句**

Auto 模式輸入「推薦溫馨的日本電影」送出。
Expected: keyword 空結果後自動出現 AI 結果；network 先 `GET /api/v1/search/?q=...` 後 `POST /api/v1/search/ai`。截圖存證。

- [ ] **Step 4: 案例 ③ — Keyword 模式搜不存在字串**

滑動切到 Keyword 模式，輸入「zzzz不存在的作品名qqqq」送出。
Expected: 顯示 No Results；network **無** `/api/v1/search/ai` 請求。截圖存證。

- [ ] **Step 5: 案例 ④ — Movies/TV 分頁搜純書名**

Auto 模式、Movies/TV 分頁（預設），輸入純書名（如「原子習慣」）送出。
Expected: keyword 回傳的書被 filter 濾掉 → 觸發 AI fallback，出現電影/影集結果；network 有 `POST /api/v1/search/ai` 且 body `media_type` 為 movie 或 tv。截圖存證。

- [ ] **Step 6: 任一案例失敗**

回 Task 1 修正邏輯，重跑 lint/tsc，amend 或新 commit 後重驗。

---

### Task 3: 更新 BACKLOG 紀錄

**Files:**
- Modify: `docs/BACKLOG.md`（最近完成區塊）

**Interfaces:**
- Consumes: Task 2 驗證結論。
- Produces: 無（純文件）。

- [ ] **Step 1: 在 BACKLOG「最近完成」加入一筆**

```markdown
1.  **搜尋 Auto 模式改為 Keyword-First** *(2026-07-11)*:
    *   移除 Auto 模式的正則語意預判，改為一律先 keyword 搜尋、依當前分頁過濾後為空才自動 fallback 到 AI。
    *   Keyword 模式改為純關鍵字（空結果顯示 No Results，不再偷打 AI），三模式行為獨立。
    *   Spec：`docs/superpowers/specs/2026-07-11-auto-search-keyword-first-design.md`
```

- [ ] **Step 2: Commit**

```bash
git add docs/BACKLOG.md
git commit -m "docs(backlog): 記錄搜尋 Auto 模式 keyword-first 變更

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
