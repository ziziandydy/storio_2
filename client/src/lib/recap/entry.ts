/**
 * Recap 入口邏輯：限時窗口與「關閉」狀態。皆為純函式／薄封裝，元件只負責呈現。
 */

/**
 * 首頁限時卡片對應的年份（本地日期，月份由 0 起算）：
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

export function dismiss(year: number): void {
  try {
    localStorage.setItem(dismissKey(year), '1');
  } catch {
    // 寫入失敗就算了：本次工作階段內由元件狀態隱藏
  }
}
