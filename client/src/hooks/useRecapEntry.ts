import { useEffect, useState } from 'react';
import { useRecapYears } from '@/hooks/useRecap';
import { isDismissed, recapWindowYear, subscribeDismissed } from '@/lib/recap/entry';

/**
 * 限時 Recap 入口是否啟用（首頁頭像外框、Profile 置頂卡片共用同一個判斷）：
 * 在窗口內、對應年份達門檻、且用戶沒有關閉過該年。
 * 同一頁有人關閉時（dismiss）會即時變成 inactive。
 */
export function useRecapEntry(today?: Date): { year: number | null; active: boolean } {
  const { years, loading, error } = useRecapYears();
  const [hiddenYear, setHiddenYear] = useState<number | null>(null);

  useEffect(() => subscribeDismissed(setHiddenYear), []);

  const year = recapWindowYear(today ?? new Date());
  const listed = year != null && !loading && !error && !!years && years.years.some((y) => y.year === year);
  const active = listed && year != null && hiddenYear !== year && !isDismissed(year);
  return { year, active };
}
