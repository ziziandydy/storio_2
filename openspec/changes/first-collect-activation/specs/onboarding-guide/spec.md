## MODIFIED Requirements

### Requirement: 引導完成後寫入持久化狀態
系統 SHALL 在用戶關閉或完成引導後，將 `storio_onboarding_seen = true` 寫入 `localStorage`。最後一張學習卡的按鈕文案 SHALL 為「開始收藏第一部」（zh-TW）／「Collect my first story」（en），取代原本的「開始使用／Get Started」；點擊後行為不變，並回到首頁。館藏為 0 時，回到首頁後用戶 SHALL 看到首頁引導區。

#### Scenario: 點擊「開始收藏第一部」完成引導
- **WHEN** 用戶在最後一張卡片點擊「開始收藏第一部 / Collect my first story」按鈕
- **THEN** 系統關閉 Modal 並寫入 `localStorage`，回到首頁

#### Scenario: 館藏為 0 時回到首頁
- **WHEN** 館藏為 0 的用戶完成引導回到首頁
- **THEN** 首頁顯示引導區

#### Scenario: 點擊右上角「略過」略過引導
- **WHEN** 用戶點擊 Modal 右上角「略過」文字按鈕
- **THEN** 系統關閉 Modal 並寫入 `localStorage`（視同已看過）
