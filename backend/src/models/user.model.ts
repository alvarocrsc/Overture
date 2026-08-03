export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  birth_date: string | null;
  role: 'user' | 'admin';
  accent_color: string;
  profile_backdrop_tmdb_id: number | null;
  /**
   * Which table `profile_backdrop_tmdb_id` points at. TMDB numbers films and
   * series independently, so the id alone does not identify a title.
   */
  profile_backdrop_media_type: 'film' | 'series' | null;
  home_backdrop_tmdb_id: number | null;
  created_at: Date;
  updated_at: Date;
}
