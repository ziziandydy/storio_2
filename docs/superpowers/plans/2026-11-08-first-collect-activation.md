# 新用戶首次收藏引導與慶祝 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 館藏為 0 的新用戶在首頁看到明確引導；第一部收藏有慶祝；訪客收藏後被引導登入；符合條件的已登入用戶看到 iOS 系統評價視窗。

**Architecture:** 後端 `GET /collection/stats` 與 `POST /collection` 回應新增 `total_count`（additive）。前端以 `useCollectionCount` 決定首頁顯示引導區或統計；`AddToFolioModal` 用 `onSave` 回傳（三個呼叫端皆原樣回傳 `res.json()`）的 `total_count` 選擇成功畫面（慶祝／訪客卡／簡單版）；評價排程放在模組層級的 `lib/reviewPrompt.ts`。

**Tech Stack:** FastAPI + pytest（mock）；Next.js 14 + Vitest（jsdom）；Capacitor 7.6.10（`@capacitor/haptics@^7.0.5`、`@capacitor-community/in-app-review@^7.1.0`，不可裝 8.x）。

**Spec:** `docs/superpowers/specs/2026-11-08-first-collect-activation-design.md`；OpenSpec：`openspec/changes/first-collect-activation/`（proposal／design／specs／tasks，完成度以 tasks.md 勾選為準）。

## Global Constraints

- 全部文件、註解、commit 訊息繁體中文；術語用 Folio／Stories／Storio，依 `GEMINI.md`。
- 色票：`#0d0d0d`、`#121212`、`#c5a059`；彩帶色 `#c5a059 #e6c98a #b69b7d #ffffff #8b5a2b`。modal `rounded-[32px]`，按鈕 `rounded-2xl`。
- 文案（zh-TW／en）：學習卡最後按鈕 開始收藏第一部／Collect my first story；引導區標題 收藏你的第一部作品／Collect your first story；按鈕 搜尋你近期看過的作品／Search what you watched lately；提示 或直接點下方的熱門海報收藏／Or tap a trending poster below；小標 `FIRST STORY`；成功標題 收藏成功／Saved；成功副文案沿用 `modals.successMessage`；訪客卡標題 登入後，收藏不會消失／Log in to keep your stories；說明 你現在是訪客，最多只能收藏 10 部，換手機或重裝 App 收藏就會消失。登入後永久保存，也不限數量。／You're a guest: limited to 10 Stories, and they're lost if you switch phones or reinstall. Log in to keep them for good, with no limit.；次要 稍後再說，前往 My Storio／Maybe later, go to My Storio。引導區標題與提示中英文都必須單行。
- 慶祝：彩帶炸開 58 片＋上方灑落 44 片、約 3 秒後卸載；節點位置固定演算（非隨機）；遵守 `prefers-reduced-motion`（靜態光暈＋勾勾）；iOS 成功觸覺連兩下（間隔約 120ms）。
- 評價：僅 iOS 原生、僅已登入；情境 A 登入滿 30 天（`user.created_at`）或情境 B POST `total_count >= 2`；成功視窗關閉後約 1.5 秒呼叫；當次有慶祝則不呼叫；`localStorage` 90 天節流；`setTimeout` 在模組層級；外掛動態 `import`，失敗靜默。
- 後端三層架構，Controller 不碰資料庫；`stats.total_count = len(response.data)`，POST 用既有 `repo.count_user_stories`；訪客第 11 筆仍回 403。
- 前端 push 前必跑 `cd client && npx next lint`；元件測試檔頂端加 `// @vitest-environment jsdom`。
- 不用 `/ship`；iOS 發版走 `npm run release` → `ios:sync` → `build:ios`（不在本計畫範圍）。

## Review Focus

