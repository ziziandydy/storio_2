import type { RecapData } from '../types';

/** 測試用：所有場景都有資料的 Recap；以 overrides 蓋掉個別場景（可設為 null）。 */
export function makeRecap(overrides: Partial<RecapData> = {}): RecapData {
  return {
    year: 2026,
    is_partial: false,
    total_count: 12,
    metadata_pending: 0,
    opening: { year: 2026 },
    total: { count: 12, minutes: 3907, items_with_data: 10, estimated: true, posters: ['/a.jpg', '/b.jpg'] },
    movies: { count: 5, minutes: 600, items_with_data: 5, estimated: false, posters: ['/m1.jpg'] },
    series: { count: 4, minutes: 2000, items_with_data: 3, estimated: true, posters: ['/s1.jpg'], episodes: 80 },
    books: { count: 3, minutes: 1307, items_with_data: 3, estimated: true, posters: ['/bk1.jpg'], pages: 900 },
    genres: {
      top: [
        { name: 'Drama', count: 6 },
        { name: 'Crime', count: 4 },
        { name: 'Comedy', count: 2 },
      ],
      posters: ['/d1.jpg'],
    },
    story_age: { avg_year: 2009, age: 17, favorite_decade: 2000 },
    title: { id: 'joy_maker', zh: '快樂製造機', en: 'The Joy Maker' },
    monthly: { counts: [1, 0, 2, 0, 3, 0, 0, 1, 0, 0, 4, 1] },
    peak_month: { month: 11, count: 4, posters: ['/p1.jpg'] },
    months_active: { count: 6 },
    top_rated: {
      rating: 10,
      count: 2,
      items: [
        { title: 'T1', poster_path: '/t1.jpg' },
        { title: 'T2', poster_path: null },
      ],
    },
    first_last: {
      first: { title: 'First', poster_path: '/f.jpg', date: '2026-01-03' },
      last: { title: 'Last', poster_path: null, date: '2026-11-09' },
    },
    reflection: {
      count: 2,
      candidates: [
        { id: 'r1', title: 'T1', poster_path: '/t1.jpg', rating: 9, text: '很棒' },
        { id: 'r2', title: 'T2', poster_path: null, rating: 0, text: '還行' },
      ],
    },
    closing: {},
    ...overrides,
  };
}

/** 只有永遠存在的場景（開場、總數、結尾）。 */
export function makeMinimalRecap(): RecapData {
  return makeRecap({
    total_count: 3,
    total: { count: 3, minutes: 0, items_with_data: 0, estimated: false, posters: [] },
    movies: null,
    series: null,
    books: null,
    genres: null,
    story_age: null,
    title: null,
    monthly: null,
    peak_month: null,
    months_active: null,
    top_rated: null,
    first_last: null,
    reflection: null,
  });
}
