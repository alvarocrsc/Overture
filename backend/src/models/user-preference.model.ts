export interface UserPreference {
  user_id: number;
  favourite_genre_ids: unknown | null;
  favourite_decade: string | null;
  preferred_content: 'films' | 'series' | 'both';
  onboarding_completed: boolean;
  updated_at: Date;
}
