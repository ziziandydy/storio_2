import { useEffect, useState } from 'react';

/**
 * 掛載後才為 true。伺服器預先產生的 HTML 與第一次 client render 都是 false，
 * 所以依賴 localStorage（zustand persist 在瀏覽器端同步讀回）的值要等它變 true 才顯示，
 * 否則第一次 client render 的文字會和預先產生的 HTML 不一致（hydration mismatch）。
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
