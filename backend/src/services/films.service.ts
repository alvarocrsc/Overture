import { query, queryMany, execute } from '../config/db';
import * as tmdbService from './tmdb.service';
import { tmdbFetch } from '../config/tmdb';
import { AppError } from '../utils/app-error';
import type { Film } from '../models/film.model';
import type { TmdbMovie, TmdbImage, TmdbVideo, TmdbCreditsResult } from '../types/tmdb.types';

/** A film row projected for search/discovery responses. */
export interface FilmSearchResult {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  /** Backdrop file path. Present on trending/now-playing responses, may be null. */
  backdrop_path?: string | null;
  /** Plot synopsis from TMDB. Present on trending/now-playing responses. */
  overview?: string;
  /** ISO release date string from TMDB. */
  release_date?: string | null;
  /** TMDB vote_average (0–10 scale). */
  tmdb_rating?: number | null;
  /** Director name resolved from TMDB credits. May be null on slim projections. */
  director?: string | null;
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
  /**
   * Full crew list, sorted by department importance and popularity. Each
   * entry preserves the TMDB job string so the UI can group / label rows
   * (e.g. Writer, Editor, Producer, Visual Effects Supervisor…).
   */
  crew: Array<{
    person_tmdb_id: number;
    person_name: string;
    job: string;
    department: string;
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
export async function upsertFilm(film: TmdbMovie): Promise<void> {
  // List endpoints (TmdbMovie) don't include tagline; only detail responses do.
  // Use a runtime check so cached taglines aren't overwritten by NULL when a
  // film flows through trending/search before its detail is hydrated.
  const tagline =
    'tagline' in film && typeof (film as { tagline?: unknown }).tagline === 'string'
      ? ((film as { tagline: string }).tagline || null)
      : null;
  await execute(
    `INSERT INTO films
       (tmdb_id, title, original_title, overview, tagline, poster_path, backdrop_path,
        release_date, runtime_min, original_language, tmdb_rating, tmdb_popularity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title            = VALUES(title),
       original_title   = VALUES(original_title),
       overview         = VALUES(overview),
       tagline          = COALESCE(VALUES(tagline), tagline),
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
      tagline,
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

/**
 * Overlays the authenticated user's saved custom poster / backdrop overrides
 * onto a list of TmdbMovie results, keyed by TMDB id. Mutates and returns a
 * new array — does not mutate the inputs. No-ops when userId is null or the
 * list is empty.
 * @param films - The TMDB movies to enrich.
 * @param userId - Authenticated user ID, or null.
 * @returns A new array of films with poster_path / backdrop_path overridden
 *          where the user has saved a custom selection.
 */
export async function applyFilmDisplayPrefs<T extends TmdbMovie>(
  films: T[],
  userId: number | null,
): Promise<T[]> {
  if (userId === null || films.length === 0) return films;
  const tmdbIds = films.map((f) => f.id);
  const rows = await queryMany<{
    tmdb_id: number;
    custom_poster_path: string | null;
    custom_backdrop_path: string | null;
  }>(
    `SELECT f.tmdb_id, p.custom_poster_path, p.custom_backdrop_path
     FROM user_title_display_prefs p
     JOIN films f ON f.id = p.film_id
     WHERE p.user_id = ? AND f.tmdb_id IN (?)`,
    [userId, tmdbIds],
  );
  if (rows.length === 0) return films;
  const map = new Map(rows.map((r) => [r.tmdb_id, r]));
  return films.map((f) => {
    const override = map.get(f.id);
    if (!override) return f;
    return {
      ...f,
      poster_path: override.custom_poster_path ?? f.poster_path,
      backdrop_path: override.custom_backdrop_path ?? f.backdrop_path,
    };
  });
}

/** Maps a raw TmdbMovie to the slim FilmSearchResult shape. */
function toSearchResult(film: TmdbMovie, director: string | null = null): FilmSearchResult {
  return {
    tmdb_id: film.id,
    title: film.title,
    poster_path: film.poster_path,
    release_date: film.release_date || null,
    director,
  };
}

/**
 * Maps a TmdbMovie to a FilmSearchResult enriched with the fields needed by
 * the Discover trending carousel: backdrop, overview, release_date, rating.
 */
function toTrendingResult(film: TmdbMovie, director: string | null): FilmSearchResult {
  return {
    tmdb_id: film.id,
    title: film.title,
    poster_path: film.poster_path,
    backdrop_path: film.backdrop_path,
    overview: film.overview,
    release_date: film.release_date || null,
    tmdb_rating: film.vote_average ?? null,
    director,
  };
}

/** Looks up the director name for a single film via TMDB credits. */
async function resolveDirector(tmdbId: number): Promise<string | null> {
  try {
    const credits = await tmdbFetch<TmdbCreditsResult>(`/movie/${tmdbId}/credits`);
    return credits.crew.find((c) => c.job === 'Director')?.name ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetches the trending films for the current week, upserts them into the local
 * films cache, and returns a paginated FilmSearchResult response.
 * @param page - The page number to fetch (1-indexed).
 * @returns A PaginatedFilmsResult.
 */
export async function getTrendingFilms(
  page: number,
  userId: number | null = null,
): Promise<PaginatedFilmsResult> {
  const { results, total_pages } = await tmdbService.getTrendingFilms(page);
  for (const film of results) {
    await upsertFilm(film);
  }
  const overridden = await applyFilmDisplayPrefs(results, userId);
  const directors = await Promise.all(overridden.map((f) => resolveDirector(f.id)));
  return {
    data: overridden.map((film, i) => toTrendingResult(film, directors[i] ?? null)),
    page,
    total_pages,
  };
}

/**
 * Fetches the top-rated films, upserts them into the local films cache,
 * and returns a paginated FilmSearchResult response.
 * @param page - The page number to fetch (1-indexed).
 * @returns A PaginatedFilmsResult.
 */
export async function getTopRatedFilms(
  page: number,
  userId: number | null = null,
): Promise<PaginatedFilmsResult> {
  const { results, total_pages } = await tmdbService.getTopRatedFilms(page);
  for (const film of results) {
    await upsertFilm(film);
  }
  const overridden = await applyFilmDisplayPrefs(results, userId);
  const directors = await Promise.all(overridden.map((f) => resolveDirector(f.id)));
  return { data: overridden.map((film, i) => toSearchResult(film, directors[i] ?? null)), page, total_pages };
}

/**
 * Fetches currently playing films, upserts them into the local films cache,
 * and returns the TMDB response directly.
 * @returns An array of TmdbMovie objects.
 */
export async function getNewReleases(userId: number | null = null): Promise<TmdbMovie[]> {
  const films = await tmdbService.getNewReleases();
  for (const film of films) {
    await upsertFilm(film);
  }
  return applyFilmDisplayPrefs(films, userId);
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
  userId: number | null = null,
): Promise<PaginatedFilmsResult> {
  const { results, total_pages } = await tmdbService.searchFilms(searchQuery, page);
  for (const film of results) {
    await upsertFilm(film);
  }
  const overridden = await applyFilmDisplayPrefs(results, userId);
  const directors = await Promise.all(overridden.map((f) => resolveDirector(f.id)));
  return { data: overridden.map((film, i) => toSearchResult(film, directors[i] ?? null)), page, total_pages };
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
    `SELECT id, tmdb_id, title, original_title, overview, tagline, poster_path,
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
    tagline: detail.tagline || null,
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

  // Always fetch fresh from TMDB so the full crew (writers, editors, VFX,
  // sound, production, …) is available — the local film_credits cache only
  // stores directors and actors today and would drop the rest.
  const credits = await tmdbService.getFilmCredits(tmdbId);
  const directorsTmdb = credits.crew.filter((m) => m.job === 'Director');
  const cast = credits.cast;

  if (film) {
    // Refresh the cache of director/actor rows so listings that read this
    // table (carousels, profile) stay up to date.
    await execute(`DELETE FROM film_credits WHERE film_id = ?`, [film.id]);

    for (const director of directorsTmdb) {
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

  // Sort the crew so headline jobs (Director, Writer, Producer, …) bubble
  // up; within a department we order by popularity so the most recognisable
  // collaborator appears first.
  const departmentRank: Record<string, number> = {
    Directing: 0,
    Writing: 1,
    Production: 2,
    Editing: 3,
    Camera: 4,
    Sound: 5,
    Art: 6,
    'Visual Effects': 7,
    'Costume & Make-Up': 8,
    Lighting: 9,
    Crew: 10,
    Actors: 99,
  };
  const sortedCrew = [...credits.crew].sort((a, b) => {
    const ra = departmentRank[a.department] ?? 50;
    const rb = departmentRank[b.department] ?? 50;
    if (ra !== rb) return ra - rb;
    return (b.popularity ?? 0) - (a.popularity ?? 0);
  });

  return {
    directors: directorsTmdb.map((m) => ({
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
    crew: sortedCrew.map((m) => ({
      person_tmdb_id: m.id,
      person_name: m.name,
      job: m.job,
      department: m.department,
      profile_path: m.profile_path,
      popularity: m.popularity,
    })),
  };
}

/**
 * Returns the official YouTube trailer for a film, or null if none exists.
 * Filters TMDB's video list to the first entry with site === 'YouTube',
 * type === 'Trailer', and official === true.
 * @param tmdbId - The TMDB movie ID.
 * @returns A TmdbVideo or null.
 */
export async function getFilmTrailer(tmdbId: number): Promise<TmdbVideo | null> {
  const videos = await tmdbService.getFilmVideos(tmdbId);
  return (
    videos.find(
      (v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official,
    ) ?? null
  );
}

// ─── Detail enrichment ───────────────────────────────────────────────────────

/** Per-user enrichment fields layered on top of the base film cache. */
export interface FilmUserContext {
  is_logged: boolean;
  is_in_watchlist: boolean;
  /** ID of the watchlist row when is_in_watchlist is true, else null. */
  watchlist_id: number | null;
  is_liked: boolean;
  user_rating: number | null;
  user_log_count: number;
}

/** Custom display paths the authenticated user has saved for this title. */
export interface FilmDisplayPrefs {
  custom_poster_path: string | null;
  custom_backdrop_path: string | null;
}

/** Full film detail returned by GET /films/:tmdbId. */
export interface FilmDetailResponse extends FilmWithGenres {
  /** Director name resolved from cached film_credits. May be null when unknown. */
  director: string | null;
  /** Custom poster path saved by the authenticated user. Null when anonymous or unset. */
  custom_poster_path: string | null;
  /** Custom backdrop path saved by the authenticated user. Null when anonymous or unset. */
  custom_backdrop_path: string | null;
  is_logged: boolean;
  is_in_watchlist: boolean;
  /** ID of the watchlist row when is_in_watchlist is true, else null. */
  watchlist_id: number | null;
  is_liked: boolean;
  user_rating: number | null;
  user_log_count: number;
}

/**
 * Loads per-user context (logged/liked/watchlisted/rating) for a film.
 * Returns zeroed defaults when userId is null (anonymous request).
 * @param filmId - Internal films.id.
 * @param userId - Authenticated user ID, or null.
 * @returns A FilmUserContext object.
 */
async function loadFilmUserContext(
  filmId: number,
  userId: number | null,
): Promise<FilmUserContext> {
  if (userId === null) {
    return {
      is_logged: false,
      is_in_watchlist: false,
      watchlist_id: null,
      is_liked: false,
      user_rating: null,
      user_log_count: 0,
    };
  }

  const [ratingAgg] = await query<{
    log_count: number;
    latest_value: number | null;
  }>(
    `SELECT COUNT(*) AS log_count,
            (SELECT value FROM ratings
             WHERE user_id = ? AND film_id = ?
             ORDER BY created_at DESC LIMIT 1) AS latest_value
     FROM ratings
     WHERE user_id = ? AND film_id = ?`,
    [userId, filmId, userId, filmId],
  );

  const [watchlistRow] = await query<{ watchlist_id: number }>(
    `SELECT w.id AS watchlist_id
     FROM watchlist w
     WHERE w.user_id = ? AND w.film_id = ?
     LIMIT 1`,
    [userId, filmId],
  );

  const [likeRow] = await query<{ id: number }>(
    `SELECT id FROM title_likes WHERE user_id = ? AND film_id = ? LIMIT 1`,
    [userId, filmId],
  );

  const logCount = Number(ratingAgg?.log_count ?? 0);
  const latestValue =
    ratingAgg?.latest_value !== null && ratingAgg?.latest_value !== undefined
      ? Number(ratingAgg.latest_value)
      : null;

  return {
    is_logged: logCount > 0,
    is_in_watchlist: Boolean(watchlistRow),
    watchlist_id: watchlistRow?.watchlist_id ?? null,
    is_liked: Boolean(likeRow),
    user_rating: latestValue,
    user_log_count: logCount,
  };
}

/**
 * Loads the authenticated user's saved display prefs for a film.
 * Returns nulls when no prefs have been saved or when userId is null.
 * @param filmId - Internal films.id.
 * @param userId - Authenticated user ID, or null.
 * @returns A FilmDisplayPrefs object.
 */
async function loadFilmDisplayPrefs(
  filmId: number,
  userId: number | null,
): Promise<FilmDisplayPrefs> {
  if (userId === null) {
    return { custom_poster_path: null, custom_backdrop_path: null };
  }
  const [row] = await query<FilmDisplayPrefs>(
    `SELECT custom_poster_path, custom_backdrop_path
     FROM user_title_display_prefs
     WHERE user_id = ? AND film_id = ?
     LIMIT 1`,
    [userId, filmId],
  );
  return {
    custom_poster_path: row?.custom_poster_path ?? null,
    custom_backdrop_path: row?.custom_backdrop_path ?? null,
  };
}

/**
 * Loads the (first) director name for a film from the cached film_credits.
 * @param filmId - Internal films.id.
 * @returns The director name, or null when no director is cached.
 */
async function loadFilmDirector(filmId: number): Promise<string | null> {
  const [row] = await query<{ person_name: string }>(
    `SELECT person_name FROM film_credits
     WHERE film_id = ? AND role = 'director'
     ORDER BY popularity DESC, id ASC LIMIT 1`,
    [filmId],
  );
  return row?.person_name ?? null;
}

/**
 * Returns full film detail enriched with per-user context, display prefs,
 * and the director name. Calls getFilmById internally to ensure the local
 * cache (and film_credits) is hydrated.
 * @param tmdbId - The TMDB movie ID.
 * @param userId - Authenticated user ID, or null for anonymous requests.
 * @returns A FilmDetailResponse.
 */
export async function getFilmDetail(
  tmdbId: number,
  userId: number | null,
): Promise<FilmDetailResponse> {
  const base = await getFilmById(tmdbId);
  const [userCtx, displayPrefs, director] = await Promise.all([
    loadFilmUserContext(base.id, userId),
    loadFilmDisplayPrefs(base.id, userId),
    loadFilmDirector(base.id),
  ]);
  return {
    ...base,
    director,
    custom_poster_path: displayPrefs.custom_poster_path,
    custom_backdrop_path: displayPrefs.custom_backdrop_path,
    ...userCtx,
  };
}

// ─── Rating distribution ─────────────────────────────────────────────────────

/** A single bin in the app-wide rating distribution. */
export interface FilmDistributionBin {
  value: number;
  count: number;
}

/** Response shape for GET /films/:tmdbId/distribution. */
export interface FilmDistributionResponse {
  distribution: FilmDistributionBin[];
  /** App-wide average rating, excluding rewatches. Null when no ratings exist. */
  average: number | null;
}

/**
 * Returns the app-wide rating distribution for a film, plus the average.
 * Excludes rewatches so each user contributes at most one rating per bin.
 * @param tmdbId - The TMDB movie ID.
 * @returns A FilmDistributionResponse with bins and average.
 */
export async function getFilmRatingDistribution(
  tmdbId: number,
): Promise<FilmDistributionResponse> {
  const [film] = await query<{ id: number }>(
    `SELECT id FROM films WHERE tmdb_id = ?`,
    [tmdbId],
  );
  if (!film) {
    return { distribution: [], average: null };
  }

  const [rows, [avgRow]] = await Promise.all([
    query<{ value: number | string; count: number | string }>(
      `SELECT value, COUNT(*) AS count
       FROM ratings
       WHERE film_id = ? AND is_rewatch = 0
       GROUP BY value
       ORDER BY value ASC`,
      [film.id],
    ),
    query<{ avg: number | string | null }>(
      `SELECT AVG(value) AS avg FROM ratings
       WHERE film_id = ? AND is_rewatch = 0`,
      [film.id],
    ),
  ]);

  return {
    distribution: rows.map((r) => ({
      value: Number(r.value),
      count: Number(r.count),
    })),
    average: avgRow?.avg !== null && avgRow?.avg !== undefined
      ? Number(avgRow.avg)
      : null,
  };
}

// ─── Watched by / Want to watch ──────────────────────────────────────────────

/** A single entry in the "watched by" list. */
export interface FilmWatchedByRow {
  user_id: number;
  username: string;
  avatar_url: string | null;
  rating: number | null;
  is_rewatch: boolean;
  has_review: boolean;
  review_id: number | null;
}

/** A single entry in the "want to watch" list. */
export interface FilmWatchlistedByRow {
  user_id: number;
  username: string;
  avatar_url: string | null;
}

const SOCIAL_LIMIT = 20;

/**
 * Returns up to 20 users who have logged this film. When userId is provided,
 * users that the requester follows appear first.
 * @param tmdbId - The TMDB movie ID.
 * @param userId - Authenticated user ID, or null for anonymous requests.
 * @returns An array of FilmWatchedByRow.
 */
export async function getFilmWatchedBy(
  tmdbId: number,
  userId: number | null,
): Promise<FilmWatchedByRow[]> {
  const [film] = await query<{ id: number }>(
    `SELECT id FROM films WHERE tmdb_id = ?`,
    [tmdbId],
  );
  if (!film) return [];

  // is_friend = 1 when the row belongs to a user the requester follows.
  // The latest rating per user wins (ORDER BY created_at DESC, deduped via MAX).
  const rows = await query<{
    user_id: number;
    username: string;
    avatar_url: string | null;
    rating: number | string;
    is_rewatch: number;
    has_review: number;
    review_id: number | null;
    is_friend: number;
  }>(
    `SELECT
       u.id AS user_id,
       u.username,
       u.avatar_url,
       r.value AS rating,
       r.is_rewatch,
       (CASE WHEN rv.id IS NOT NULL THEN 1 ELSE 0 END) AS has_review,
       rv.id AS review_id,
       (CASE WHEN ? IS NOT NULL AND f.follower_id IS NOT NULL THEN 1 ELSE 0 END) AS is_friend
     FROM ratings r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN reviews rv ON rv.rating_id = r.id
     LEFT JOIN follows f ON f.follower_id = ? AND f.following_id = u.id
     WHERE r.film_id = ?
       AND (? IS NULL OR u.id != ?)
     GROUP BY u.id, u.username, u.avatar_url, r.value, r.is_rewatch, r.created_at, rv.id, f.follower_id
     ORDER BY is_friend DESC, r.created_at DESC
     LIMIT ${SOCIAL_LIMIT}`,
    [userId, userId, film.id, userId, userId],
  );

  return rows.map((r) => ({
    user_id: r.user_id,
    username: r.username,
    avatar_url: r.avatar_url,
    rating: Number(r.rating),
    is_rewatch: Boolean(r.is_rewatch),
    has_review: Boolean(r.has_review),
    review_id: r.review_id,
  }));
}

/**
 * Returns up to 20 users who have this film in their watchlist. When userId
 * is provided, users that the requester follows appear first.
 * @param tmdbId - The TMDB movie ID.
 * @param userId - Authenticated user ID, or null for anonymous requests.
 * @returns An array of FilmWatchlistedByRow.
 */
export async function getFilmWatchlistedBy(
  tmdbId: number,
  userId: number | null,
): Promise<FilmWatchlistedByRow[]> {
  const [film] = await query<{ id: number }>(
    `SELECT id FROM films WHERE tmdb_id = ?`,
    [tmdbId],
  );
  if (!film) return [];

  const rows = await query<{
    user_id: number;
    username: string;
    avatar_url: string | null;
    is_friend: number;
  }>(
    `SELECT
       u.id AS user_id,
       u.username,
       u.avatar_url,
       (CASE WHEN ? IS NOT NULL AND f.follower_id IS NOT NULL THEN 1 ELSE 0 END) AS is_friend
     FROM watchlist w
     JOIN users u ON u.id = w.user_id
     LEFT JOIN follows f ON f.follower_id = ? AND f.following_id = u.id
     WHERE w.film_id = ?
       AND (? IS NULL OR u.id != ?)
     ORDER BY is_friend DESC, w.added_at DESC
     LIMIT ${SOCIAL_LIMIT}`,
    [userId, userId, film.id, userId, userId],
  );

  return rows.map((r) => ({
    user_id: r.user_id,
    username: r.username,
    avatar_url: r.avatar_url,
  }));
}

// ─── My logs ─────────────────────────────────────────────────────────────────

/** A single rating row in the authenticated user's log history for a film. */
export interface FilmMyLogRow {
  id: number;
  value: number;
  watched_on: string | null;
  is_rewatch: boolean;
  review_id: number | null;
  created_at: Date;
}

/**
 * Returns all of the authenticated user's ratings for a film, including
 * rewatches, ordered by created_at DESC.
 * @param tmdbId - The TMDB movie ID.
 * @param userId - Authenticated user ID.
 * @returns An array of FilmMyLogRow.
 */
export async function getFilmMyLogs(
  tmdbId: number,
  userId: number,
): Promise<FilmMyLogRow[]> {
  const [film] = await query<{ id: number }>(
    `SELECT id FROM films WHERE tmdb_id = ?`,
    [tmdbId],
  );
  if (!film) return [];

  const rows = await query<{
    id: number;
    value: number | string;
    watched_on: string | null;
    is_rewatch: number;
    review_id: number | null;
    created_at: Date;
  }>(
    `SELECT r.id, r.value, r.watched_on, r.is_rewatch, rv.id AS review_id, r.created_at
     FROM ratings r
     LEFT JOIN reviews rv ON rv.rating_id = r.id
     WHERE r.user_id = ? AND r.film_id = ?
     ORDER BY r.created_at DESC`,
    [userId, film.id],
  );

  return rows.map((r) => ({
    id: r.id,
    value: Number(r.value),
    watched_on: r.watched_on,
    is_rewatch: Boolean(r.is_rewatch),
    review_id: r.review_id,
    created_at: r.created_at,
  }));
}

// ─── Display prefs ───────────────────────────────────────────────────────────

/**
 * Returns the authenticated user's saved display prefs for a film, or null
 * when none have been saved.
 * @param tmdbId - The TMDB movie ID.
 * @param userId - Authenticated user ID.
 * @returns A FilmDisplayPrefs object, or null when no row exists.
 */
export async function getFilmDisplayPrefs(
  tmdbId: number,
  userId: number,
): Promise<FilmDisplayPrefs | null> {
  const [film] = await query<{ id: number }>(
    `SELECT id FROM films WHERE tmdb_id = ?`,
    [tmdbId],
  );
  if (!film) return null;
  const [row] = await query<FilmDisplayPrefs>(
    `SELECT custom_poster_path, custom_backdrop_path
     FROM user_title_display_prefs
     WHERE user_id = ? AND film_id = ? LIMIT 1`,
    [userId, film.id],
  );
  return row
    ? {
        custom_poster_path: row.custom_poster_path ?? null,
        custom_backdrop_path: row.custom_backdrop_path ?? null,
      }
    : null;
}

/**
 * Upserts the authenticated user's display prefs for a film. Either path may
 * be omitted (undefined) to leave the existing value untouched, or set to null
 * to clear it.
 * @param tmdbId - The TMDB movie ID.
 * @param userId - Authenticated user ID.
 * @param posterPath - New custom poster path, null to clear, undefined to leave alone.
 * @param backdropPath - New custom backdrop path, null to clear, undefined to leave alone.
 * @returns The saved FilmDisplayPrefs.
 */
export async function setFilmDisplayPrefs(
  tmdbId: number,
  userId: number,
  posterPath: string | null | undefined,
  backdropPath: string | null | undefined,
): Promise<FilmDisplayPrefs> {
  // getFilmById ensures the film row exists locally before we reference it.
  const base = await getFilmById(tmdbId);
  const filmId = base.id;

  // Read existing row so undefined params preserve current values.
  const [existing] = await query<FilmDisplayPrefs>(
    `SELECT custom_poster_path, custom_backdrop_path
     FROM user_title_display_prefs
     WHERE user_id = ? AND film_id = ? LIMIT 1`,
    [userId, filmId],
  );

  const nextPoster =
    posterPath === undefined
      ? existing?.custom_poster_path ?? null
      : posterPath;
  const nextBackdrop =
    backdropPath === undefined
      ? existing?.custom_backdrop_path ?? null
      : backdropPath;

  await execute(
    `INSERT INTO user_title_display_prefs
       (user_id, film_id, custom_poster_path, custom_backdrop_path)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       custom_poster_path   = VALUES(custom_poster_path),
       custom_backdrop_path = VALUES(custom_backdrop_path)`,
    [userId, filmId, nextPoster, nextBackdrop],
  );

  return {
    custom_poster_path: nextPoster,
    custom_backdrop_path: nextBackdrop,
  };
}

// ─── Likes ───────────────────────────────────────────────────────────────────

/**
 * Hearts a film for the authenticated user. Idempotent — re-liking a film
 * silently succeeds. Throws 404 if the film does not exist (after the local
 * cache hydration handled by getFilmById).
 * @param tmdbId - The TMDB movie ID.
 * @param userId - Authenticated user ID.
 */
export async function likeFilm(tmdbId: number, userId: number): Promise<void> {
  const base = await getFilmById(tmdbId);
  await execute(
    `INSERT IGNORE INTO title_likes (user_id, film_id) VALUES (?, ?)`,
    [userId, base.id],
  );
}

/**
 * Removes a heart on a film for the authenticated user. Idempotent — a
 * missing row is treated as success.
 * @param tmdbId - The TMDB movie ID.
 * @param userId - Authenticated user ID.
 */
export async function unlikeFilm(tmdbId: number, userId: number): Promise<void> {
  const [film] = await query<{ id: number }>(
    `SELECT id FROM films WHERE tmdb_id = ?`,
    [tmdbId],
  );
  if (!film) return;
  await execute(
    `DELETE FROM title_likes WHERE user_id = ? AND film_id = ?`,
    [userId, film.id],
  );
}
