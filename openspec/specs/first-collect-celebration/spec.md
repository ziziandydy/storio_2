# first-collect-celebration Specification

## Purpose
定義用戶收藏第一部作品時的慶祝畫面、觸覺回饋、訪客登入卡與成功標題在地化。

## Requirements

### Requirement: 第一部收藏成功顯示慶祝
當用戶收藏成功且 POST 回應的 `total_count` 恰為 1 時，`AddToFolioModal` 的成功模式 SHALL 顯示慶祝版：標題「收藏成功」／「Saved」；副文案沿用 `modals.successMessage`；作品海報居中並帶金色光暈，海報右下角出現金色勾勾；整張卡片閃一次金光；彩帶從海報炸開，同時從畫面上方灑落約 3 秒；按鈕沿用「繼續瀏覽」「前往 My Storio」。彩帶色 SHALL 取自 Storio 金系色票。動畫結束後彩帶節點 SHALL 卸載。

#### Scenario: 第一部收藏
- **WHEN** 登入用戶收藏第一部作品並成功
- **THEN** 顯示慶祝版成功視窗並播放動畫，約 3 秒後動畫靜止，勾勾與光暈保留

#### Scenario: 第二部起不慶祝
- **WHEN** 用戶收藏成功且 `total_count` 大於等於 2
- **THEN** 顯示現有簡單成功畫面，不播放慶祝

#### Scenario: 減少動態偏好
- **WHEN** 系統設定為減少動態
- **THEN** 不播放彩帶與閃光，僅顯示靜態光暈與勾勾

#### Scenario: 回應沒有收藏數
- **WHEN** POST 回應不含 `total_count`（例如後端尚未部署）
- **THEN** 顯示現有簡單成功畫面，不顯示慶祝，也不先顯示後切換

### Requirement: 第一部慶祝的觸覺回饋
慶祝開始時，原生 iOS 平台 SHALL 觸發兩次「成功」觸覺回饋，間隔約 120 毫秒。網頁平台 SHALL 不觸發；觸覺失敗 SHALL 不影響畫面。

#### Scenario: iOS 原生
- **WHEN** 在 iOS App 播放慶祝
- **THEN** 連續兩次成功觸覺

#### Scenario: 網頁
- **WHEN** 在網頁播放慶祝
- **THEN** 不呼叫觸覺，畫面照常

### Requirement: 訪客收藏成功顯示登入引導
未登入訪客（`user.is_anonymous` 為真）每次收藏成功後，成功視窗 SHALL 顯示登入引導卡，內容為：標題「登入後，收藏不會消失」／「Log in to keep your stories」；說明「你現在是訪客，最多只能收藏 10 部，換手機或重裝 App 收藏就會消失。登入後永久保存，也不限數量。」；主按鈕「使用 APPLE 繼續」「使用 GOOGLE 繼續」；次要「稍後再說，前往 My Storio」。已登入用戶 SHALL 不顯示此卡。第一部且為訪客時，慶祝動畫結束後（約 3.5 秒）卡片 SHALL 切換為此引導卡。

#### Scenario: 訪客收藏第一部
- **WHEN** 訪客收藏第一部成功
- **THEN** 先播放慶祝，約 3.5 秒後卡片切換為登入引導卡

#### Scenario: 訪客收藏第二部以後
- **WHEN** 訪客收藏成功且非第一部
- **THEN** 直接顯示登入引導卡，不播放動畫

#### Scenario: 已登入用戶
- **WHEN** 已登入用戶收藏成功
- **THEN** 不顯示登入引導卡

### Requirement: 訪客登入引導卡可收起
用戶點擊登入引導卡以外的任何位置（背景遮罩）SHALL 收起視窗並回到原本瀏覽的頁面。點擊「稍後再說，前往 My Storio」SHALL 關閉視窗並導向 `/collection`。登入成功後，剛收藏的作品 SHALL 透過現有 `migrate_guest_data` 機制保留。

#### Scenario: 點卡片外
- **WHEN** 用戶點擊登入引導卡外的遮罩
- **THEN** 視窗收起，停留在原本的頁面

#### Scenario: 稍後再說
- **WHEN** 用戶點擊「稍後再說，前往 My Storio」
- **THEN** 視窗關閉並進入館藏頁

#### Scenario: 登入後保留收藏
- **WHEN** 訪客在此卡完成 Apple 或 Google 登入
- **THEN** 剛收藏的作品出現在登入後的館藏

### Requirement: 慶祝與登入引導卡雙語
本能力新增的所有字串 SHALL 同時提供 zh-TW 與 en，加入 `i18n/locales.ts`，專有名詞依專案術語規範使用 Folio、Stories、Storio。

#### Scenario: 英文介面
- **WHEN** App 語言為 en
- **THEN** 慶祝與登入引導卡顯示英文文案
