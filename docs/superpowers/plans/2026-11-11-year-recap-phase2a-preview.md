# 年度 Recap 階段 2A（預覽與入口）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用戶能在 App 內看到自己的年度 Recap：橫向場景預覽、首頁限時卡片、Profile 常駐入口與年份選單（tasks.md 2.1–2.7，加上兩項後端補強）。圖片輸出與分享在 [階段 2B](2026-11-11-year-recap-phase2b-share.md)。

**Architecture:** 場景元件是**純展示元件**（只吃資料、文案、語系、比例，不用 hook、不自己抓資料），固定 400×711（9:16）／400×500（4:5）；預覽用 CSS 縮放顯示，2B 的 Puppeteer 渲染頁載入同一批元件，所以「預覽所見即輸出所得」。業務門檻全在後端，前端只渲染非 null 的場景。入口邏輯（窗口、關閉狀態）寫成純函式，元件只做呈現。

**Tech Stack:** Next.js 14（`output: 'export'` 靜態輸出，所以是 `/recap?year=` 查詢參數頁，比照 `app/collection/item/page.tsx` 與 `Suspense`）、Tailwind、framer-motion、Vitest＋Testing Library（jsdom）、FastAPI（兩項補強）。

**Spec:** `openspec/changes/year-recap/`（`specs/year-recap`、`specs/recap-entry`、`tasks.md` 2.1–2.7）；產品設計 `docs/superpowers/specs/2026-11-10-year-recap-design.md` §3、§4、§6；場景示意圖 Artifact https://claude.ai/artifact/8twicnf6tvxoHKGCgZTWP2（Tu 已核可的版面方向）。階段 1：`docs/superpowers/plans/2026-11-10-year-recap-phase1.md`（後端 API 已上線）。

## Global Constraints

- 全部文案、註解、commit 用繁體中文；術語依 `GEMINI.md`（Folio／Stories，不用 Desert 等）。所有用戶可見文字放 `client/src/i18n/locales.ts`（zh-TW／en-US），**文案必須正面、不責備**（不得出現「你還沒…」）。
- 視覺：Folio Black `#0d0d0d`、Card Surface `#121212`、Storio Gold `#c5a059`；手機優先（iPhone 16 Pro，以 390px 驗證）；不用底部導覽列。
- 場景元件尺寸固定：`SCENE_SIZE = {'9:16': {w: 400, h: 711}, '4:5': {w: 400, h: 500}}`；每個場景角落帶 Storio 標誌（`/image/logo/logo.png`）。
- 估算標示：總時間「至少」；影集、書的時間標「估算」「約」；絕不顯示成精確值；`items_with_data === 0` 時不顯示時間數字。
- 動畫：數字 0→實際值計數；`prefers-reduced-motion` 或 `animate={false}`（2B 渲染用）時直接顯示終值。
- 圖片：外部海報一律經後端代理 `${NEXT_PUBLIC_API_URL}/api/v1/proxy/image?url=…`（與 `MonthlyRecapTemplate` 的 `getImageProps` 相同做法），否則 Puppeteer 抓不到。
- localStorage 一律包 try/catch，失敗退化為「每次顯示」、不得報錯。
- 前端 push 前必跑 `cd client && npx next lint`、`npx tsc --noEmit`、`npm test`（Next build 會 lint 測試檔）。測試檔頂端 `// @vitest-environment jsdom`；mock `@/hooks/useTranslation` 回 `translations['zh-TW']`（見 `components/__tests__/FirstCollectGuide.test.tsx`）。
- 訪客（匿名帳號）與正式用戶同一套規則；Recap 提示登入以保留資料。
- 不得在 main 上開發；本計畫在分支 `worktree-year-recap-phase2`。2A 完成後 Recap 對用戶就是可見功能（首頁卡片、Profile 入口），但沒有分享就缺了「拉新」那一半，所以 **2A 與 2B 同一個 App 版本發佈**；何時合併回 main 由 Tu 決定（預設：2B 完成並驗證後一次合併）。

## Review Focus

1. **窗口邊界**：10 月 31 日不顯示、11 月 1 日顯示、2 月 28／29 日顯示、3 月 1 日不顯示；跨年（1 月看去年）；用**本地日期**（`localToday()` 風格）而非 UTC（Task 3、10 測試）。
2. **關閉狀態以年份記**：關閉 2026 不影響 2027；localStorage 拋例外時不報錯且每次顯示（Task 3、10）。
3. **場景為 null 一律跳過**：只有 1 筆心得、無書、無評分、只有 1 個月有收藏、少於 5 部有年份等組合，預覽頁不得出現空白場景或 `undefined`（Task 7–9、11 測試）。
4. **Profile 不足門檻**：當年 0／1／2 部各顯示正確的「再收藏 N 部」；有往年達標時仍可點入；`/recap/years` 失敗時不崩潰（Task 12）。
5. **稱號決定性與區分度**：同輸入同稱號、前兩名不分先後、第二名只有 1 部時不亂混搭、類別資料不足走保底（Task 2.5）。
6. **資料載入中／失敗／404／403**：預覽頁各有明確狀態，不得停在無限轉圈；`metadata_pending > 0` 只自動重取一次（Task 5、11）。

---

## 檔案結構

