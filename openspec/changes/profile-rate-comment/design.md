## Context

Profile 頁面的 Community section 目前包含三個項目：Share Storio（可用）、Rate on App Store（死按鈕）、Contact Us（可用）。「為我們評分」缺少 onClick handler，「留下評論」入口完全不存在。

## Goals / Non-Goals

**Goals:**
- 讓「為我們評分」按鈕可點擊，導向 App Store 頁面
- 新增「留下評論」按鈕，直跳 App Store 書面評論輸入框
- 同時支援 iOS native（`itms-apps://` scheme）與 Web（`https://apps.apple.com/`）

**Non-Goals:**
- 不實作 in-app 原生評分對話框（`SKStoreReviewController`）
- 不追蹤使用者是否已評分
- 不修改後端或資料庫

## Decisions

**選擇純 Deeplink 而非 Capacitor Rate App 套件**

考慮方案：
- A. 純 Deeplink（選用）：`itms-apps://` for native，`https://apps.apple.com/` for web
- B. `capacitor-rate-app` plugin：觸發 iOS 原生評分對話框

選用 A 的理由：零新依賴、行為可預期（Apple 的 SKStoreReviewController 每年最多觸發 3 次且不保證顯示）、Rate 和 Comment 兩個按鈕分別指向不同 URL，職責清晰。

**URL 常數集中管理**

在 `profile/page.tsx` component 內定義兩個常數：
```typescript
const APP_STORE_URL = 'https://apps.apple.com/app/id6761919955';
const APP_STORE_SCHEME = 'itms-apps://itunes.apple.com/app/id6761919955';
```

**平台判斷沿用 `isNativePlatform()`**

專案已有 `isNativePlatform()` from `@/lib/appleAuth`（封裝 `Capacitor.isNativePlatform()`），直接沿用，不重複造輪。

## Risks / Trade-offs

- **`itms-apps://` scheme 在 web 瀏覽器中無效** → Mitigation：`isNativePlatform()` 判斷後切換到 `https://` fallback
- **`?action=write-review` 行為視 App Store client 版本而定** → Mitigation：即使 App Store 沒有直跳，也會開啟 App 頁面，使用者仍可手動找到評論入口
- **Android 不支援此功能** → Storio 目前僅發佈 iOS，無需處理 Google Play
