import { query, execute } from '../config/db';
import * as tmdbService from './tmdb.service';
import { AppError } from '../utils/app-error';
import type { Film } from '../models/film.model';
import type { FilmCredit } from '../models/film-credit.model';
import type { TmdbMovie, TmdbImage } from '../types/tmdb.types';

/** A film row projected for search/discovery responses. */
export interface FilmSearchResult {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
}

/** Paginated response returned by trending and search endpoints. */
export interface PaginatedFilmsResult {
  data: FilmSearchResult[];
  page: number;
  total_pages: number;
}

/** A Film row enriched with its genre list. Genre IDs are TMDB genre IDs. */
export interface FilmWithGenres extends Film {
  genres: Array<{ id: number; name: string }>;
}

/** Categorised image assets returned by getFilmImages. */
export interface FilmImagesResponse {
  /** Backdrops with an English title baked in (iso_639_1 = 'en'). */
  titledBackdrops: TmdbImage[];
  /** Language-neutral clean backdrops (iso_639_1 = null). */
  cleanBackdrops: TmdbImage[];
  posters: TmdbImage[];
  logos: TmdbImage[];
}

/** Credits response normalised to a consistent shape for both DB and TMDB sources. */
export interface FilmCreditsResponse {
  directors: Array<{
    person_tmdb_id: number;
    person_name: string;
    profile_path: string | null;
    popularity: number | null;
  }>;
  cast: Array<{
    person_tmdb_id: number;
    person_name: string;
    character_name: string | null;
    cast_order: number | null;
    profile_path: string | null;
    popularity: number | null;
  }>;
}

/**
 * Upserts a single TmdbMovie into the local films table.
 * Uses COALESCE to preserve an already-cached runtime_min when the incoming
 * value is null (list endpoints don't return runtime).
 * @param film - The TMDB movie object to cache.
 */
async function upsertFilm(film: TmdbMovie): Promise<void> {
  await execute(
    `INSERT INTO films
       (tmdb_id, title, original_title, overview, poster_path, backdrop_path,
        release_date, runtime_min, original_language, tmdb_rating, tmdb_popularity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title            = VALUES(title),
       original_title   = VALUES(original_title),
       overview         = VALUES(overview),
       poster_path      = VALUES(poster_path),
       backdrop_path    = VALUES(backdrop_path),
       release_date     = VALUES(release_date),
       runtime_min      = COALESCE(VALUES(runtime_min), runtime_min),
       original_language = VALUES(original_language),
       tmdb_rating      = VALUES(tmdb_rating),
       tmdb_popularity  = VALUES(tmdb_popularity),
       cached_at        = NOW()`,
    [
      film.id,
      film.title,
      film.original_title ?? null,
      film.overview ?? null,
      film.poster_path ?? null,
      film.backdrop_path ?? null,
      film.release_date || null,
      film.runtime ?? null,
      film.original_language ?? null,
      film.vote_average ?? null,
      film.popularity ?? null,
    ],
  );
}

/**
 * Loads the genres for a locally cached film, returning them with TMDB genre IDs.
 * @param filmId - The local DB film ID.
 * @returns An array of { id (tmdb_genre_id), name } objects.
 */
async function loadGenresForFilm(
  filmId: number,
): Promise<Array<{ id: number; name: string }>> {
  const rows = await query<{ id: number | null; name: string }>(
    `SELECT g.tmdb_genre_id AS id, g.name
     FROM genres g
     JOIN film_genres fg ON fg.genre_id = g.id
     WHERE fg.film_id = ? AND g.tmdb_genre_id IS NOT NULL`,
    [filmId],
  );
  // Non-null assertion is safe: the WHERE clause filters out NULL tmdb_genre_id rows.
  return rows.map((r) => ({ id: r.id!, name: r.name }));
}

/** Maps a raw TmdbMovie to the slim FilmSearchResult shape. */
function toSearchResult(film: TmdbMovie): FilmSearchResult {
  return { tmdb_id: film.id, title: film.title, poster_path: film.poster_path };
}

/**
 * Fetches the trending films for the current week, upserts them into the local
 * films cache, and returns a paginated FilmSearchResult response.
 * @param page - The page number to fetch (1-indexed).
 * @returns A PaginatedFilmsResult.
 */
export async function getTrendingFilms(page: number): Promise<PaginatedFilmsResult> {
  const { results, total_pages } = await tmdbService.getTrendingFilms(page);
  for (const film of results) {
    await upsertFilm(film);
  }
  return { data: results.map(toSearchResult), page, total_pages };
}

