# 分季收藏（TV Seasons）— 設計文件

- **日期**：2026-08-01
- **狀態**：已核准（用戶確認，含視覺化 wireframe 討論）
- **範圍**：後端（schema/API/repository）+ 前端（Grid/詳情頁/AddToFolioModal），Calendar 與 Gallery View 不變
- **對應 Backlog**：`docs/BACKLOG.md` 未來開發事項「分季收藏 (Seasons)」

---

## 背景與問題

影集會持續出新一季（例如《One Piece》目前出到 S3，使用者已收藏並寫過心得；一年後出 S4，使用者看完想記錄）。Storio 現有的「多次觀看記錄」機制（`viewing_number`，每次記錄都是獨立一筆，靠左上角「2ND VIEW」徽章分辨）雖然技術上允許多筆記錄，但：

1. 沒有季別中繼資料，使用者/系統都無法區分這兩筆記錄分別對應哪幾季。
2. 每筆記錄在 Grid 是各自獨立一張卡，同名作品出現兩張卡容易被誤認為「不小心重複收藏」，而非刻意分季記錄。

## 核心決策摘要

| 決策點 | 結論 |
|---|---|
| 資料模型 | 每筆收藏維持獨立 row（保留各自評分/心得），新增 `seasons int[]` 欄位記錄涵蓋哪幾季 |
| TMDB 季數 metadata（年份/集數/評分） | 即時拉取、不落地存 DB，跟現有 `cast`/`genres` 同款模式 |
| Grid View | 同一 `external_id` 的多筆記錄合併成一張「疊層卡片」，卡面顯示組內最新一筆，右上角徽章顯示記錄數 |
| Grid 排序 | 分組後，用組內最新記錄的日期決定整張卡在 Grid 的排序位置 |
| 點擊疊層卡片 | 直接進最新一筆記錄的詳情頁，頂部用橫向捲動 pills 切換到其他筆記錄 |
| 詳情頁的「本劇季數資訊」 | 獨立區塊（TMDB 全季資訊，純展示），跟頂部「我的紀錄」pills 分開，不合併 |
| Calendar View | **不分組**，維持現狀（按日期分組，每筆記錄各自出現在自己的收藏日格子） |
| Gallery（輪播）View | **不分組**，維持現狀（按時間序攤平，每筆記錄各自一張滑卡） |
| 新增記錄的季數勾選 | 彈性複選（可跳著選、可不連續），非強制一筆一季 |
| 季數重疊 | 允許重選，但跳出警告提示（不強制擋） |
| 卡片徽章文字 | 維持「2ND VIEW」等既有文字不變，季數資訊只在詳情頁顯示 |

## 資料模型

- `collections` 表新增欄位：`seasons integer[]`，nullable（既有資料與非 TV 資料維持 null）
- 不新增快取表：TMDB 季數 metadata 跟現有 `genres`/`cast`/`streaming_providers` 一樣，每次打詳情頁即時向 TMDB 拉取，不落地存 DB（個人典藏 App 規模下查詢效能不是問題，避免過度工程）

## 後端 API 變更

### Schema（`server/app/schemas/item.py`）

1. `StoryCreate` 新增 `seasons: Optional[List[int]] = None`
2. `StoryResponse` / `StoryInstance` 新增 `seasons: Optional[List[int]] = None`
3. 新增 `SeasonInfo` model：`season_number: int`、`name: str`、`air_date: Optional[str]`、`episode_count: Optional[int]`、`vote_average: Optional[float]`
4. `ItemDetailResponse` 新增 `seasons: List[SeasonInfo] = []`

### `_fetch_tmdb_details`（`server/app/services/search_service.py:105`）

TMDB `/tv/{id}` 回應本身已內建 `seasons[]`／`number_of_seasons`，不需要多打一次 API。在既有處理 `genres`/`cast_refs` 的同一函式裡，`is_tv=True` 分支新增映射 `data.get("seasons", [])` → `List[SeasonInfo]`。

### `collection_service.py`

- `check_story_status`（`GET /check/{external_id}`）：`instances` 已包含每筆記錄，補上 `seasons` 欄位，讓前端能算出「哪些季已被涵蓋」用於顯示警告，也用於渲染 pills 標籤。後端**不**擋重複季數，只誠實回傳資料，警告邏輯在前端。
- `add_story`：`force_add` 判斷邏輯不變，新增時多存 `seasons` 欄位。

### Repository（`collection_repo.py` + migration）

- `collections` 表加欄位 migration（`seasons integer[]`）
- `_map_to_db` / `_map_from_db` 比照既有欄位處理方式序列化/反序列化 `seasons`

## 前端行為

### Grid View（`client/src/components/views/ListView.tsx`）

**現況**：`ListView.tsx` 目前沒有分組邏輯，後端回傳的每一筆記錄攤平成一張卡（跟 Calendar/Gallery 現況相同）。

**變更**：這是三個 view 裡唯一需要改動分組/排序邏輯的一個：

1. 渲染前先依 `external_id` 分組
2. 組內取 `archived_date`（或其 fallback，見 `dateUtils.getArchivedDate`）最新的一筆作為代表（卡面海報/標題/徽章數字）
3. 整個 Grid 的排序改用「各組代表記錄的日期」比較，而非攤平後的個別記錄日期——這樣即使中間穿插其他作品的收藏記錄，同一部劇的疊層卡片仍會排在正確位置（用組內最新日期決定順序，不受中間插入的其他作品影響）
4. 疊層卡片視覺：主卡片背後露出一張疊影 + 右上角徽章顯示記錄數（如「2」）
5. 點擊疊層卡片 → 直接導向組內最新一筆記錄的詳情頁（`/collection/item?id=...`），不經過中介選單

