## Context

`created_at` (timestamp) 目前同時承擔兩個語意：建立時間 + 使用者收藏日。前端用 `new Date('YYYY-MM-DD').toISOString()` 存收藏日，把純日期當 UTC 午夜，負時區顯示/月曆歸位減一天。

collections 表現況無既有 migration 目錄（Supabase 管理）。後端 `create_story` 用 `model_dump()` 寫入、`select("*")` 讀取，加欄位後可自動帶入。

## Goals / Non-Goals

**Goals:**
- 收藏日期成為無時區的純日期欄位 `archived_date`
- 跨時區一致：選 5/30 → 存 5/30 → 顯示 5/30 → 月曆落 5/30
- 舊資料一次回填，無殘留時區偏差
- `created_at` 語意收斂為建立時間

**Non-Goals:**
- 不改 `created_at` 的既有用途（排序、稽核、viewing_number 計算）
- 不做即時跨裝置時區協商（純日期本身與時區無關）

## Decisions

### 1. 拆欄位：archived_date (date) + created_at (timestamp)

**選擇**：collections 表新增 `archived_date date`。使用者收藏日存此欄位（純日期，PostgreSQL date 型別無時區）；`created_at` 保留為建立時間。

**理由**：date 型別在 DB 層即無時區概念，存什麼讀什麼，根除轉換偏差。語意清晰分離（收藏日 vs 建立時間）。對比「顯示層 UTC 轉換」方案，此方案無 edge case（自動建立、跨時區皆正確）。

**替代方案捨棄**：(a) 存「當地中午 timestamp」— 舊資料需 migration 才一致、跨裝置時區仍有理論偏差；(b) 純顯示層用 UTC — 自動建立時間的資料仍偏。

### 2. 前端日期全程字串化，不經 Date 時區轉換

**選擇**：
- 傳值：date selector 的 `'YYYY-MM-DD'` 字串直接送後端 `archived_date`，**不再** `new Date(date).toISOString()`。
- 顯示：用 `archived_date` 字串自行格式化（split parse 或 `new Date(y, m-1, d)` local 建構），不用 `new Date(dateString)`（會被當 UTC）。
- 月曆歸位：CalendarView 用 `archived_date` 字串比對日期格子，不用 `parseISO`（UTC）。
- selector 預設值：`new Date()` 的 **local** Y/M/D（非 `toISOString()` 的 UTC 日期）。

**理由**：純日期不該經過時區感知的 Date 解析。字串化處理徹底避免偏移。

### 3. Migration 與部署順序（順序敏感）

避免「前端讀 archived_date 但欄位還沒回填」導致空值，部署順序：

```
1. DB migration（Supabase SQL，使用者執行）：
   ALTER TABLE collections ADD COLUMN archived_date date;
   UPDATE collections SET archived_date = created_at::date WHERE archived_date IS NULL;
2. 後端：寫入時填 archived_date，讀取回傳 archived_date（向後相容：欄位可為 null）
3. 前端：傳/讀 archived_date（fallback 到 created_at 日期部分，過渡期保險）
4. （可選後續）archived_date 設 NOT NULL DEFAULT
```

**migration 執行方式**：無既有 migration 工具，建 `server/migrations/001_add_archived_date.sql` 記錄 SQL，**由使用者在 Supabase Dashboard SQL Editor 執行**（動 production schema，不自動跑）。

**前端 fallback**：過渡期 `archived_date ?? created_at.split('T')[0]`，確保回填前/欄位 null 時仍有日期可顯示。

## Risks / Trade-offs

| 風險 | 緩解 |
|------|------|
| 部署順序錯（前端先上、欄位未回填）→ 日期空白 | 前端 fallback 到 created_at 日期部分；且 DB migration 為第一步 |
| migration 動 production 資料 | SQL 冪等（`WHERE archived_date IS NULL`），先在 Supabase 備份/確認；資料量小 |
| created_at 與 archived_date 不一致（手動改過日期的舊資料）| 回填用 created_at::date，與原顯示邏輯一致；可接受 |
| date 型別序列化（Pydantic date ↔ JSON）| Pydantic 自動處理 date → ISO 'YYYY-MM-DD' 字串 |

## Migration Plan

1. 建 `server/migrations/001_add_archived_date.sql`，使用者在 Supabase 執行
2. 後端 schema/repo 加 archived_date
3. 前端傳值/顯示/月曆切換 archived_date（含 fallback）
4. 真機驗證：選 30 → 顯示 30 → 月曆落 30；舊資料回填後一致

## Open Questions

- 是否後續把 `archived_date` 設 NOT NULL：回填穩定後可加，本次先 nullable + fallback。
