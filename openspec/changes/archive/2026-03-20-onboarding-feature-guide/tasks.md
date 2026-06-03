## 1. 元件建立

- [x] 1.1 建立 `client/src/components/OnboardingGuideModal.tsx`，包含 Modal 外框、關閉按鈕（✕）、localStorage 讀寫邏輯
- [x] 1.2 建立 `client/src/components/FeatureGuideCard.tsx`，接收 icon、title、description props 並渲染單張卡片
- [x] 1.3 在 `OnboardingGuideModal` 中整合 Embla Carousel，實現 4 張卡片橫滑
- [x] 1.4 實作圓點進度指示器（dot indicator），當前卡片以 Storio Gold 高亮

## 2. 卡片內容與 i18n

- [x] 2.1 在 `locales.ts` 新增 4 張卡片的繁中 / 英文標題與說明文字
- [x] 2.2 在 `OnboardingGuideModal` 中根據當前語系讀取對應文字
- [x] 2.3 最後一張卡片的「下一步」按鈕改為「開始使用 / Get Started」CTA

## 3. 觸發邏輯

- [x] 3.1 在首頁 `client/src/app/page.tsx` 的 `useEffect` 中，檢查 `localStorage.getItem('storio_onboarding_seen')`
- [x] 3.2 若無紀錄，延遲 300–500ms 後以 fade-in 顯示 `OnboardingGuideModal`（確保在 Web 動畫與登入流程之後）
- [x] 3.3 完成或略過引導時，以 fade-out 關閉並寫入 `localStorage.setItem('storio_onboarding_seen', 'true')`

## 4. Profile 頁面整合

- [x] 4.1 在 `client/src/app/profile/page.tsx` 的 Settings 區塊新增「重新觀看引導」選項
- [x] 4.2 點擊後顯示 `OnboardingGuideModal`（強制開啟，不管 localStorage 狀態）
- [x] 4.3 從 Profile 關閉引導後不重置 `storio_onboarding_seen`

## 5. 視覺驗收

- [x] 5.1 確認 Modal 在 iPhone 16 Pro 尺寸下正常顯示，無內容截斷
- [x] 5.2 確認卡片滑動動畫流暢，dot indicator 正確切換
- [x] 5.3 確認關閉後首頁不再自動彈出引導