- Modify `server/app/services/recap_stats.py`、`recap_service.py`、`server/app/schemas/recap.py`、`server/tests/test_recap_stats.py`、`test_recap_service.py`、`test_recap_api.py`
- Create `client/src/lib/recap/types.ts`（API 型別）、`scenes.ts`（場景清單）、`entry.ts`（窗口、關閉狀態）、`format.ts`（時間、數字格式）
- Create `client/src/lib/providerLogin.ts`（從 `GuestSaveCard` 抽出登入分派）；Modify `client/src/components/GuestSaveCard.tsx`
- Modify `client/src/i18n/locales.ts`；Create `client/src/i18n/__tests__/recapLocales.test.ts`
- Create `client/src/hooks/useRecap.ts`（`useRecap`、`useRecapYears`）
- Create `client/src/components/recap/`：`SceneFrame.tsx`、`CountUp.tsx`、`posterSrc.ts`、`RecapScene.tsx`（依場景鍵分派）、`scenes/`（`OpeningScene`、`TotalScene`、`MoviesScene`、`SeriesScene`、`BooksScene`、`GenresScene`、`StoryAgeScene`、`TitleScene`、`MonthlyScene`、`PeakMonthScene`、`MonthsActiveScene`、`TopRatedScene`、`FirstLastScene`、`ReflectionScene` 各一檔）、`RecapHomeCard.tsx`、`RecapProfileRow.tsx`、`RecapGuestHint.tsx`
- Create `client/src/app/recap/page.tsx`；Modify `client/src/app/page.tsx`（加卡片）、`client/src/app/profile/page.tsx`（加一列）
- Tests：各檔旁 `__tests__/`

測試指令：前端單檔 `cd client && npx vitest run <相對路徑>`；後端單檔見階段 1 計畫（dummy env）。

---

### Task 1: 後端補強——各場景的海報清單

**問題：** 階段 1 的回應只有 `top_rated.items`、`first_last`、`reflection` 帶海報；設計要求電影／影集／書／類別／月最投入場景的背景用對應海報，目前沒資料可用。

**Files:** Modify `server/app/services/recap_stats.py`、`server/app/services/recap_service.py`；Test `server/tests/test_recap_stats.py`、`test_recap_service.py`

**Interfaces:**
- Produces（`recap_stats.py`）：`recent_posters(rows: List[dict], limit: int = 6) -> List[str]`：只取 `poster_path` 非空者，依 `_sort_key` 由近到遠，不重複，最多 `limit` 個。
- Produces（回應）：`total`、`movies`、`series`、`books` 各多一個 `posters: List[str]`；`genres` 多 `posters`（含第一名類別的作品，比對不分大小寫）；`peak_month` 多 `posters`（該月收藏的作品）。全部可為空 list，不為 null。

- [ ] **Step 1: 寫失敗測試**：`recent_posters`——去除 None／空字串、重複只留一個、最近的在前、`limit` 生效、輸入全無海報回 `[]`；service——3 部電影＋1 本書時 `movies.posters` 只含電影海報、`books.posters` 只含書、`total.posters` 含全部且 ≤ 6；`genres.posters` 只含具第一名類別的作品；`peak_month.posters` 只含該月作品；沒有海報的資料回 `[]` 不拋錯。
- [ ] **Step 2: 跑測試確認失敗**（`pytest test_recap_stats.py test_recap_service.py`）。
- [ ] **Step 3: 實作**：`recent_posters`；`RecapService._compose` 在對應場景 dict 加 `posters`（`peak_month` 以 `monthly_counts` 的月份挑 rows）。`RecapResponse` 各場景仍是 `Optional[dict]`，不改 schema。
- [ ] **Step 4: 跑測試確認通過**，再跑後端全套。
- [ ] **Step 5: Commit** — `feat(recap): 場景回應加入海報清單`

### Task 2: 後端補強——年份清單回報當年部數

**問題：** `/recap/years` 只列 ≥ 3 部的年份，Profile 無法顯示「再收藏 N 部」（需要當年目前幾部）。

**Files:** Modify `server/app/services/recap_service.py`、`server/app/schemas/recap.py`；Test `test_recap_service.py`、`test_recap_api.py`

**Interfaces:**
- Produces：`RecapYearsResponse` 新增 `current: RecapCurrent`，`RecapCurrent = {year: int, count: int}`；`RecapService.list_years(user_id, today: Optional[date] = None)` 以 `today.year`（預設 `date.today()`）為當年，`count` 為該年列數（可為 0，不受門檻限制）。

- [ ] **Step 1: 寫失敗測試**：當年 1 筆 → `current == {"year": Y, "count": 1}` 且 `years` 不含 Y；當年 0 筆 → `count == 0`；當年 5 筆 → 同時出現在 `years`；endpoint 回應含 `current`；舊欄位 `threshold`、`years` 不變。
- [ ] **Step 2–4:** 紅 → 實作 → 綠，後端全套。
- [ ] **Step 5: Commit** — `feat(recap): 年份清單回報當年部數`

### Task 2.5: 後端補強——稱號改版（前兩名類別混搭）

**問題（Tu 回饋 2026-11-11）：** 現行 12 個稱號只看第一名類別，鑑別度不足；科幻與奇幻應分開、動畫要依其他類別細分、不要「童心未泯」；稱號可以更多，要有混搭。

**Files:** Modify `server/app/services/recap_titles.py`；Test `server/tests/test_recap_titles.py`（整檔改寫）

**Interfaces:**
- Produces：
  - `GENRE_FAMILIES: Dict[str, Tuple[str, ...]]`——類別「家族」→ 正規式（對小寫化後的類別名稱 `re.search`），見下表。
  - `genre_families(genres: List[str]) -> Set[str]`：一部作品的所有類別對應到的家族集合（一個類別可屬多個家族，例如 TMDB 影集的 `Sci-Fi & Fantasy` 同時屬 `scifi` 與 `fantasy`、`Action & Adventure` 同時屬 `action` 與 `adventure`）。
  - `ranked_families(rows: List[dict]) -> List[Tuple[str, int]]`：每部作品對每個所屬家族各計 1；依「數量多 → 家族優先序（見下）」排序（決定性）。
  - `TITLES`、`SINGLE_TITLES: Dict[str, str]`（家族 → 稱號 id）、`PAIR_TITLES: Dict[FrozenSet[str], str]`（兩個家族 → 稱號 id，**不分先後**）。
  - `select_title(rows, year) -> Optional[dict]`（簽名不變，回 `{"id","zh","en"}`）。
