# recap-entry Specification

## Purpose
年度 Recap（change: year-recap，歸檔於 2026-11-11）。

## Requirements
### Requirement: 可看年份清單

系統 SHALL 提供 `GET /api/v1/collection/recap/years`，回傳該用戶「該年收藏 ≥ 3 部」的年份與各年部數；此端點 MUST NOT 載入完整 Recap 資料。

#### Scenario: 有兩個年份達標
- **WHEN** 用戶 2025 年有 8 部、2026 年有 2 部
- **THEN** 清單只含 2025（8 部）

### Requirement: 限時入口（首頁頭像外框與 Profile 置頂卡片）

每年 11 月 1 日至隔年 2 月底，且對應年份達門檻時，系統 SHALL 提供兩個限時入口：首頁右上角頭像加金色外框與「Recap」小膠囊；Profile 頁最上方顯示 Recap 卡片（卡片有 X 關閉鈕）。首頁 MUST NOT 放 Recap 卡片。11–12 月對應當年，1–2 月對應去年。兩個入口 MUST 共用同一個判斷與同一個關閉狀態：用戶關閉卡片後 SHALL 依年份記在本機（localStorage），頭像外框與卡片一併消失，同年不再出現，隔年重新出現。2 月底之後 MUST 隱藏。限時期間外框 MUST NOT 自行消失（只有關閉或窗口結束）。localStorage 讀寫失敗時 SHALL 退化為每次顯示，不得報錯，但本次工作階段內關閉仍 SHALL 生效。

關閉當下（同一個工作階段內）SHALL 在 Profile 常駐列上方跳出提示，說明之後可從該列繼續查看；提示 SHALL 在約 6 秒後自動消失或點擊即關。

#### Scenario: 窗口內且達標
- **WHEN** 日期為 12 月 5 日，用戶當年收藏 ≥ 3 部且未關閉
- **THEN** 首頁頭像有金框與 Recap 膠囊，Profile 最上方顯示當年 Recap 卡片，常駐列隱藏

#### Scenario: 窗口外
- **WHEN** 日期為 3 月 1 日
- **THEN** 沒有頭像外框也沒有置頂卡片，即使往年達標

#### Scenario: 關閉後
- **WHEN** 用戶在 Profile 關閉 2026 年卡片
- **THEN** 卡片與首頁頭像外框消失，常駐列出現並跳出提示；同年重新整理後不再出現；2027 年窗口開啟時再次出現

#### Scenario: 未達標
- **WHEN** 日期在窗口內但當年收藏 < 3 部
- **THEN** 沒有頭像外框也沒有置頂卡片

### Requirement: Profile 常駐入口與年份選單

Profile SHALL 全年顯示「年度 Recap」一列，標籤中英文對照（中文介面主標「年度 Recap」、副標「Year in Review」；英文介面相反），僅在限時置頂卡片顯示期間隱藏（避免重複入口）。點入後 SHALL 提供年份選單，列出達標年份；選擇年份即開啟該年 Recap。當年收藏 < 3 部時，該列 SHALL 顯示「再收藏 N 部，就能看到你的 2026」之類的鼓勵文案（N 為還差幾部），並 MUST NOT 使用責備語氣。

#### Scenario: 全年可見
- **WHEN** 日期為 7 月
- **THEN** Profile 仍顯示年度 Recap 一列

#### Scenario: 不足門檻
- **WHEN** 用戶當年收藏 1 部
- **THEN** 該列顯示還差 2 部的鼓勵文案，且不可點入看 Recap

#### Scenario: 切換年份
- **WHEN** 用戶在年份選單選擇 2025
- **THEN** 開啟 2025 年的 Recap

### Requirement: 訪客

匿名（訪客）帳號 SHALL 與正式用戶適用相同的門檻與規則，並 SHALL 在 Recap 中提示登入以保留資料。

#### Scenario: 訪客達標
- **WHEN** 訪客當年收藏 ≥ 3 部
- **THEN** 可開啟並分享 Recap，且看到登入提示
