## 1. DB Migration（使用者執行）

- [x] 1.1 建立 `server/migrations/001_add_archived_date.sql`：`ALTER TABLE collections ADD COLUMN archived_date date;` + `UPDATE collections SET archived_date = created_at::date WHERE archived_date IS NULL;`
- [ ] 1.2 **使用者在 Supabase Dashboard SQL Editor 執行** migration（動 production schema，不自動跑）
- [ ] 1.3 確認回填：`SELECT id, created_at, archived_date FROM collections LIMIT 5;` 確認 archived_date 已填

## 2. 後端 Schema 與 Repository

- [x] 2.1 `schemas/item.py`：`StoryCreate` 與 `StoryResponse` 新增 `archived_date: Optional[date] = None`（import `date`）
- [x] 2.2 確認 `create_story`（model_dump）正確帶入 archived_date；date 物件需轉字串序列化（如同 created_at 處理）
- [x] 2.3 確認 `update_story` 允許更新 archived_date（`update_collection_item` 的 allowed_updates 加入 `archived_date`）
- [x] 2.4 `get_user_stories` / monthly 查詢：`select("*")` 自動帶 archived_date，確認回傳

## 3. 前端傳值

- [x] 3.1 `RateAndReflectForm`：selector 預設值改本地今天（`new Date()` local Y/M/D），onSave 傳 `archived_date`
- [x] 3.2 `AddToFolioModal` / `collection/item/page.tsx`：handleSave/handleUpdate 傳 `archived_date`（純字串，不 toISOString）
- [x] 3.3 `details/page.tsx`、`search/page.tsx`、`SectionSlider`：加入收藏時傳 `archived_date` 取代 `created_at: new Date(date).toISOString()`

## 4. 前端顯示與月曆

- [x] 4.1 建 `client/src/lib/dateUtils.ts`：`parseLocalDate(str)`（'YYYY-MM-DD' → local Date）、`formatArchivedDate(str, locale)`、`getArchivedDate(item)`（archived_date ?? created_at.split('T')[0] fallback）
- [x] 4.2 `RateAndReflectForm:151` 顯示改用 dateUtils（不用 `new Date(date)`）
- [x] 4.3 `StoryDetailsView:351`、`GalleryView:100`、`useTranslation.formatDate`、`collection/item` 顯示改讀 archived_date + dateUtils
- [x] 4.4 `CalendarView:50` 歸位改用 archived_date 字串比對（不用 parseISO UTC）

## 5. 驗收測試

- [ ] 5.1 真機/模擬器：選 5/30 → 加入 → 詳情/列表/編輯框皆顯示 5/30（不減一天）
- [ ] 5.2 月曆視圖：項目落在 5/30 格子
- [ ] 5.3 重開 app + 跨時區（改裝置時區）→ 日期不變
- [ ] 5.4 舊資料（回填後）：顯示與 created_at 日期一致
- [ ] 5.5 編輯舊資料改日期 → 存檔 → archived_date 更新、顯示一致
- [ ] 5.6 archived_date null fallback：確認過渡期用 created_at 日期部分
