# collection-date-model Specification

## Purpose
TBD - created by archiving change archived-date-field. Update Purpose after archive.
## Requirements
### Requirement: 收藏項目日期模型

系統 SHALL 以 `archived_date`（純日期）儲存使用者選定的收藏日，並以 `created_at`（timestamp）儲存記錄建立時間，兩者語意分離。

#### Scenario: archived_date 為純日期無時區

WHEN 使用者於收藏表單選定日期（例如 2026-05-30）
THEN 系統 SHALL 將 `archived_date` 以 `'YYYY-MM-DD'` 純日期字串送至後端
AND 後端 SHALL 存入 collections 表的 `archived_date` (date) 欄位
AND 不經過任何時區轉換（不使用 `toISOString()`）

#### Scenario: created_at 收斂為建立時間

WHEN 建立一筆收藏
THEN `created_at` SHALL 記錄建立當下的 timestamp
AND 用於排序與 viewing_number 計算，不再作為收藏日顯示來源

---

### Requirement: 前端無時區日期處理

系統 SHALL 在前端全程以字串方式處理收藏日期，避免 `new Date(dateString)` 將 date-only 字串當作 UTC 解析造成偏移。

#### Scenario: 顯示收藏日期

WHEN 顯示收藏日期（詳情頁、館藏列表、畫廊、編輯表單）
THEN 系統 SHALL 讀取 `archived_date` 並以本地建構方式格式化（split parse 或 `new Date(y, m-1, d)`）
AND 顯示的日期 SHALL 與使用者選定的日期一致，不因時區減一天

#### Scenario: 月曆視圖歸位

WHEN CalendarView 將收藏項目歸入日期格子
THEN 系統 SHALL 以 `archived_date` 字串比對日期
AND 項目 SHALL 落在使用者選定日期的格子，不偏移

#### Scenario: selector 預設值為本地今天

WHEN 開啟收藏表單且無既有日期
THEN date selector 預設值 SHALL 為本地時區的今天（`new Date()` 的 local Y/M/D），非 UTC 日期

#### Scenario: archived_date 為空時 fallback

WHEN 讀取的項目 `archived_date` 為 null（回填前的過渡期）
THEN 系統 SHALL fallback 使用 `created_at` 的日期部分（`created_at.split('T')[0]`）作為顯示日期

---

### Requirement: 舊資料回填

系統 SHALL 透過 migration 將現有資料的 `archived_date` 由 `created_at` 的日期部分回填，確保升級後既有收藏顯示一致。

#### Scenario: Migration 回填

WHEN 執行 `001_add_archived_date.sql`
THEN collections 表 SHALL 新增 `archived_date date` 欄位
AND 現有所有 `archived_date IS NULL` 的列 SHALL 被設為 `created_at::date`

#### Scenario: 編輯舊資料時補正

WHEN 使用者編輯一筆 `archived_date` 已回填的舊收藏並儲存
THEN 系統 SHALL 以表單當前的 `archived_date` 字串更新該欄位