/**
 * Fetches the top-rated films, upserts them into the local films cache,
 * and returns a paginated FilmSearchResult response.
 * @param page - The page number to fetch (1-indexed).
 * @returns A PaginatedFilmsResult.
 */
export async function getTopRatedFilms(page: number): Promise<PaginatedFilmsResult> {
  const { results, total_pages } = await tmdbService.getTopRatedFilms(page);
  for (const film of results) {
    await upsertFilm(film);
  }
  return { data: results.map(toSearchResult), page, total_pages };
}

/**
 * Fetches currently playing films, upserts them into the local films cache,
 * and returns the TMDB response directly.
 * @returns An array of TmdbMovie objects.
 */
export async function getNewReleases(): Promise<TmdbMovie[]> {
  const films = await tmdbService.getNewReleases();
  for (const film of films) {
    await upsertFilm(film);
  }
  return films;
}

/**
 * Searches TMDB for films matching the query, upserts results into the local
 * films cache, and returns a paginated FilmSearchResult response.
 * @param searchQuery - The user-provided search term.
 * @param page - The page number to fetch (1-indexed).
 * @returns A PaginatedFilmsResult.
 */
export async function searchFilms(
  searchQuery: string,
  page: number,
): Promise<PaginatedFilmsResult> {
  const { results, total_pages } = await tmdbService.searchFilms(searchQuery, page);
  for (const film of results) {
    await upsertFilm(film);
  }
  return { data: results.map(toSearchResult), page, total_pages };
}

/**
 * Returns full details for a film. Serves from the local cache when fresh
 * (< 7 days old); otherwise fetches from TMDB, upserts the film, genres, and
 * credits into the local DB, then returns the enriched result.
 * @param tmdbId - The TMDB movie ID.
 * @returns A FilmWithGenres object.
 */