- `total_count` 缺漏（舊後端／失敗）：不得顯示慶祝或誤判為 0，回退到簡單成功畫面。（Task 4）
- 首頁 `/stats` 載入中或失敗：不得閃現引導區，也不得隱藏統計於 ≥1 的用戶。（Task 3）
- 用戶點「前往 My Storio」使 modal 卸載後，評價計時器仍須觸發。（Task 6）
- 第一部且訪客：慶祝後切換為訪客卡，中途關閉不得殘留計時器報錯。（Task 4）
- 搜尋頁不帶 `focus=1` 的既有入口行為不變。（Task 3）

## File Structure

- Create `client/src/components/FirstCollectGuide.tsx`、`FirstCollectCelebration.tsx`、`GuestSaveCard.tsx`；`client/src/hooks/useCollectionCount.ts`；`client/src/lib/reviewPrompt.ts`；`client/src/lib/haptics.ts`（兩次成功觸覺的薄封裝）。
- Modify `server/app/schemas/item.py`、`services/collection_service.py`、`repositories/collection_repo.py`；`client/src/app/page.tsx`、`app/search/page.tsx`、`components/AddToFolioModal.tsx`、`components/OnboardingGuideModal.tsx`、`i18n/locales.ts`、`client/package.json`。
- Tests：`server/tests/test_stats_api.py`、`test_collection_api.py`、`test_guest_limit.py`；`client/src/**/__tests__/`。

---

### Task 1: 後端 `total_count`

**Files:** Modify `server/app/schemas/item.py:31`（`StoryResponse`）、`server/app/services/collection_service.py:83`（`add_story`）、`server/app/repositories/collection_repo.py:~134-170`（`get_collection_stats`）；Test `server/tests/test_stats_api.py`、`test_collection_api.py`、`test_guest_limit.py`。

**Interfaces:**
- Produces: `StoryResponse.total_count: Optional[int] = None`；`GET /api/v1/collection/stats` 回應含 `total_count: int`。

- [ ] **Step 1: 寫失敗測試** — `test_stats_returns_total_count_zero`（無資料 → `total_count == 0`）、`test_stats_total_count_counts_all_rows`（3 列 → 3，含重複收藏），斷言既有欄位名稱與值不變；`test_post_collection_returns_total_count`（mock `count_user_stories` 回 1 → 回應 `total_count == 1`，原項目欄位不變）、第二部回 2；`test_guest_11th_still_403` 回歸。
- [ ] **Step 2: 跑測試確認失敗** — `cd server && pytest tests/test_stats_api.py tests/test_collection_api.py tests/test_guest_limit.py -v`，預期新測試 FAIL。
- [ ] **Step 3: 實作** — repo `get_collection_stats` 回傳 dict 加 `"total_count": len(response.data)`；schema 加選填欄位；`add_story` 在 `create_story` 後 `story.total_count = self.repo.count_user_stories(user_id)` 再回傳。
- [ ] **Step 4: 跑全套** — `cd server && pytest -q`（依 CLAUDE.md，備援路徑測試須 patch 清空 `OPENAI_API_KEY`；沿用現有 fixture）。預期全綠。
- [ ] **Step 5: Commit** — `feat(collection): stats 與 POST 回應新增 total_count`

### Task 2: 依賴與文案（含成功標題在地化）

**Files:** Modify `client/package.json`、`client/src/i18n/locales.ts`；Test `client/src/i18n/__tests__/firstCollectLocales.test.ts`。

**Interfaces:**
- Produces: `t.firstCollect.{eyebrow,title,searchButton,hint}`、`t.guestSave.{title,body,later}`、`t.modals.successTitle`、`t.onboarding` 最後按鈕 key（沿用現有 key 改文案）。Apple／Google 按鈕沿用現有登入元件文案。

- [ ] **Step 1: 寫失敗測試** — 遍歷上述 key，斷言 zh-TW 與 en 都存在且非空字串，且 `t.modals.successTitle` zh=「收藏成功」、en=「Saved」。
- [ ] **Step 2: 跑確認失敗** — `cd client && npx vitest run src/i18n`。
- [ ] **Step 3: 實作** — `npm i @capacitor/haptics@^7.0.5 @capacitor-community/in-app-review@^7.1.0`；`npm ls @capacitor/core` 無 peer 衝突；`locales.ts` 兩語系加入 Global Constraints 的文案。
- [ ] **Step 4: 跑確認通過** — 同上，PASS。
- [ ] **Step 5: Commit** — `feat(i18n): 首次收藏文案與外掛依賴`

