/**
 * Recap 入口邏輯：限時窗口與「關閉」狀態。皆為純函式／薄封裝，元件只負責呈現。
 */

/**
 * 限時入口（頭像外框、Profile 置頂卡片）對應的年份（本地日期，月份由 0 起算）：
 * 11、12 月 → 當年；1、2 月 → 去年；其他月份 → null（窗口外）。
 */
export function recapWindowYear(today: Date): number | null {
  const month = today.getMonth();
  if (month >= 10) return today.getFullYear();
  if (month <= 1) return today.getFullYear() - 1;
  return null;
}

export function dismissKey(year: number): string {
  return `storio_recap_dismissed_${year}`;
}

/** localStorage 讀取失敗（隱私模式等）一律視為未關閉：寧可每次顯示。 */
export function isDismissed(year: number): boolean {
  try {
    return localStorage.getItem(dismissKey(year)) === '1';
  } catch {
    return false;
  }
}

const dismissListeners = new Set<(year: number) => void>();

/** 同一頁的 Recap 卡片、頭像外框、Profile 列要同步反應「關閉」。回傳取消訂閱函式。 */
export function subscribeDismissed(listener: (year: number) => void): () => void {
  dismissListeners.add(listener);
  return () => {
    dismissListeners.delete(listener);
  };
}

export function dismiss(year: number): void {
  try {
    localStorage.setItem(dismissKey(year), '1');
  } catch {
    // 寫入失敗就算了：本次工作階段內由訂閱者（元件狀態）隱藏
  }
  dismissListeners.forEach((listener) => listener(year));
}