export async function getFilmById(tmdbId: number): Promise<FilmWithGenres> {
  const [cached] = await query<Film>(
    `SELECT id, tmdb_id, title, original_title, overview, poster_path,
            backdrop_path, release_date, runtime_min, original_language,
            tmdb_rating, tmdb_popularity, cached_at
     FROM films
     WHERE tmdb_id = ?
       AND cached_at > NOW() - INTERVAL 7 DAY
       AND runtime_min IS NOT NULL
       AND EXISTS (SELECT 1 FROM film_credits WHERE film_id = films.id)`,
    [tmdbId],
  );

  if (cached) {
    const genres = await loadGenresForFilm(cached.id);
    return { ...cached, genres };
  }

  // Stale or missing — fetch full detail + credits from TMDB in parallel.
  const [detail, credits] = await Promise.all([
    tmdbService.getFilmById(tmdbId),
    tmdbService.getFilmCredits(tmdbId),
  ]);

  // Upsert the film row (runtime is known for detail responses).
  await upsertFilm(detail);

  const [inserted] = await query<{ id: number }>(
    `SELECT id FROM films WHERE tmdb_id = ?`,
    [tmdbId],
  );
  if (!inserted) {
    throw new AppError('Film cache write failed unexpectedly', 500);
  }
  const filmId = inserted.id;

  // Upsert genres, then (re-)link film_genres.
  for (const genre of detail.genres) {
    await execute(
      `INSERT INTO genres (name, tmdb_genre_id) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [genre.name, genre.id],
    );
  }

  await execute(`DELETE FROM film_genres WHERE film_id = ?`, [filmId]);

  for (const genre of detail.genres) {
    const [genreRow] = await query<{ id: number }>(
      `SELECT id FROM genres WHERE tmdb_genre_id = ?`,
      [genre.id],
    );
    if (genreRow) {
      await execute(
        `INSERT IGNORE INTO film_genres (film_id, genre_id) VALUES (?, ?)`,
        [filmId, genreRow.id],
      );
    }
  }

  // Cache credits: directors and top-10 cast.
  await execute(`DELETE FROM film_credits WHERE film_id = ?`, [filmId]);

  const directors = credits.crew.filter((m) => m.job === 'Director');
  const cast = credits.cast;

  for (const director of directors) {
    await execute(
      `INSERT INTO film_credits
         (film_id, person_tmdb_id, person_name, role, profile_path, popularity)
       VALUES (?, ?, ?, 'director', ?, ?)`,
      [filmId, director.id, director.name, director.profile_path ?? null, director.popularity ?? null],
    );
  }

  for (const actor of cast) {
    await execute(
      `INSERT INTO film_credits
         (film_id, person_tmdb_id, person_name, role, character_name,
          profile_path, popularity, cast_order)
       VALUES (?, ?, ?, 'actor', ?, ?, ?, ?)`,
      [
        filmId,
        actor.id,
        actor.name,
        actor.character ?? null,
        actor.profile_path ?? null,
        actor.popularity ?? null,
        actor.order ?? null,
      ],
    );
  }

  return {
    id: inserted.id,
    tmdb_id: detail.id,
    title: detail.title,
    original_title: detail.original_title,
    overview: detail.overview,
    poster_path: detail.poster_path,
    backdrop_path: detail.backdrop_path,
    release_date: detail.release_date || null,
    runtime_min: detail.runtime,
    original_language: detail.original_language,
    tmdb_rating: detail.vote_average,
    tmdb_popularity: detail.popularity,
    cached_at: new Date(),
    genres: detail.genres,
  };
}

/**
 * Fetches image assets for a film from TMDB and categorises backdrops by
 * language: titled (iso_639_1 = 'en') and clean (iso_639_1 = null).
 * @param tmdbId - The TMDB movie ID.
 * @returns A FilmImagesResponse with categorised image arrays.
 */
export async function getFilmImages(tmdbId: number): Promise<FilmImagesResponse> {
  const images = await tmdbService.getFilmImages(tmdbId);
  return {
    titledBackdrops: images.backdrops.filter((img) => img.iso_639_1 === 'en'),
    cleanBackdrops: images.backdrops.filter((img) => img.iso_639_1 === null),
    posters: images.posters,
    logos: images.logos,
  };
}

/**
 * Returns credits for a film. Serves from the local film_credits cache when
 * available; otherwise fetches from TMDB, caches directors and top-10 actors,
 * then returns the result.
 * @param tmdbId - The TMDB movie ID.
 * @returns A FilmCreditsResponse with directors and cast arrays.
 */
export async function getFilmCredits(tmdbId: number): Promise<FilmCreditsResponse> {
  const [film] = await query<{ id: number }>(
    `SELECT id FROM films WHERE tmdb_id = ?`,
    [tmdbId],
  );

  if (film) {
    const localCredits = await query<FilmCredit>(
      `SELECT id, film_id, person_tmdb_id, person_name, role, character_name,
              profile_path, popularity, cast_order
       FROM film_credits WHERE film_id = ?`,
      [film.id],
    );

    if (localCredits.length > 0) {
      return {
        directors: localCredits
          .filter((c) => c.role === 'director')
          .map((c) => ({
            person_tmdb_id: c.person_tmdb_id,
            person_name: c.person_name,
            profile_path: c.profile_path,
            popularity: c.popularity,
          })),
        cast: localCredits
          .filter((c) => c.role === 'actor')
          .map((c) => ({
            person_tmdb_id: c.person_tmdb_id,
            person_name: c.person_name,
            character_name: c.character_name,
            cast_order: c.cast_order,
            profile_path: c.profile_path,
            popularity: c.popularity,
          })),
      };
    }
  }

  // No local cache — fetch from TMDB.
  const credits = await tmdbService.getFilmCredits(tmdbId);
  const directors = credits.crew.filter((m) => m.job === 'Director');
  const cast = credits.cast;

  if (film) {
    await execute(`DELETE FROM film_credits WHERE film_id = ?`, [film.id]);

    for (const director of directors) {
      await execute(
        `INSERT INTO film_credits
           (film_id, person_tmdb_id, person_name, role, profile_path, popularity)
         VALUES (?, ?, ?, 'director', ?, ?)`,
        [film.id, director.id, director.name, director.profile_path ?? null, director.popularity ?? null],
      );
    }

    for (const actor of cast) {
      await execute(
        `INSERT INTO film_credits
           (film_id, person_tmdb_id, person_name, role, character_name,
            profile_path, popularity, cast_order)
         VALUES (?, ?, ?, 'actor', ?, ?, ?, ?)`,
        [
          film.id,
          actor.id,
          actor.name,
          actor.character ?? null,
          actor.profile_path ?? null,
          actor.popularity ?? null,
          actor.order ?? null,
        ],
      );
    }
  }

  return {
    directors: directors.map((m) => ({
      person_tmdb_id: m.id,
      person_name: m.name,
      profile_path: m.profile_path,
      popularity: m.popularity,
    })),
    cast: cast.map((m) => ({
      person_tmdb_id: m.id,
      person_name: m.name,
      character_name: m.character,
      cast_order: m.order,
      profile_path: m.profile_path,
      popularity: m.popularity,
    })),
  };
}
