## Why

初次使用 Storio 的用戶面對空白的典藏室時，往往不知道從何開始——不清楚如何搜尋作品、建立 Memory、撰寫心得或生成分享圖。缺乏引導導致用戶流失在第一次開啟後數分鐘內。透過一套簡潔的學習卡 (Feature Guide Cards)，在用戶首次進入時以沉浸式方式展示核心功能，可以大幅提升留存率與功能探索深度。

## What Changes

- 新增 **Onboarding Feature Guide** 流程：初次登入（或清空資料後）自動彈出，以卡片輪播展示 Storio 核心功能
- 每張卡片包含：功能圖示、標題、一句話說明、情境插圖（或動態示意）
- 涵蓋以下核心功能卡片（共 4 張）：
  1. **Storio — collect stories in your folio** — 將你觀看並喜歡的作品加入你的個人故事典藏室
  2. **搜尋與加入 (Explore & Collect)** — 如何搜尋電影、影集、書籍並加入典藏
  3. **評分與心得 (Score & Reflect)** — 如何評分、撰寫心得與 AI 潤飾
  4. **回顧與分享 (Recap & Share)** — 用日曆或典藏視角回顧故事足跡，並分享單一記憶或整月精華
- 用戶可隨時從 Profile 頁面重新觀看引導
- 支援雙語（繁體中文 / English）

## Capabilities

### New Capabilities

- `onboarding-guide`: 首次使用引導流程，包含觸發邏輯、卡片輪播 UI、持久化狀態（已看過則不再自動彈出）
- `feature-guide-cards`: 各功能引導卡片的內容設計與動態示意規格

### Modified Capabilities

- `profile-settings`: Profile 頁面新增「重新觀看引導」入口

## Impact

- **新增元件**: `OnboardingGuideModal.tsx`、`FeatureGuideCard.tsx`
- **狀態持久化**: 使用 `localStorage` 紀錄 `storio_onboarding_seen`，避免重複顯示
- **Profile 頁面**: `client/src/app/profile/page.tsx` 新增觸發按鈕
- **無後端異動**，純前端功能