### Task 3: 首頁引導區、學習卡按鈕、搜尋對焦

**Files:** Create `hooks/useCollectionCount.ts`、`components/FirstCollectGuide.tsx`；Modify `app/page.tsx`、`app/search/page.tsx`（`focus()` 現僅在約 134–136 行；輸入框 `inputRef` 依 `searchModeIndex` 輪替，約 480／524 行）、`components/OnboardingGuideModal.tsx`；Test 對應 `__tests__/`。

**Interfaces:**
- Produces: `useCollectionCount(): { count: number | null; loading: boolean }`（讀 `/api/v1/collection/stats` 的 `total_count`，需 token；失敗時 `count = null`）；`<FirstCollectGuide />` 無 props，按鈕 `router.push('/search?focus=1')`，按鈕不是 `input`。

- [ ] **Step 1: 寫失敗測試** — hook：loading、成功 0／1／N、失敗 → `count === null`；`FirstCollectGuide`：顯示標題／按鈕／提示、點擊導向 `/search?focus=1`、無 `input`；首頁：`count===0` 顯示引導區且無 `HomeStats` 與「檢視 MY STORIO」，`count>=1` 與現況一致，loading／null 兩者皆不顯示引導區（Review Focus）；搜尋頁：`?focus=1` 時當前輸入框取得焦點，無參數不取得焦點；學習卡最後按鈕為新文案且仍關閉並寫入 `storio_onboarding_seen`。
- [ ] **Step 2: 跑確認失敗** — `cd client && npx vitest run`。
- [ ] **Step 3: 實作** — 依 mockup 與 spec §3.2／§5（`rounded-3xl`、金 30% 邊框、金色漸層上 14%／下 3%）；`page.tsx` gating 以 `count === 0`；搜尋頁在掛載 `useEffect` 見 `focus=1`（`useSearchParams`）才 `inputRef.current?.focus()`。
- [ ] **Step 4: 跑確認通過** — `cd client && npx vitest run`。
- [ ] **Step 5: Commit** — `feat(home): 館藏為 0 的首次收藏引導區與搜尋對焦`

### Task 4: 成功畫面選擇、慶祝、訪客卡、觸覺

**Files:** Create `components/FirstCollectCelebration.tsx`、`components/GuestSaveCard.tsx`、`lib/haptics.ts`；Modify `components/AddToFolioModal.tsx:~84-96,125-154`；Test `components/__tests__/AddToFolioModal.success.test.tsx`、`lib/__tests__/haptics.test.ts`。

**Interfaces:**
- Consumes: `onSave` 結果 `{ id, total_count? }`；`user.is_anonymous`（取自既有 `useAuth`／store，沿用 `GuestLimitModal` 的取法）。
- Produces: `playSuccessHaptics(): Promise<void>`（非原生不呼叫，失敗吞掉，兩次 `notification(SUCCESS)` 間隔 120ms）；`<FirstCollectCelebration title posterUrl onDone? />`；`<GuestSaveCard onLater />`（沿用現有 Apple／Google 登入流程與 `migrate_guest_data`，「稍後再說」導向 `/collection`）。

