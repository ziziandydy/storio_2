## 1. i18n 翻譯

- [x] 1.1 在 `client/src/i18n/locales.ts` en-US `profile.items` 新增 `commentApp: 'Leave a Review'`
- [x] 1.2 在 `client/src/i18n/locales.ts` zh-TW `profile.items` 新增 `commentApp: '留下評論'`

## 2. Profile 頁面邏輯

- [x] 2.1 在 `client/src/app/profile/page.tsx` 新增 `APP_STORE_URL` 與 `APP_STORE_SCHEME` 常數
- [x] 2.2 新增 `handleRateApp()` handler（`isNativePlatform()` 判斷切換 scheme/URL）
- [x] 2.3 新增 `handleCommentApp()` handler（加上 `?action=write-review` 參數）
- [x] 2.4 為現有「為我們評分」`<ProfileItem>` 加上 `onClick={handleRateApp}`
- [x] 2.5 在「為我們評分」下方新增「留下評論」`<ProfileItem>`，icon 用 `<MessageSquare size={18} />`，`onClick={handleCommentApp}`

## 3. 驗證

- [ ] 3.1 Web 瀏覽器：點擊「Rate on App Store」→ 開啟 `https://apps.apple.com/app/id6761919955`
- [ ] 3.2 Web 瀏覽器：點擊「Leave a Review」→ 開啟 `https://apps.apple.com/app/id6761919955?action=write-review`
- [ ] 3.3 iOS 真機：點擊「為我們評分」→ 跳出 App Store
- [ ] 3.4 iOS 真機：點擊「留下評論」→ App Store 開啟評論輸入框
- [ ] 3.5 `npx tsc --noEmit` 無型別錯誤
