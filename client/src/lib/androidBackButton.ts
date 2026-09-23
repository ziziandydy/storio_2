/**
 * Android 實體/手勢返回鍵處理邏輯。
 * 有瀏覽歷史（例如從首頁進入 Collection 頁）就導航返回，
 * 沒有歷史（在根頁面，例如首頁）才真的退出 App，避免無預警直接退出。
 */
export function handleBackButton(
  canGoBack: boolean,
  historyBack: () => void,
  exitApp: () => void,
): void {
  if (canGoBack) {
    historyBack();
  } else {
    exitApp();
  }
}
