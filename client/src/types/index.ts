export interface Story {
  id: string;
  title: string;
  media_type: 'movie' | 'book' | 'tv';
  subtype?: string;
  year?: number;
  external_id: string;
  poster_path?: string;
  backdrop_path?: string;
  source: string;
  rating: number;
  notes?: string;
  created_at: string;
  archived_date?: string | null;
  seasons?: number[] | null;
  viewingNumber?: number;
}

export interface StreamingProvider {
  provider_name: string;
  logo_path: string;
  type: 'flatrate' | 'rent' | 'buy';
}

export interface EntityRef {
  id: number;
  name: string;
}

export interface SeasonInfo {
  season_number: number;
  name: string;
  air_date?: string | null;
  episode_count?: number;
  vote_average?: number;
}

export interface ItemDetail {
  id?: string;
  title: string;
  media_type: 'movie' | 'book' | 'tv';
  year?: number;
  external_id: string;
  director?: string; // Legacy
  directors?: string[];
  author?: string; // Legacy
  authors?: string[];
  cast?: string[];
  overview: string;
  poster_path?: string;
  backdrop_path?: string;
  source: string;
  rating?: number;
  notes?: string;
  created_at?: string;
  viewing_number?: number;
  public_rating?: number;

  // Enhanced Details
  genres?: string[];
  status?: string;
  revenue?: number;
  budget?: number;
  original_language?: string;
  origin_country?: string;
  production_companies?: string[];
  // Book specifics
  isbn?: string;
  subtitle?: string;
  page_count?: number;
  publisher?: string;

  // Person/Studio/Genre 精準搜尋用 refs（與對應字串陣列同順序 index-aligned）
  cast_refs?: EntityRef[];
  director_refs?: EntityRef[];
  genre_refs?: EntityRef[];
  company_refs?: EntityRef[];
  seasons?: SeasonInfo[];

  streaming_providers?: StreamingProvider[];
  related_media?: {
    type: 'video' | 'image' | 'link';
    url: string;
    thumbnail?: string;
    title: string;
  }[];
}
