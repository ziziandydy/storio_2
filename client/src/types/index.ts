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

export interface ItemDetail {
  id?: string;
  title: string;
  media_type: 'movie' | 'book' | 'tv';
  year?: number;
  external_id: string;
  director?: string;
  cast?: string[];
  overview: string;
  poster_path?: string;
  backdrop_path?: string;
  source: string;
  rating?: number;
  notes?: string;
  created_at?: string;
  viewing_number?: number;
}
