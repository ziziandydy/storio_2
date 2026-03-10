## Why

使用者回報在開啟 App 時，畫面會先短暫閃爍顯示首頁 (Home Page) 的內容（約 0.5 秒），接著才播放網頁版實作的 Splash Screen 動畫（包含 Logo 縮放與影片）。這在 iOS 或原生體驗中會造成強烈的斷層感（Flickering / Flash of Unstyled Content），破壞了原本設計的沉浸式進入體驗。這主要是因為 React 元件（與 Web Splash Screen）在載入、解析 `useEffect` 以及渲染狀態之前，Next.js 的靜態 HTML 已經先行渲染並被使用者看見了。

## What Changes

我們需要將 Web 端的 `SplashScreen` 與原生 Capacitor 的 `SplashScreen` 機制做到無縫銜接。

1. **修正 Capacitor 設定**：原本 `capacitor.config.ts` 設定 `launchAutoHide: true`，這會讓系統原生 Splash 提早消失，暴露出還在載入中或正在閃爍的網頁端首頁。我們應將其改為 `launchAutoHide: false`，強制原生 Splash 留在畫面上，直到我們的 React Web App 完全載入並準備好播放 Web Splash 動畫時，才透過程式碼呼叫 `NativeSplash.hide()`。
2. **修正首頁的初始渲染狀態**：確保當 `showSplash` 狀態為 true 或尚未初始化完成時，首頁的內容被隱藏或蓋住，以防止 Web App 在準備期間漏出底下的卡片與內容。我們可以在 `page.tsx` 一開始未判定 `hasSeenSplash` 時，強制只渲染黑色背景或直接渲染 Splash。
3. **優化狀態判定 (SSR / SSG 防禦)**：將 `showSplash` 的初始值改為預設 true（或利用 `useLayoutEffect` / Layout 遮罩），確保元件首次 Mount 時預設就是處於 Splash 狀態。

## Capabilities

### Modified Capabilities
- `native-integrations`: 改變 Capacitor 的原生 Splash Screen 行為，關閉自動隱藏，改為由 React 端主動控制。
- `splash-screen`: 變更 Web 端 SplashScreen 元件與首頁 (`page.tsx`) 之間的狀態判定順序與預設渲染行為，解決載入空窗期的閃爍。

## Impact

- `client/capacitor.config.ts`: 更改 `launchAutoHide` 為 `false`。
- `client/src/app/page.tsx`: 調整首頁在初始狀態下的渲染條件與 `useEffect` 時機。
- `client/src/components/SplashScreen.tsx`: 確認 `NativeSplash.hide()` 呼叫的時機正確。