/** 與後端 `RecapResponse`／`RecapYearsResponse`（server/app/schemas/recap.py）一致；場景為 null 表示該場景不出現。 */

export type RecapAspect = '9:16' | '4:5';
export type RecapLocale = 'zh-TW' | 'en-US';

/** 場景輸出尺寸（px）；預覽以 CSS 縮放，渲染服務以 deviceScaleFactor 2 截圖。 */
export const SCENE_SIZE: Record<RecapAspect, { w: number; h: number }> = {
  '9:16': { w: 400, h: 711 },
  '4:5': { w: 400, h: 500 },
};

export type SceneKey =
  | 'opening' | 'total' | 'movies' | 'series' | 'books' | 'genres' | 'story_age' | 'title'
  | 'monthly' | 'peak_month' | 'months_active' | 'top_rated' | 'first_last' | 'reflection' | 'closing';

export interface TimeSummary {
  count: number;
  minutes: number;
  items_with_data: number;
  estimated: boolean;
  posters: string[];
}
export interface SeriesScene extends TimeSummary { episodes: number }
export interface BooksScene extends TimeSummary { pages: number }
export interface GenreScene { top: { name: string; count: number }[]; posters: string[] }
export interface StoryAgeScene { avg_year: number; age: number; favorite_decade: number }
export interface TitleScene { id: string; zh: string; en: string }
export interface MonthlyScene { counts: number[] }
export interface PeakMonthScene { month: number; count: number; posters: string[] }
export interface MonthsActiveScene { count: number }
export interface RatedItem { title: string | null; poster_path: string | null }
export interface TopRatedScene { rating: number; count: number; items: RatedItem[] }
export interface FirstLastItem { title: string | null; poster_path: string | null; date: string | null }
export interface FirstLastScene { first: FirstLastItem; last: FirstLastItem }
export interface ReflectionCandidate {
  id: string;
  title: string | null;
  poster_path: string | null;
  rating: number;
  text: string;
}
export interface ReflectionScene { count: number; candidates: ReflectionCandidate[] }

export interface RecapData {
  year: number;
  is_partial: boolean;
  total_count: number;
  metadata_pending: number;
  opening: { year: number };
  total: TimeSummary;
  movies: TimeSummary | null;
  series: SeriesScene | null;
  books: BooksScene | null;
  genres: GenreScene | null;
  story_age: StoryAgeScene | null;
  title: TitleScene | null;
  monthly: MonthlyScene | null;
  peak_month: PeakMonthScene | null;
  months_active: MonthsActiveScene | null;
  top_rated: TopRatedScene | null;
  first_last: FirstLastScene | null;
  reflection: ReflectionScene | null;
  closing: Record<string, never>;
}

export interface RecapYears {
  threshold: number;
  years: { year: number; count: number }[];
  /** 伺服器今天所在年份與該年目前部數（不受門檻限制） */
  current: { year: number; count: number };
}