- **選取演算法（依序，第一個命中者勝）：**
  1. 作品數 < 5 → `None`。
  2. 至少 3 部作品有類別資料時才看類別：`ranked = ranked_families(rows)`；`top1` 為第一名；`second` 為第二名且**數量 ≥ 2** 才採用。若有 `second` 且 `{top1, second}` 在 `PAIR_TITLES` → 回該混搭稱號；否則回 `SINGLE_TITLES[top1]`。
  3. 類別資料不足或沒有任何類別對應到家族：作品平均發行年份比當年早 ≥ 20 年（`story_age`）→ `old_soul`；否則數量最多的媒體類型（同數量時 movie > tv > book）→ `cinephile`／`series_voyager`／`bookworm`；其餘 → `story_keeper`。
- **家族優先序（同數量時，越專門越優先，避免被 Action／Drama 這類泛類別吃掉；我的決定）：** `horror, scifi, fantasy, animation, mystery, crime, thriller, war, western, documentary, history, music, romance, comedy, family, selfhelp, business, literary, drama, action, adventure`。

**家族對照（正規式；`family` 與 `kids` 用整串比對，避免誤中書類別 "Family Life"／"Family & Relationships"）：**

| 家族 | 正規式 | 家族 | 正規式 |
|---|---|---|---|
| action | `\baction` | mystery | `\bmystery` |
| adventure | `\badventure` | romance | `\bromance` |
| animation | `\banimation` | scifi | `science fiction\|sci-fi\|\bdystopian` |
| comedy | `\bcomedy` | thriller | `\bthriller` |
| crime | `\bcrime` | war | `^war\b` |
| documentary | `\bdocumentary` | western | `\bwestern` |
| drama | `\bdrama` | selfhelp | `self-help\|inspiration\|personal growth\|motivational\|personal success` |
| family | `^(family\|kids)$` | business | `\bbusiness\|\bfinance\|\bmoney\|\beconomics\|\binvesting` |
| fantasy | `\bfantasy` | literary | `^classics$\|\bliterary\|\bliterature\|ancient & classical` |
| history | `\bhistory` | music | `^music` |
| horror | `\bhorror` | | |

**單一家族稱號（21）：** action 熱血先鋒 / The Adrenaline Chaser（`adrenaline_chaser`）；adventure 冒險探路人 / The Pathfinder（`pathfinder`）；animation 繪夢旅人 / The Dream Painter（`dream_painter`）；comedy 快樂製造機 / The Joy Maker（`joy_maker`）；crime 罪案觀察家 / The Crime Watcher（`crime_watcher`）；documentary 真實探索者 / The Truth Seeker（`truth_seeker`）；drama 情感收藏家 / The Heart Collector（`heart_collector`）；family 溫暖守護者 / The Warm Hearth（`warm_hearth`）；fantasy 魔法旅人 / The Spellbound Traveler（`spellbound_traveler`）；history 時光考古家 / The Time Archaeologist（`time_archaeologist`）；horror 午夜漫遊者 / The Midnight Wanderer（`midnight_wanderer`）；music 旋律收藏家 / The Melody Keeper（`melody_keeper`）；mystery 謎題解碼員 / The Puzzle Solver（`puzzle_solver`）；romance 浪漫派 / The Romantic（`romantic`）；scifi 星際旅人 / The Star Voyager（`star_voyager`）；thriller 心跳加速者 / The Edge-Sitter（`edge_sitter`）；war 戰場見證者 / The War Witness（`war_witness`）；western 荒野浪人 / The Frontier Drifter（`frontier_drifter`）；selfhelp 自我成長實踐家 / The Self-Builder（`self_builder`）；business 財富思考家 / The Wealth Thinker（`wealth_thinker`）；literary 文學靈魂 / The Literary Soul（`literary_soul`）。

**混搭稱號（33，兩家族不分先後）：** scifi+fantasy 跨次元旅人 / The Dimension Hopper（`dimension_hopper`）；scifi+action 星際戰士 / The Space Warrior（`space_warrior`）；scifi+thriller 反烏托邦觀察員 / The Dystopia Watcher（`dystopia_watcher`）；scifi+drama 宇宙思想家 / The Cosmic Thinker（`cosmic_thinker`）；scifi+animation 銀河動畫迷 / The Galactic Animator（`galactic_animator`）；scifi+adventure 星海探險家 / The Star-Sea Explorer（`star_sea_explorer`）；fantasy+adventure 史詩冒險家 / The Epic Adventurer（`epic_adventurer`）；fantasy+animation 魔法繪夢者 / The Storybook Wizard（`storybook_wizard`）；fantasy+romance 童話信徒 / The Fairytale Believer（`fairytale_believer`）；fantasy+drama 傳說吟遊者 / The Legend Bard（`legend_bard`）；animation+comedy 歡樂動畫迷 / The Cartoon Jester（`cartoon_jester`）；animation+action 熱血動漫魂 / The Hero at Heart（`hero_at_heart`）；animation+family 闔家動畫夜 / The Movie-Night Regular（`movie_night_regular`）；animation+adventure 夢想冒險團 / The Dream Chaser（`dream_chaser`）；animation+drama 治癒系動畫迷 / The Gentle Animator（`gentle_animator`）；horror+thriller 午夜驚魂客 / The Nightmare Seeker（`nightmare_seeker`）；horror+mystery 暗夜解謎人 / The Dark Sleuth（`dark_sleuth`）；horror+comedy 笑著尖叫的人 / The Scream-Laugher（`scream_laugher`）；crime+mystery 偵探筆記本 / The Detective's Notebook（`detective_notebook`）；crime+thriller 暗巷追兇者 / The Alley Tracker（`alley_tracker`）；crime+drama 黑色故事家 / The Noir Storyteller（`noir_storyteller`）；action+thriller 腎上腺素飆升者 / The Edge-of-Seat Runner（`edge_runner`）；action+comedy 爆笑動作迷 / The Action Jester（`action_jester`）；action+adventure 無畏冒險者 / The Fearless（`fearless`）；drama+romance 愛情故事收藏家 / The Love-Story Keeper（`love_story_keeper`）；drama+history 歲月說書人 / The Chronicler（`chronicler`）；drama+war 烽火見證人 / The Wartime Witness（`wartime_witness`）；comedy+romance 甜蜜喜劇迷 / The Rom-Com Devotee（`romcom_devotee`）；comedy+family 歡樂一家人 / The Family Laugher（`family_laugher`）；documentary+history 歷史研究員 / The Archivist（`archivist`）；mystery+thriller 燒腦懸疑迷 / The Brain-Teaser（`brain_teaser`）；literary+history 古今讀書人 / The Reader of Ages（`reader_of_ages`）；selfhelp+business 人生成長投資家 / The Growth Investor（`growth_investor`）；（dev 實測後補）drama+thriller 張力觀察家 / The Tension Watcher（`tension_watcher`）；drama+mystery 解謎劇迷 / The Plot Detective（`plot_detective`）；drama+comedy 悲喜交集派 / The Bittersweet Heart（`bittersweet_heart`）。

