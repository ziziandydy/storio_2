## ADDED Requirements

### Requirement: 首頁頂部安全區域遮罩
首頁 SHALL 在 `top-0` 至 `top-[var(--sa-top)]` 之間渲染一個固定的黑色遮罩層（`z-[100]`），防止捲動內容穿透至動態島可見區域。

#### Scenario: 捲動時內容不穿透動態島
- **WHEN** 使用者在首頁向上捲動
- **THEN** 電影卡片等內容不得出現在動態島區域（`top-0` 至 `top-[var(--sa-top)]`）內

### Requirement: 詳情頁 BACK 按鈕位置
`StoryDetailsView` 的 BACK 按鈕 SHALL 位於動態島下方，`paddingTop` 使用 `calc(var(--sa-top) + 1.5rem)` 計算。

#### Scenario: BACK 按鈕不與動態島重疊
- **WHEN** 使用者開啟任一詳情頁面（電影、影集、書籍）
- **THEN** BACK 按鈕的上緣 MUST 位於動態島下方至少 1.5rem

### Requirement: Toast 通知顯示於動態島下方
Toast 通知 SHALL 顯示於 `top-[calc(var(--sa-top)+0.5rem)]` 位置，不得被動態島遮擋。

#### Scenario: Toast 出現在可點擊區域
- **WHEN** 系統顯示任何類型的 Toast 通知（success / error）
- **THEN** Toast 完整顯示於動態島下方，文字與圖示均可見且不被遮擋

### Requirement: Modal 關閉按鈕位置
所有全螢幕 Modal（`MonthlyRecapModal`、`ShareModal`）的關閉按鈕 SHALL 位於 `top-[calc(var(--sa-top)+0.5rem)]`，不得落在動態島區域內。

#### Scenario: Monthly Recap Modal 關閉按鈕可操作
- **WHEN** 使用者開啟 Monthly Recap Modal
- **THEN** × 關閉按鈕完整顯示於動態島下方並可點擊

#### Scenario: Share Modal 關閉按鈕可操作
- **WHEN** 使用者開啟 Share Modal
- **THEN** × 關閉按鈕完整顯示於動態島下方並可點擊
