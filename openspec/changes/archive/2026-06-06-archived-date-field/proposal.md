## Why

使用者選的「收藏日期」是純日期語意（哪天看的電影/書），但目前以 `created_at` (timestamp) 儲存，且前端用 `new Date('YYYY-MM-DD')` 把 date-only 字串當 UTC 午夜解析。在負時區（如美東）顯示與月曆歸位都減一天（選 5/30 顯示 5/29）。真機已回報此 bug。

時區的修補若停留在「顯示層轉換」仍有 edge case（自動建立時間、跨時區）。最乾淨的解法是讓「收藏日期」成為無時區的純日期欄位。

## What Changes

- **後端 collections 表新增 `archived_date` (date) 欄位**：存使用者選的收藏日，純日期無時區。
- **保留 `created_at` (timestamp)**：語意收斂為「記錄建立時間」，用於排序與稽核。
- **DB migration**：回填現有資料 `archived_date = created_at::date`。
- **前端**：date selector 對應 `archived_date`，傳值為純日期字串 `'YYYY-MM-DD'`（不再經 `toISOString()` 時區轉換）；所有日期顯示與月曆歸位改讀 `archived_date`，全程不引入時區偏移。

## Capabilities

### New Capabilities

- `collection-date-model`: 收藏項目的日期模型——`archived_date`（純日期，使用者收藏日）與 `created_at`（timestamp，建立時間）的分工，及前端的無時區日期處理。

## Impact

- **DB schema 變更**：collections 表新增 `archived_date date` 欄位（需在 Supabase 執行 migration SQL + 回填）。
- **後端**：`schemas/item.py`（StoryCreate/StoryResponse 加 archived_date）、`collection_repo.py`（讀寫 archived_date、排序）、可能 `collection_service.py`。
- **前端**：`RateAndReflectForm`、`AddToFolioModal`、`details/page.tsx`、`search/page.tsx`、`SectionSlider`（傳值）；`StoryDetailsView`、`GalleryView`、`CalendarView`、`useTranslation.formatDate`、`collection/item/page.tsx`（顯示/歸位）。
- **部署順序敏感**：DB 先加欄位+回填 → 後端讀寫 → 前端切換，避免前端讀到空值。詳見 design。
- **無 breaking change**（archived_date nullable + 回填，舊 API 仍可用）。