**保底稱號（5，沿用）：** `old_soul` 老靈魂 / The Old Soul、`bookworm` 書海漫遊者 / The Bookworm、`series_voyager` 追劇旅人 / The Series Voyager、`cinephile` 銀幕常客 / The Cinephile、`story_keeper` 故事守護者 / The Story Keeper。移除：`star_voyager` 以外的舊科幻／奇幻合併規則、`forever_young`（童心未泯，Tu 不喜歡）、`explorer`（改為 `truth_seeker`）。全部文案為草案，**交 Tu 審閱**。

- [ ] **Step 1: 寫失敗測試**（以 `rows_of(n, genres=…)` 工廠建 5 部以上的作品）：
  - 單一家族：全 `["Science Fiction"]` → `star_voyager`；全 `["Fantasy"]` → `spellbound_traveler`（科幻與奇幻分開）；`["Animation"]` → `dream_painter`；全 `["Horror"]` 與 `["HORROR"]` 結果相同。
  - 混搭：影集類別 `["Sci-Fi & Fantasy"]` 的作品 → `dimension_hopper`（一個類別同時算 scifi 與 fantasy）；`["Action & Adventure"]` → `fearless`；3 部 `["Animation","Comedy"]`＋2 部 `["Animation","Action"]` → 第一 animation、第二 comedy → `cartoon_jester`；前兩名為 fantasy、scifi 與 scifi、fantasy 結果相同（不分先後）。
  - 第二名數量只有 1 → 退回單一稱號（例如 4 部 horror＋1 部 comedy → `midnight_wanderer`，不是 `scream_laugher`）。
  - 同數量決勝：scifi 與 drama 各 3 部 → 第一名為 scifi（優先序）；結果穩定（同輸入跑兩次相同）。
  - 書類別：`["Mystery & Detective"]` ×5 且 media_type book → `puzzle_solver`；`["Family Life"]` 不屬 family 家族 → 沒有任何家族 → 退回 `bookworm`；`["Personal Finance"]` ×3＋`["Inspiration & Personal Growth"]` ×2 → `growth_investor`（business＋selfhelp）。
  - 類別資料不足：只有 2 部有類別 → 走保底（`old_soul`／媒體類型）；4 部作品 → `None`；有類別但無一對應家族（例如 `["Reality"]`）→ 保底。
  - 資料完整性：`TITLES` 每個值 `zh`、`en` 非空；`id` 不重複、`zh` 名稱不重複；`SINGLE_TITLES`／`PAIR_TITLES` 引用的 id 都在 `TITLES`；`len(TITLES) == len(SINGLE_TITLES) + len(PAIR_TITLES) + 5`；`PAIR_TITLES` 的每個鍵都是 2 個不同家族且都在 `GENRE_FAMILIES`。
  - 區分度：用 10 組不同的前兩名類別組合，至少產出 8 個不同稱號。
- [ ] **Step 2: 跑測試確認失敗。**
- [ ] **Step 3: 實作**（資料表用資料結構定義，不寫成一長串 if；`select_title` 簽名與回傳格式不變，所以 `RecapService`、API、前端不需改）。
- [ ] **Step 4: 跑測試確認通過**，後端全套通過。
- [ ] **Step 5: Commit** — `feat(recap): 稱號改版——前兩名類別混搭、科幻奇幻分開、動畫細分`
- [ ] **Step 6: 用 dev 帳號驗證分佈**（唯讀）：對 dev 每個有 ≥ 5 部收藏的帳號以真實資料計算稱號，列出分佈（只印稱號 id 與次數，不印個資），確認不是集中在少數幾個；結果回報 Tu。

### Task 3: 前端型別與純函式（窗口、場景清單、關閉狀態、格式）

**Files:** Create `client/src/lib/recap/{types,scenes,entry,format}.ts`；Test `client/src/lib/recap/__tests__/{scenes,entry,format}.test.ts`

**Interfaces:**
- Produces（`types.ts`）：`SceneKey`（15 個鍵：`opening|total|movies|series|books|genres|story_age|title|monthly|peak_month|months_active|top_rated|first_last|reflection|closing`）、`RecapData`（與後端 `RecapResponse` 一致，場景欄位型別化，null 表示不出現）、`RecapYears = {threshold: number; years: {year: number; count: number}[]; current: {year: number; count: number}}`、`RecapAspect = '9:16' | '4:5'`、`SCENE_SIZE`。
- Produces（`scenes.ts`）：`buildScenes(recap: RecapData, opts: {forShare: boolean}): SceneKey[]`——依固定順序回傳**出現的**場景；`forShare=false` 不含 `closing`（預覽最後一頁是「繼續收藏」）；`forShare=true` 含 `closing`。順序即上述 15 個鍵順序。
- Produces（`entry.ts`）：`recapWindowYear(today: Date): number | null`（本地日期；11、12 月→當年；1、2 月→去年；其他→null）；`dismissKey(year: number): string`（`storio_recap_dismissed_<year>`）；`isDismissed(year): boolean`、`dismiss(year): void`（皆 try/catch，例外時 `isDismissed` 回 false）。
- Produces（`format.ts`）：`formatDuration(minutes: number, locale: 'zh-TW' | 'en-US'): {value: number; unit: 'h' | 'm'}`——≥ 60 分鐘用小時（四捨五入到整數），否則分鐘；`decadeLabel(decade: number, locale): string`（`1990` → 「90 年代」／「1990s」）。

