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
  viewingNumber?: number;
}

export interface StreamingProvider {
  provider_name: string;
  logo_path: string;
  type: 'flatrate' | 'rent' | 'buy';
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
  
  streaming_providers?: StreamingProvider[];
  related_media?: {
    type: 'video' | 'image' | 'link';
    url: string;
    thumbnail?: string;
    title: string;
  }[];
}