### 詳情頁（`StoryDetailsView` / `client/src/app/collection/item` 對應頁面）

1. 頂部新增橫向捲動 pills 列（沿用既有 `overflow-x-auto scrollbar-hide` chip 樣式，見 `StoryDetailsView.tsx:159` 的演員/類型 chips），只在該 `external_id` 有 2 筆以上記錄時顯示；每個 pill 代表一筆記錄，標籤規則：
   - 連續季數收斂成範圍：`[1,2,3]` → `S1-S3`
   - 不連續用逗號分開：`[1,2,3,5]` → `S1-S3, S5`
   - `seasons` 為 null（舊資料）：fallback 顯示「第 N 次」（N 為該筆在同組內依時間排序的序號）
   - 尾端固定一個「+ 新一季」pill，點擊觸發新增記錄流程（帶入該作品的 `external_id`，直接跳過搜尋頁）
2. 點選 pill 切換顯示對應那筆記錄的評分/心得（沿用該記錄既有的顯示元件，只是資料來源換成選中的那筆）
3. 「本劇季數資訊」為獨立區塊，內容來自 `ItemDetailResponse.seasons`（TMDB 即時資料，年份/集數/評分），純展示、不含收藏狀態標記，位置在心得區塊下方，跟頂部 pills 完全分開
4. TMDB 季數資料抓取失敗（或該作品非 TV）：此區塊直接不顯示，不擋頁面、不報錯，比照 `streaming_providers`/`reviews` 現有降級處理方式

### `AddToFolioModal.tsx` — 新增記錄流程

1. 當 `media_type === 'tv'` 且使用者觸發「Log as Re-watch」（既有 duplicate-prompt 流程，`AddToFolioModal.tsx:151-159`）或從詳情頁 pills 列的「+ 新一季」進入時，在既有的 rating/心得表單**之前**插入一個季數勾選步驟
2. 勾選清單資料來源：`ItemDetailResponse.seasons`（TMDB 即時拉取）
3. 已被其他筆記錄涵蓋的季數：預設不勾選，仍可手動勾選；勾選時跳出警告文字（如「S1-S3 已經在另一筆記錄中，確定要重複記錄嗎？」），不強制擋下
4. 視覺風格沿用既有 modal 的深色底 + 金色重點色（`bg-accent-gold`/`text-accent-gold`），跟其他步驟（success/prompt state）一致
5. `media_type` 為 `movie`/`book` 時完全不出現此步驟，行為與現況一致

### Calendar View（`CalendarView.tsx`）／Gallery View（`GalleryView.tsx`）

**不需要改動分組/排序邏輯**。兩者都維持現有的「攤平、按日期或時間序」渲染方式：

- Calendar：每筆記錄依 `archived_date` 落在各自的日期格子，同一部劇的兩筆記錄會出現在兩個不同格子，這是刻意保留的行為（Calendar 的意義是時間軸紀錄，合併會讓月度統計/Recap 失真）
- Gallery：依時間序攤平滑卡，同一部劇的兩筆記錄會在滑動過程中分開出現兩次，這是預期行為

兩者若有 `seasons` 資料，沿用現有卡片渲染元件即可（該元件已支援 `seasons` prop 顯示，不需為這兩個 view 額外開發）；使用者若想知道「這兩筆是不是同一部劇的不同季」，是在點進任一筆的詳情頁後，靠頂部 pills 切換器發現關聯，不在 Calendar/Gallery 的卡片層級處理。

## 邊界案例

1. **舊資料（`seasons` 為 null）**：Grid 疊層分組不受影響（照樣用 `external_id` 分組）；詳情頁 pills fallback 顯示「第 N 次」
2. **非連續季數**：顯示規則見上方「詳情頁」章節第 1 點
3. **TMDB 季數抓取失敗**：詳情頁季數資訊區塊直接不顯示
4. **非 TV 媒體類型**：完全不受影響，`seasons` 恆為 null，UI 不出現任何季數相關元素

## 範圍外（Out of Scope）

- 新一季上架的主動通知（例如「你追蹤的 One Piece 出新一季了」）：屬於 `local-notifications` 系統的潛在擴充，本次不做，需要時另開設計
- 獨立的「劇集追蹤/待看清單」功能（尚未收藏、只是想知道有新一季）：本次僅處理「已收藏、新一季看完後怎麼記錄」的情境

## 驗證方式

- 後端：pytest 覆蓋 `StoryCreate.seasons` 序列化、`check_story_status` 回傳 `seasons`、`_fetch_tmdb_details` 對 TV 回應的 `seasons[]` 映射（比照現有 `test_collection_repo.py`/`test_monthly_stats.py` 的 mock 慣例）
- 前端：無正式 CI 覆蓋（Playwright 落後現況，`client/tests/` 未進 CI），比照專案既有作法用 `/qa`（gstack headless browser）跑過：
  1. 同一作品兩筆記錄 → Grid 顯示疊層卡片，徽章數字正確，排序位置正確（穿插其他作品情境）
  2. 點擊疊層卡片 → 進最新一筆詳情頁，pills 正確列出所有記錄並可切換
  3. 新增記錄時的季數勾選 → 重疊季數跳出警告、不強制擋下
  4. Calendar / Gallery 對同一作品的兩筆記錄各自獨立顯示（不分組）