- [ ] **Step 1: 寫失敗測試**
  - `recapWindowYear`：`2026-10-31`→null、`2026-11-01`→2026、`2026-12-31`→2026、`2027-01-01`→2026、`2027-02-28`→2026、`2028-02-29`→2027、`2027-03-01`→null、`2026-07-15`→null。
  - `dismiss`：`dismiss(2026)` 後 `isDismissed(2026)` 為 true、`isDismissed(2027)` 為 false；`localStorage.getItem` 與 `setItem` 都被 stub 成拋例外時 `isDismissed` 回 false、`dismiss` 不拋錯。
  - `buildScenes`：全部場景皆有資料（`forShare=true`）→ 15 個且順序正確；`forShare=false` → 14 個不含 `closing`；只有 `opening`／`total`（其餘 null）→ `['opening','total']`（預覽）與 `['opening','total','closing']`（分享）；`monthly`／`months_active` 為 null 時跳過。
  - `formatDuration(90, 'zh-TW')` → `{value: 2, unit: 'h'}`（90 分 → 1.5 → 四捨五入 2）；`formatDuration(45)` → `{value: 45, unit: 'm'}`；`decadeLabel(1990, 'zh-TW') === '90 年代'`、`decadeLabel(2010, 'en-US') === '2010s'`。
- [ ] **Step 2–4:** 紅 → 實作 → 綠。
- [ ] **Step 5: Commit** — `feat(recap): 前端型別、窗口與場景清單純函式`

### Task 4: i18n 文案（2.1）

**Files:** Modify `client/src/i18n/locales.ts`；Test `client/src/i18n/__tests__/recapLocales.test.ts`

**Interfaces:**
- Produces：`translations[lang].recap` 區塊，鍵如下（兩語系鍵集合必須完全相同）：`eyebrow`、`partialBadge`（「今年到目前為止」）、`windowCardTitle`、`windowCardCta`、`dismiss`；`profileRow`、`profileRowEncourage`（含 `{n}`、`{year}` 佔位）、`yearPickerTitle`；`loading`、`errorRetry`、`notEnough`（含 `{n}`）、`continueCollecting`、`share`；`guestHint.title`、`guestHint.body`、`guestHint.cta`；`reflection.swap`；`estimate`（「估算」）、`atLeast`、`about`、`hours`、`minutes`、`episodes`、`pages`、`titles`（movies／series／books 的量詞）；以及每個場景自己的 `scene.<key>.*`（`opening`、`total`、`movies`、`series`、`books`、`genres`、`storyAge`、`title`、`monthly`、`peakMonth`、`monthsActive`、`topRated`、`firstLast`、`reflection`、`closing` 的標題與說明，含 `{n}`、`{year}`、`{month}` 佔位）；`months`（12 個月名稱陣列）。
- 固定文案（spec 逐字）：profileRowEncourage（zh-TW）＝「再收藏 {n} 部，就能看到你的 {year}」；closing 標語（兩語系皆）＝ "Collect stories in your Folio"（放在 `scene.closing.tagline`，供 2B 使用）。其餘文案由實作者依「正面、不責備」草擬，**交 Tu 審閱**；稱號文字來自後端（`title.zh`／`title.en`），不放在這裡。

- [ ] **Step 1: 寫失敗測試**（比照 `firstCollectLocales.test.ts`）：兩語系 `recap` 的鍵集合遞迴相同；所有值為非空字串（`months` 為長度 12 的非空字串陣列）；含 `{n}` 的鍵在兩語系都含 `{n}`；`profileRowEncourage` zh-TW 含「再收藏」且不含「還沒」「沒有」之類責備詞（用禁用詞清單斷言：`['還沒', '尚未', '你沒有', "haven't", 'yet']` 不出現在任何 `recap` 值）。
- [ ] **Step 2–4:** 紅 → 加文案 → 綠；跑 `npm test` 確認原有 locale 測試不受影響。
- [ ] **Step 5: Commit** — `feat(recap): 年度 Recap 中英文文案`

### Task 5: API client 與 hooks（2.2）

**Files:** Create `client/src/hooks/useRecap.ts`；Test `client/src/hooks/__tests__/useRecap.test.ts`

**Interfaces:**
- Consumes：`useAuth()`（`token`、`loading`）、`getApiUrl`。
- Produces：
  - `useRecap(year: number | null): {data: RecapData | null; status: 'idle'|'loading'|'ready'|'not_enough'|'forbidden'|'error'; needed: number | null; retry: () => void}`：`year` 為 null 或尚無 token 時 `idle`；404 且 `detail.code === 'recap_not_enough'` → `not_enough`＋`needed`；403 → `forbidden`；其他非 2xx 或例外 → `error`；`metadata_pending > 0` 時 4 秒後**自動重取一次**（不遞迴，重取後即使仍 > 0 也不再重取）；卸載或換年份時取消過期回應（只採用最後一次請求）。
  - `useRecapYears(): {years: RecapYears | null; loading: boolean; error: boolean}`。

