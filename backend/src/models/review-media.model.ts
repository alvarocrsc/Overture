export interface ReviewMedia {
  id: number;
  review_id: number;
  source: 'tmdb' | 'giphy' | 'tenor';
  source_id: string;
  url: string;
  preview_url: string | null;
  position: number;
}
