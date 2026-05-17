## ADDED Requirements

### Requirement: Rate on App Store

Profile Community section 的「為我們評分」按鈕 SHALL 導向 App Store 的 Storio App 頁面，讓使用者進行星等評分。

#### Scenario: iOS native 點擊評分按鈕

- **WHEN** 使用者在 iOS native app 中點擊「為我們評分」
- **THEN** 系統 SHALL 使用 `itms-apps://itunes.apple.com/app/id6761919955` 導向 App Store

#### Scenario: Web 點擊評分按鈕

- **WHEN** 使用者在 Web 瀏覽器中點擊「Rate on App Store」
- **THEN** 系統 SHALL 使用 `https://apps.apple.com/app/id6761919955` 導向 App Store 頁面

### Requirement: Leave a Review

Profile Community section SHALL 包含「留下評論」按鈕，導向 App Store 書面評論輸入框。

#### Scenario: iOS native 點擊留下評論

- **WHEN** 使用者在 iOS native app 中點擊「留下評論」
- **THEN** 系統 SHALL 使用 `itms-apps://itunes.apple.com/app/id6761919955?action=write-review` 導向 App Store 評論輸入框

#### Scenario: Web 點擊留下評論

- **WHEN** 使用者在 Web 瀏覽器中點擊「Leave a Review」
- **THEN** 系統 SHALL 使用 `https://apps.apple.com/app/id6761919955?action=write-review` 導向 App Store 評論頁面

### Requirement: Community section 按鈕順序

Profile Community section SHALL 按照以下順序排列四個項目：Share Storio、Rate on App Store、Leave a Review、Contact Us。

#### Scenario: 頁面渲染 Community section

- **WHEN** 使用者開啟 Profile 頁面
- **THEN** Community section SHALL 依序顯示：分享 Storio、為我們評分、留下評論、聯絡我們

### Requirement: 多語系支援

「留下評論」按鈕 SHALL 支援繁體中文（留下評論）與英文（Leave a Review）。

#### Scenario: 繁體中文語系

- **WHEN** App 語系設定為繁體中文
- **THEN** 按鈕文字 SHALL 顯示「留下評論」

#### Scenario: 英文語系

- **WHEN** App 語系設定為英文
- **THEN** 按鈕文字 SHALL 顯示「Leave a Review」