- [ ] **Step 1: 寫失敗測試**（mock `fetch`、`useAuth`；用 fake timers）：200 → `ready` 且 `data.year`；404 `{detail:{code:'recap_not_enough',needed:2}}` → `not_enough`、`needed===2`；403 → `forbidden`；500 與網路例外 → `error`；`metadata_pending: 3` → 4 秒後第二次請求、第二次回 `metadata_pending: 3` 仍只請求共 2 次；換年份時舊回應不覆蓋新年份；`useRecapYears` 成功／失敗；請求帶 `Authorization: Bearer <token>`；無 token → 不發請求。
- [ ] **Step 2–4:** 紅 → 實作 → 綠。
- [ ] **Step 5: Commit** — `feat(recap): useRecap 與 useRecapYears hooks`

### Task 6: 場景元件基礎件

**Files:** Create `client/src/components/recap/{SceneFrame.tsx,CountUp.tsx,posterSrc.ts}`；Test `client/src/components/recap/__tests__/{SceneFrame,CountUp,posterSrc}.test.tsx`

**Interfaces:**
- Produces：
  - `posterSrc(path: string | null | undefined): {src: string; crossOrigin?: 'anonymous'}`：空值→`/image/defaultMoviePoster.svg`；`data:`／`blob:`／以 `/image/` 開頭→原樣；其他→`${NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'}/api/v1/proxy/image?url=<encoded>`＋`crossOrigin: 'anonymous'`。
  - `<SceneFrame aspectRatio posters? filmEdge? children />`：固定寬高 `SCENE_SIZE[aspectRatio]`（px 寫死，不隨視窗縮放）；底層 `#0d0d0d`、海報背景（最多 6 張，低透明度＋暗色漸層保證文字可讀）；`filmEdge` 加底片邊（電影場景用）；右上或角落放 Storio 標誌；`data-testid="scene-frame"`。
  - `<CountUp value animate duration? format? />`：`animate` 為 true 且未開啟 `prefers-reduced-motion` 時 0→`value` 計數（requestAnimationFrame，約 900ms，ease-out）；否則首次渲染就顯示終值。

- [ ] **Step 1: 寫失敗測試**：`posterSrc` 五種輸入（空、data、blob、`/image/…`、外部 URL）；`SceneFrame` 9:16 寬 400 高 711、4:5 高 500（讀 inline style）、有 logo `img`、`posters` 渲染至多 6 張、`filmEdge` 時有 `data-film-edge`；`CountUp`：`animate={false}` 立即顯示 `value`；`matchMedia('(prefers-reduced-motion: reduce)')` 為 true 時立即顯示終值；`animate` 為 true 時初始顯示 0、推進 timers 後等於 `value`；`value` 為 0 不報錯。
- [ ] **Step 2–4:** 紅 → 實作 → 綠。
- [ ] **Step 5: Commit** — `feat(recap): 場景框架、計數動畫與海報來源`

### Task 7: 場景（一）開場、總數、電影、影集、書

**Files:** Create `client/src/components/recap/scenes/{OpeningScene,TotalScene,MoviesScene,SeriesScene,BooksScene}.tsx`；Test `client/src/components/recap/__tests__/scenesA.test.tsx`

**Interfaces:**
- 每個場景元件的共同 props：`SceneProps<T> = {data: T; copy: RecapCopy; locale: 'zh-TW' | 'en-US'; aspectRatio: RecapAspect; animate: boolean; year: number; isPartial: boolean}`，其中 `RecapCopy = Translations['recap']`（由呼叫端傳入，**元件內不使用 hook**）。
- 內容規則：
  - Opening：大字年份＋「你的 Storio 一年」；`isPartial` 時顯示 `copy.partialBadge`。
  - Total：作品總數（`CountUp`）；時間文案——`items_with_data === 0` 不顯示時間；否則「至少 N 小時」（`formatDuration`）；`estimated` 為 true 時加 `copy.estimate`。
  - Movies（`filmEdge`、背景 `data.posters`）：部數、約多少小時（無資料不顯示時間）。
  - Series：部數、約多少集（`episodes`）、約多少小時；標「估算」。
  - Books：本數、約多少頁（`pages`）、約多少小時；標「估算」。

- [ ] **Step 1: 寫失敗測試**（以 zh-TW 文案、`animate={false}`）：Opening 含年份、`isPartial` 時出現「今年到目前為止」、否則不出現；Total 顯示總數；`items_with_data: 0` 時**不出現**「小時」「分鐘」字樣；`minutes: 3907`（65 小時多）→ 「至少 65 小時」；`estimated` 時有「估算」；Movies 有 `data-film-edge`；Series 顯示集數與「約」；Books 顯示頁數；任一場景 `posters: []` 不報錯且有 `scene-frame`；4:5 比例時 frame 高 500。
- [ ] **Step 2–4:** 紅 → 實作 → 綠。
- [ ] **Step 5: Commit** — `feat(recap): 開場、總數、電影、影集、書場景`

### Task 8: 場景（二）類別、故事年齡、稱號、每月節奏、月最投入

**Files:** Create `client/src/components/recap/scenes/{GenresScene,StoryAgeScene,TitleScene,MonthlyScene,PeakMonthScene}.tsx`；Test `client/src/components/recap/__tests__/scenesB.test.tsx`

**Interfaces:** 同 Task 7 的 `SceneProps<T>`。內容規則：
  - Genres：前三名長條（寬度以第一名為 100% 等比），顯示類別名與部數；背景 `data.posters`。
  - StoryAge：大字 `age`（「故事年齡 N 歲」）與「最愛年代」`decadeLabel(favorite_decade)`。
  - Title：依 `locale` 顯示 `data.zh` 或 `data.en` 作為稱號，大字、置中。
  - Monthly：12 根長條（`counts`，最高者為 100% 高度，0 為極小占位），月份標籤用 `copy.months`；最高月強調。
  - PeakMonth：月份名稱（`copy.months[month-1]`）與部數；背景 `data.posters`。

