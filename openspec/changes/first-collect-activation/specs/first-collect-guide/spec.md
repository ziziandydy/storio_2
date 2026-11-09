## ADDED Requirements

### Requirement: 收藏總數欄位
`GET /api/v1/collection/stats` 與 `POST /api/v1/collection` 的回應 SHALL 各新增 `total_count`，值為該用戶（stats：目前；POST：儲存成功後）的收藏筆數，含重複收藏的各筆。兩者 SHALL 為向後相容的新增，既有欄位的名稱與值不變。

#### Scenario: 新用戶沒有收藏
- **WHEN** 沒有任何收藏的用戶呼叫 stats
- **THEN** 回應包含 `total_count: 0`，其餘欄位維持原格式

#### Scenario: POST 回應含儲存後總數
- **WHEN** 用戶收藏第一部成功
- **THEN** POST 回應包含 `total_count: 1` 與原有的項目欄位

#### Scenario: 舊版 App 不受影響
- **WHEN** 已上架的舊版 App 讀取 stats 或 POST 回應
- **THEN** 它只讀取原有欄位，行為不變

### Requirement: 館藏為 0 時顯示首頁引導區
當 `total_count` 為 0 時，首頁 SHALL 顯示引導區，且 SHALL 隱藏 `HomeStats` 與「檢視 MY STORIO」按鈕。引導區 SHALL 包含：小標 `FIRST STORY`、標題、一顆含搜尋圖示的金色按鈕、按鈕下方單行提示。標題、按鈕、提示 SHALL 各自單行顯示（zh-TW 與 en）。

文案：
- 標題：「收藏你的第一部作品」／「Collect your first story」
- 按鈕：「搜尋你近期看過的作品」／「Search what you watched lately」
- 提示：「或直接點下方的熱門海報收藏」／「Or tap a trending poster below」

#### Scenario: 館藏為 0 的用戶開啟首頁
- **WHEN** `total_count` 為 0 的用戶看到首頁
- **THEN** 顯示引導區，不顯示趨勢圖與「檢視 MY STORIO」，熱門電影／影集／書籍區塊照常顯示且無副標題

#### Scenario: 已有收藏的用戶
- **WHEN** `total_count` 大於等於 1
- **THEN** 不顯示引導區，首頁維持現有的統計與「檢視 MY STORIO」

#### Scenario: 收藏數載入中或查詢失敗
- **WHEN** `total_count` 尚未取得或請求失敗
- **THEN** 不顯示引導區也不顯示統計區，其餘首頁內容照常顯示；失敗時不重複顯示錯誤給用戶

#### Scenario: 第一部收藏後
- **WHEN** 用戶收藏第一部後回到首頁
- **THEN** 引導區消失，統計與「檢視 MY STORIO」恢復

### Requirement: 引導區搜尋入口為按鈕並進入搜尋頁自動對焦
引導區的搜尋入口 SHALL 為按鈕，不得呈現為輸入框。點擊 SHALL 導向 `/search?focus=1`；搜尋頁在帶有 `focus=1` 時 SHALL 對焦當前搜尋模式的輸入框並彈出鍵盤。不帶此參數的既有入口 SHALL 維持現有行為（不自動對焦）。

#### Scenario: 點擊搜尋按鈕
- **WHEN** 用戶點擊引導區的搜尋按鈕
- **THEN** 導向 `/search?focus=1`，輸入框已取得焦點

#### Scenario: 既有入口不自動對焦
- **WHEN** 用戶從右下角「+」展開並點放大鏡進入搜尋頁
- **THEN** 不帶 `focus` 參數，行為與現有一致

#### Scenario: 不改變搜尋頁其他行為
- **WHEN** 用戶搜尋並點擊結果海報
- **THEN** 仍直接開啟「加入 Storio」視窗，與現有行為一致
