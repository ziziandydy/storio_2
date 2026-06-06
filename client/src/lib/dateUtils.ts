/**
 * dateUtils.ts
 *
 * 收藏日期（archived_date）的無時區處理工具。
 * 收藏日是純日期語意（哪天看的），全程以 'YYYY-MM-DD' 字串處理，
 * 避免 `new Date('YYYY-MM-DD')` 將 date-only 字串當 UTC 午夜解析造成偏移。
 */

/** 本地今天的 'YYYY-MM-DD'（非 UTC，避免負時區差一天）。 */
export function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 把 'YYYY-MM-DD' 以本地時區建構 Date（不經 UTC 解析）。 */
export function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * 取得收藏項目的顯示日期字串 'YYYY-MM-DD'。
 * 優先 archived_date；回填前的過渡期 fallback 到 created_at 的日期部分。
 */
export function getArchivedDate(item: { archived_date?: string | null; created_at?: string }): string {
  if (item.archived_date) return item.archived_date;
  if (item.created_at) return item.created_at.split('T')[0];
  return '';
}

/** 格式化收藏日期顯示（依語系），輸入為 'YYYY-MM-DD' 字串。 */
export function formatArchivedDate(str: string, locale: 'zh-TW' | 'en-US' = 'en-US'): string {
  if (!str) return '';
  const d = parseLocalDate(str);
  if (locale === 'zh-TW') {
    return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