- [ ] **Step 1: 寫失敗測試**：Genres 三筆資料顯示三個名稱，第一名長條寬度 100%、第二名依比例；只有 1 筆類別時只渲染 1 條；StoryAge `age: 17, favorite_decade: 1990` 顯示 17 與「90 年代」；Title zh-TW 顯示 `zh`、en-US 顯示 `en`；Monthly 渲染 12 根長條、`counts` 全 0 的月份不報錯、最高月帶 `data-peak`；PeakMonth `month: 3` 顯示 `copy.months[2]` 與部數；以上皆不使用 `undefined` 字樣（`container.textContent` 不含 `undefined`、`NaN`）。
- [ ] **Step 2–4:** 紅 → 實作 → 綠。
- [ ] **Step 5: Commit** — `feat(recap): 類別、故事年齡、稱號、月份場景`

### Task 9: 場景（三）收藏月數、年度之最、開始與結束、心得，與分派元件

**Files:** Create `client/src/components/recap/scenes/{MonthsActiveScene,TopRatedScene,FirstLastScene,ReflectionScene}.tsx`、`client/src/components/recap/RecapScene.tsx`；Test `client/src/components/recap/__tests__/scenesC.test.tsx`

**Interfaces:**
- 內容規則：MonthsActive：「這一年有 N 個月留下了故事」；TopRated：最高分（顯示成評分星或 `n/10`，沿用 App 既有評分呈現）、幾部、最多 3 張海報（`posterSrc`）；FirstLast：年度第一部與最近一部（標題、海報、`formatArchivedDate(date, locale)`）；Reflection：引文（`text`，已由後端截成 ≤ 40 字）、作品標題、評分；`reflectionIndex` 決定顯示 `data.candidates[index]`（越界時取 0）。
- Produces：`<RecapScene sceneKey recap copy locale aspectRatio animate reflectionIndex? />`——依 `sceneKey` 取 `recap` 對應欄位並渲染對應場景；欄位為 null 時**回傳 null**（不渲染空框）；`closing` 在 2B 實作，這裡先回傳 null。`SceneProps` 與 `SceneKey` 型別由 Task 3 提供。
- Reflection 另提供 `reflectionText(recap: RecapData, index: number): string | null` 純函式供預覽與 2B 共用（取 `candidates[index]?.text`）。

- [ ] **Step 1: 寫失敗測試**：MonthsActive 顯示 N；TopRated 3 張海報上限（傳 5 筆只渲染 3 個 `img`）、無海報不報錯；FirstLast 顯示兩個標題與日期；Reflection `reflectionIndex: 1` 顯示第二則、`reflectionIndex: 99` 退回第一則；`reflectionText` 越界回第一則、`candidates` 為空回 null；`RecapScene` 對 `movies: null` 回傳 null（`container.firstChild === null`）、對每個非 null 場景鍵渲染出 `scene-frame`。
- [ ] **Step 2–4:** 紅 → 實作 → 綠。
- [ ] **Step 5: Commit** — `feat(recap): 剩餘場景與場景分派元件`

### Task 10: 首頁限時卡片（2.5）

**Files:** Create `client/src/components/recap/RecapHomeCard.tsx`；Modify `client/src/app/page.tsx`（在 `<HomeCollectionArea />` 之後加 `<RecapHomeCard />`）；Test `client/src/components/recap/__tests__/RecapHomeCard.test.tsx`

**Interfaces:**
- Consumes：`useRecapYears()`、`recapWindowYear`、`isDismissed`／`dismiss`、`useTranslation`、`useRouter`；`today` 可由 prop `today?: Date` 注入（預設 `new Date()`，供測試）。
- Produces：卡片僅在 `recapWindowYear(today)` 非 null、該年出現在 `years.years`（已達 ≥ 3 部）、且 `!isDismissed(year)` 時渲染；按下卡片 `router.push('/recap?year=<year>')`；右上「關閉」按鈕呼叫 `dismiss(year)` 並立即隱藏；`years` 載入中／失敗不渲染。

- [ ] **Step 1: 寫失敗測試**（mock `useRecapYears`、`useRouter`）：12 月 5 日＋2026 在清單 → 顯示卡片；3 月 1 日＋2025 在清單 → 不顯示；窗口內但年份不在清單 → 不顯示；`dismiss(2026)` 後重新渲染不顯示、改成 2027 年的 11 月又出現；localStorage 拋例外時仍顯示、點關閉不報錯；點卡片導向 `/recap?year=2026`；`useRecapYears` 回 loading 或 error → 不顯示；1 月看去年（今天 2027-01-10）→ 顯示 2026 年卡片。
- [ ] **Step 2–4:** 紅 → 實作 → 綠。
- [ ] **Step 5: Commit** — `feat(recap): 首頁限時 Recap 卡片`

### Task 11: Recap 預覽頁（2.4）與訪客登入提示

**Files:** Create `client/src/app/recap/page.tsx`、`client/src/components/recap/RecapGuestHint.tsx`、`client/src/lib/providerLogin.ts`；Modify `client/src/components/GuestSaveCard.tsx`；Test `client/src/app/recap/__tests__/page.test.tsx`、`client/src/lib/__tests__/providerLogin.test.ts`

