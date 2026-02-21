export interface Story {
  id: string;
  title: string;
  media_type: 'movie' | 'book' | 'tv';
  subtype?: string;
  year?: number;
  external_id: string;
  poster_path?: string;
  source: string;
  rating: number;
  notes?: string;
  created_at: string;
  viewingNumber?: number;
}
