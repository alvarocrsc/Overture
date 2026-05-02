export interface FilmCredit {
  id: number;
  film_id: number;
  person_tmdb_id: number;
  person_name: string;
  role: 'director' | 'actor' | 'writer';
  character_name: string | null;
  cast_order: number | null;
}