- [ ] **Step 1: 寫失敗測試** — 選擇規則：`total_count===1` → 慶祝；`>=2` → 簡單版；訪客 → 訪客卡；第一部且訪客 → 慶祝約 3.5 秒後（fake timers）換訪客卡；`total_count` 缺漏 → 簡單版且不先顯示再切換（Review Focus）；`capacity_reached` 仍走 `GuestLimitModal`；成功標題讀 `t.modals.successTitle`（zh「收藏成功」、en「Saved」，不再出現寫死英文）；點遮罩仍呼叫 `onClose`；reduced-motion 不渲染彩帶節點；慶祝節點數 58＋44；觸覺：原生呼叫 2 次、網頁 0 次。
- [ ] **Step 2: 跑確認失敗** — `cd client && npx vitest run src/components src/lib`。
- [ ] **Step 3: 實作** — 以 `total_count` 在 `handleSave` 內決定 `successVariant: 'celebrate' | 'guest' | 'simple'`（不再另請求 `/stats`）；彩帶用 CSS keyframes＋固定演算位置；卸載計時器於 effect cleanup。
- [ ] **Step 4: 跑確認通過** — 同上，PASS。
- [ ] **Step 5: Commit** — `feat(collect): 第一部慶祝、訪客登入卡、成功標題在地化`

### Task 5: 系統評價視窗

**Files:** Create `lib/reviewPrompt.ts`；Modify `components/AddToFolioModal.tsx`（儲存成功當下登記）；Test `lib/__tests__/reviewPrompt.test.ts`。

**Interfaces:**
- Produces: `scheduleReviewPromptIfEligible(input: { isAnonymous: boolean; accountCreatedAt: string | null; totalCount: number | null; celebrated: boolean }): void`（內部判斷＋`setTimeout(…, 1500)`＋`localStorage` key `storio_review_prompt_at`；成功視窗「關閉後」才開始計時需由呼叫端以 `onClose` 觸發，故另提供 `armReviewPrompt()`：登記資格於模組變數，`flushReviewPrompt()` 於關閉時啟動 1.5 秒計時）。

- [ ] **Step 1: 寫失敗測試** — 已登入＋滿 30 天 → 呼叫外掛；已登入＋`totalCount>=2` → 呼叫；兩者皆否／訪客／`celebrated` → 不呼叫；90 天內已呼叫 → 不呼叫；非 iOS → 不呼叫；外掛拋錯 → 吞掉；flush 後即使呼叫端元件卸載，計時器仍觸發（fake timers，Review Focus）。
- [ ] **Step 2: 跑確認失敗** — `cd client && npx vitest run src/lib/__tests__/reviewPrompt.test.ts`。
- [ ] **Step 3: 實作** — 名稱與簽名如上；外掛 `await import('@capacitor-community/in-app-review')` 後 `InAppReview.requestReview()`；`isIOSPlatform()` 取自 `lib/appleAuth`；`AddToFolioModal` 在 success 時 `arm`、在 `onClose`／「前往 My Storio」時 `flush`。
- [ ] **Step 4: 跑確認通過** — 同 Step 2，PASS；另確認 Profile「為我們評分」測試／行為未變。
- [ ] **Step 5: Commit** — `feat(review): iOS 系統評價視窗與 90 天節流`

### Task 6: 驗證與整合

- [ ] **Step 1:** `cd client && npm test`、`cd server && pytest -q` 全綠；`cd client && npx next lint` 無錯。
- [ ] **Step 2:** 起 dev server，手機寬度截圖：館藏 0 首頁（中／英單行）、≥1 首頁、第一部慶祝畫格、訪客卡、減少動態；對照 mockup。
- [ ] **Step 3:** `/qa` 掃新增畫面；訪客→登入後收藏保留（dev 實測）。
- [ ] **Step 4:** iOS 模擬器／真機：觸覺、系統評價視窗、`cap sync` 後外掛可用（開發版評價視窗行為不代表正式版）。
- [ ] **Step 5:** `superpowers:verification-before-completion` → `/review` → `openspec-archive-change`；勾選 `tasks.md`。

## Self-Review

- Spec 覆蓋：§3.1→T3；§3.2→T3；§3.3→T4；§3.4→T4；§3.5→T5；標題在地化→T2／T4；後端→T1；驗收→T6。
- 型別一致：`total_count`（後端欄位）→`result.total_count`（T4／T5 輸入 `totalCount`）→`useCollectionCount().count`（首頁）。
- 已知簡化：評價 arm／flush 兩階段是為了「關閉後 1.5 秒」且 modal 卸載後仍觸發。
