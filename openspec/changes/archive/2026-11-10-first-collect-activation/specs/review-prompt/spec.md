## ADDED Requirements

### Requirement: 兩種情境觸發系統評價視窗
已登入用戶（`user.is_anonymous` 為假）在 iOS 原生 App 中收藏成功時，符合以下任一情境 SHALL 呼叫 iOS 系統評價視窗：
1. 帳號建立滿 30 天（以 `user.created_at` 計；訪客登入會建立新帳號，因此是登入滿 30 天）。
2. POST 回應的 `total_count` 大於等於 2。

#### Scenario: 帳號滿 30 天
- **WHEN** 已登入、帳號滿 30 天的用戶收藏成功，且 90 天內未呼叫過
- **THEN** 呼叫系統評價視窗

#### Scenario: 累計收藏 2 部以上
- **WHEN** 已登入、`total_count` 為 2 的用戶收藏成功，且 90 天內未呼叫過
- **THEN** 呼叫系統評價視窗

#### Scenario: 兩種情境皆不成立
- **WHEN** 已登入、帳號未滿 30 天且 `total_count` 為 1 的用戶收藏成功
- **THEN** 不呼叫系統評價視窗

#### Scenario: 訪客不呼叫
- **WHEN** 未登入訪客收藏成功
- **THEN** 不呼叫系統評價視窗

### Requirement: 呼叫時機與節流
呼叫 SHALL 在成功視窗關閉後約 1.5 秒進行，排程 SHALL 不受 modal 卸載影響（用戶點「前往 My Storio」導向其他頁面後仍會執行），且當次若播放了慶祝則不呼叫。系統 SHALL 在本機記錄上次呼叫時間，90 天內不重複呼叫。呼叫失敗或外掛不可用時 SHALL 靜默略過，不影響用戶流程。評價視窗的文字與按鈕由 Apple 決定，本系統 SHALL 不自製評價或評論的邀請畫面，也不在任何文案要求特定星等。

#### Scenario: 關閉成功視窗後
- **WHEN** 用戶關閉成功視窗且條件成立
- **THEN** 約 1.5 秒後呼叫系統評價視窗

#### Scenario: 當次有慶祝
- **WHEN** 當次收藏播放了第一部慶祝
- **THEN** 不呼叫系統評價視窗

#### Scenario: 90 天內已呼叫
- **WHEN** 本機記錄顯示 60 天前呼叫過
- **THEN** 不再呼叫

#### Scenario: 關閉視窗後立即換頁
- **WHEN** 用戶點「前往 My Storio」導向館藏頁，條件成立
- **THEN** 約 1.5 秒後仍呼叫系統評價視窗

#### Scenario: 外掛失敗
- **WHEN** 系統評價外掛呼叫拋出錯誤
- **THEN** 錯誤被吞掉，成功視窗的關閉與導覽照常

### Requirement: 保留 Profile 既有評分與評論入口
Profile 的「為我們評分」與「留下評論」按鈕 SHALL 維持現有行為，不受本能力影響。

#### Scenario: 用戶主動前往評論
- **WHEN** 用戶在 Profile 點擊「留下評論」
- **THEN** 仍導向 App Store 書面評論頁，與 `app-store-rating` 規格一致
