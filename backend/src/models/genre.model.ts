export interface Genre {
  id: number;
  name: string;
  tmdb_genre_id: number | null;
}

export interface FilmGenre {
  film_id: number;
  genre_id: number;
}

export interface SeriesGenre {
  series_id: number;
  genre_id: number;
}