**Interfaces:**
- Produces（`providerLogin.ts`）：`loginWithProvider(provider: 'apple' | 'google'): Promise<{cancelled?: boolean; error?: Error}>`——與 `GuestSaveCard.handleLogin`／`app/page.tsx` 的分派相同（iOS 原生 Apple、原生 Google、其餘 `supabase.auth.signInWithOAuth` redirect 到 `/auth/callback`）；`GuestSaveCard` 改呼叫它，行為不變。
- Produces（頁面）：`/recap?year=` 用 `Suspense` 包 `useSearchParams`（比照 `collection/item/page.tsx`）；year 缺漏或非數字 → 導回 `/profile`；狀態：`loading`（骨架）、`not_enough`（鼓勵文案，`notEnough` 含 `needed`，**不責備**）、`forbidden`／`error`（重試按鈕）；`ready`：
  - 頂部返回鈕、標題「{year}」；`recap.is_partial` 時顯示 `partialBadge`。
  - 橫向 `scroll-snap-x` 輪播，每個場景用 `RecapScene`（`animate` 只在該卡片進入視窗時為 true），卡片以 CSS `transform: scale()` 縮放到可視寬度（場景本身維持 400px）；下方圓點指示目前頁。
  - 場景清單來自 `buildScenes(recap, {forShare: false})`；**最後一頁**是「繼續收藏」按鈕（`router.push('/search?focus=1')`），不輸出為圖。
  - 心得場景有「換一句」按鈕：循環 `reflectionIndex`（`candidates.length > 1` 才顯示），索引存在頁面 state 供 2B 使用。
  - 訪客（`user.is_anonymous`）在輪播上方或首頁顯示 `RecapGuestHint`（標題、說明、Google／Apple 登入按鈕，呼叫 `loginWithProvider`；Android 原生隱藏 Apple，與 `GuestSaveCard` 一致）。
  - 預留「分享」按鈕位置但**本計畫不實作**（2B 接上）。
- 預覽頁頁尾保留 `data-testid="recap-footer-slot"` 供 2B 掛分享面板入口（空元素即可）。

- [ ] **Step 1: 寫失敗測試**
  - `providerLogin`：iOS 平台＋apple → 呼叫原生 Apple；原生 google → 原生 Google；網頁 → `signInWithOAuth` 帶 `redirectTo`；取消（`cancelled`）回 `{cancelled: true}`；失敗回 `{error}`。`GuestSaveCard` 既有測試（`AddToFolioModal.success`）仍全過。
  - 頁面（mock `useRecap`、`useAuth`、`useRouter`、`useSearchParams`）：`ready` 時渲染 `buildScenes` 數量的場景＋最後一頁「繼續收藏」，且**沒有**結尾場景；`movies: null` 的資料不出現電影場景；`is_partial` 顯示徽章、否則不顯示；點「繼續收藏」→ `/search?focus=1`；`status: 'not_enough', needed: 2` 顯示鼓勵文案且不含禁用詞；`error` 顯示重試並呼叫 `retry`；`loading` 顯示骨架；year 缺漏 → `router.replace('/profile')`；心得 `candidates` 兩則時「換一句」切換顯示，只有一則時不顯示按鈕；訪客顯示登入提示、正式用戶不顯示。
- [ ] **Step 2–4:** 紅 → 實作 → 綠；跑 `npm test` 全套確認 `GuestSaveCard` 重構無回歸。
- [ ] **Step 5: Commit** — `feat(recap): Recap 預覽頁與訪客登入提示`

### Task 12: Profile 常駐入口與年份選單（2.6）

**Files:** Create `client/src/components/recap/RecapProfileRow.tsx`；Modify `client/src/app/profile/page.tsx`（在 `ProfileSection` 內以現有 `ProfileItem` 樣式加一列，位置放在「統計」附近）；Test `client/src/components/recap/__tests__/RecapProfileRow.test.tsx`

**Interfaces:**
- Consumes：`useRecapYears()`（含 `current`）、`useTranslation`、`useRouter`。
- Produces：`<RecapProfileRow />`——全年顯示。狀態：
  - `years` 載入中或失敗：顯示列（標籤「年度 Recap」），不顯示副標、點擊無反應（失敗不崩潰）。
  - `years.years` 為空：副標＝`profileRowEncourage`（以 `current.count` 算 `n = threshold - current.count`、`year = current.year`），**不可點入**。
  - `years.years` 非空但不含 `current.year`：副標顯示鼓勵文案，**仍可點入**開年份選單（可看往年）。
  - 含 `current.year`：可點入。
  - 點入：只有 1 個年份直接 `router.push('/recap?year=<y>')`；多個年份先開年份選單（底部面板，列出年份與部數，由近到遠），選擇後導向。

- [ ] **Step 1: 寫失敗測試**：7 月、`years` 空、`current.count=1` → 顯示「再收藏 2 部，就能看到你的 2026」、按下不導向；`current.count=0` → N 為 3；`current.count=2` → N 為 1；有 2025 達標但當年 1 部 → 顯示鼓勵文案且可點入、因只有 1 個年份直接導向 `/recap?year=2025`；兩個年份 → 開選單、選 2025 導向 `/recap?year=2025`；載入中／錯誤 → 不崩潰、無導向；英文語系鼓勵文案含「{n}」已被替換（不含 `{n}`）。
- [ ] **Step 2–4:** 紅 → 實作 → 綠。
- [ ] **Step 5: Commit** — `feat(recap): Profile 年度 Recap 入口與年份選單`

### Task 13: 驗證與交接

- [ ] **Step 1:** `cd client && npx next lint && npx tsc --noEmit && npm test`，預期全過；`cd server` 後端全套（階段 1 計畫的指令）全過。
- [ ] **Step 2: `/qa`（gstack）**：起 dev server，用 headless 瀏覽器在 390px 寬檢查 `/recap?year=…`（需有資料的 dev 帳號——Tu 提供登入，或以 `window` 注入假資料的測試頁）：資料多／資料少（只有開場＋總數）／無心得／無書各一種；中英文；首頁卡片與 Profile 入口。截圖存證。
- [ ] **Step 3:** 勾選 `openspec/changes/year-recap/tasks.md` 2.1–2.7；更新 `docs/StorioWiki.md`（新增 `components/recap/`、`lib/recap/`、`/recap` 頁一行說明）。
- [ ] **Step 4: Commit** — `docs: year-recap 階段 2A 完成`。接著進入 [階段 2B](2026-11-11-year-recap-phase2b-share.md)；**文案與稱號請 Tu 審閱後再發版**。
