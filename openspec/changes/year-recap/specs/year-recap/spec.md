## ADDED Requirements

### Requirement: Recap API 與年份定義

系統 SHALL 提供 `GET /api/v1/collection/recap?year=YYYY`，回傳該年所有場景所需資料。年份與月份 SHALL 以 `archived_date` 字串判斷，為空時退回 `created_at` 的日期部分，不做時區轉換（沿用 `collection-date-model`）。每個場景 SHALL 是資料物件或 `null`（條件不足），前端只渲染非 null 的場景。

#### Scenario: 以 archived_date 歸年
- **WHEN** 一筆收藏的 `archived_date` 為 `2026-12-31`
- **THEN** 它屬於 2026 年，且不因任何時區而移到 2027 年

#### Scenario: archived_date 為空
- **WHEN** 一筆收藏的 `archived_date` 為 null，`created_at` 為 `2026-03-02T…`
- **THEN** 它以 `2026-03-02` 歸入 2026 年 3 月

### Requirement: 門檻

系統 SHALL 僅在該年收藏數 ≥ 3 部時產生 Recap；不足時 SHALL 回傳 404，並在回應內提供還差幾部（`needed`）。

#### Scenario: 不足門檻
- **WHEN** 用戶 2026 年只收藏 1 部並請求 Recap
- **THEN** 回應 404 且 `needed` 為 2

#### Scenario: 達到門檻
- **WHEN** 用戶 2026 年收藏 3 部
- **THEN** 回應 200，且至少包含開場、總數、結尾三個場景

### Requirement: 15 個場景與出現條件

系統 SHALL 依下表決定場景是否出現，條件不足者回傳 null：開場（永遠）、總數（永遠）、電影（電影 ≥ 1）、影集（影集 ≥ 1）、書（書 ≥ 1）、偏愛類別（≥ 3 部有類別資料）、故事年齡（≥ 5 部有年份）、稱號（≥ 5 部）、每月節奏（≥ 2 個月有收藏）、月最投入（最高月 ≥ 2 部）、收藏月數（≥ 2 個月有收藏）、年度之最（≥ 1 部有評分）、開始與結束（≥ 2 部）、心得（≥ 1 則心得）、結尾（永遠）。

#### Scenario: 沒有書
- **WHEN** 用戶該年沒有收藏任何書
- **THEN** 「書」場景為 null，其他場景不受影響

#### Scenario: 沒有心得
- **WHEN** 用戶該年沒有寫任何心得
- **THEN** 「心得」場景為 null，畫面與分享圖 MUST NOT 顯示任何「你還沒寫心得」之類的提示

### Requirement: 年度之最與心得挑選

「年度之最」SHALL 顯示評分等於用戶該年最高評分的作品數，並顯示最多 3 張海報，平手時取最近收藏的；評分 0 表示未評分，不計入。「心得」SHALL 預設挑評分最高且有心得的那則，沒有評分則取最長一則，引文超過約 40 字 SHALL 截斷；用戶 SHALL 可在預覽時換成自己的其他心得。

#### Scenario: 最高分並列
- **WHEN** 用戶該年有 5 部作品評分都是最高的 10 分
- **THEN** 年度之最顯示 5，並顯示其中最近收藏的 3 張海報

#### Scenario: 換一句心得
- **WHEN** 用戶在預覽的心得場景選擇另一則心得
- **THEN** 該場景與其分享圖都改用被選的那則

### Requirement: 窗口內的內容語意

11–12 月請求當年 Recap SHALL 視為「今年到目前為止」，內容隨收藏變動；1–2 月顯示的去年 Recap 為完整版。畫面 SHALL 在 11–12 月清楚標示尚未結束。

#### Scenario: 11 月的標示
- **WHEN** 用戶在 11 月開啟當年 Recap
- **THEN** 畫面標示這是「到目前為止」，之後收藏會改變內容

### Requirement: 往年權限判斷點

系統 SHALL 讓 Recap API 與年份清單 API 都經過單一函式 `canViewRecapYear(user_id, year)`；目前該函式 SHALL 一律回傳 true。無權限時 Recap API SHALL 回 403。

#### Scenario: 目前全部放行
- **WHEN** 任何用戶請求任何有資料的年份
- **THEN** 權限判斷通過

#### Scenario: 日後限制
- **WHEN** `canViewRecapYear` 對某年回傳 false
- **THEN** Recap API 回應 403，年份清單不含該年的可看標記，無需修改呼叫端

### Requirement: 預覽畫面與語言

Recap 預覽 SHALL 以橫向場景卡片瀏覽，數字有 0 → 實際值的進場動畫（`prefers-reduced-motion` 時直接顯示實際值）。所有文案 SHALL 放入 `i18n/locales.ts` 並提供 zh-TW 與 en；場景背景 SHALL 使用呼應內容的海報（電影只有電影海報、影集只有影集海報、書只有書封）。預覽最後一頁 SHALL 有「繼續收藏」按鈕導向搜尋頁；此頁 MUST NOT 被輸出為分享圖。

#### Scenario: 減少動態
- **WHEN** 系統設定為減少動態
- **THEN** 數字直接顯示實際值，不做計數動畫

#### Scenario: 中英文
- **WHEN** App 語言為英文
- **THEN** 所有場景文案為英文

#### Scenario: 繼續收藏
- **WHEN** 用戶點預覽最後一頁的「繼續收藏」
- **THEN** 導向 `/search?focus=1`
