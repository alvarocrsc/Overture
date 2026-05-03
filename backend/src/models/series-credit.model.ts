export interface SeriesCredit {
  id: number;
  series_id: number;
  person_tmdb_id: number;
  person_name: string;
  role: 'director' | 'actor' | 'writer';
  character_name: string | null;
  profile_path: string | null;
  popularity: number | null;
  cast_order: number | null;
}
