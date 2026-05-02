export interface Genre {
  id: number;
  tmdb_id: number;
  name: string;
}

export interface FilmGenre {
  film_id: number;
  genre_id: number;
}

export interface SeriesGenre {
  series_id: number;
  genre_id: number;
}
