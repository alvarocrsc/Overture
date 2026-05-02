export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  birth_date: string | null;
  role: 'user' | 'admin';
  profile_backdrop_tmdb_id: number | null;
  created_at: Date;
  updated_at: Date;
}
