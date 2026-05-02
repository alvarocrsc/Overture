export interface UserPreference {
  id: number;
  user_id: number;
  preferred_content_type: 'films' | 'series' | 'both' | null;
  favourite_genre_ids: string | null;
  created_at: Date;
  updated_at: Date;
}
