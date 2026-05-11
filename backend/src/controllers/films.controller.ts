import type { Request, Response } from 'express';
import * as filmsService from '../services/films.service';
import { AppError } from '../utils/app-error';

/**
 * Parses the :tmdbId route parameter and throws a 400 AppError if it is not a
 * valid integer.
 * @param req - The Express request object.
 * @returns The numeric TMDB ID.
 */
function parseTmdbId(req: Request): number {
  const id = Number(req.params['tmdbId']);
  if (isNaN(id)) {
    throw new AppError('Invalid film ID', 400);
  }
  return id;
}

/** GET /api/v1/films/trending */
export async function getTrendingFilms(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query['page']) || 1);
  const userId = req.user?.userId ?? null;
  const result = await filmsService.getTrendingFilms(page, userId);
  res.status(200).json(result);
}

/** GET /api/v1/films/top-rated */
export async function getTopRatedFilms(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query['page']) || 1);
  const userId = req.user?.userId ?? null;
  const result = await filmsService.getTopRatedFilms(page, userId);
  res.status(200).json(result);
}

/** GET /api/v1/films/new-releases */
export async function getNewReleases(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId ?? null;
  const data = await filmsService.getNewReleases(userId);
  res.status(200).json({ data });
}

/** GET /api/v1/films/search */
export async function searchFilms(req: Request, res: Response): Promise<void> {
  const { q, page: rawPage } = req.query;
  if (!q || typeof q !== 'string' || q.trim() === '') {
    throw new AppError('Query required', 400);
  }
  const page = Math.max(1, Number(rawPage) || 1);
  const userId = req.user?.userId ?? null;
  const result = await filmsService.searchFilms(q.trim(), page, userId);
  res.status(200).json(result);
}

/** GET /api/v1/films/:tmdbId — optionally authenticated for per-user enrichment. */
export async function getFilmById(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const userId = req.user?.userId ?? null;
  const data = await filmsService.getFilmDetail(tmdbId, userId);
  res.status(200).json({ data });
}

/** GET /api/v1/films/:tmdbId/distribution */
export async function getFilmDistribution(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const data = await filmsService.getFilmRatingDistribution(tmdbId);
  res.status(200).json({ data });
}

/** GET /api/v1/films/:tmdbId/watched-by — optionally authenticated to surface friends first. */
export async function getFilmWatchedBy(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const userId = req.user?.userId ?? null;
  const data = await filmsService.getFilmWatchedBy(tmdbId, userId);
  res.status(200).json({ data });
}

/** GET /api/v1/films/:tmdbId/watchlisted-by — optionally authenticated to surface friends first. */
export async function getFilmWatchlistedBy(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const userId = req.user?.userId ?? null;
  const data = await filmsService.getFilmWatchlistedBy(tmdbId, userId);
  res.status(200).json({ data });
}

/** GET /api/v1/films/:tmdbId/my-logs — protected. */
export async function getFilmMyLogs(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  if (!req.user) throw new AppError('Authentication required', 401);
  const data = await filmsService.getFilmMyLogs(tmdbId, req.user.userId);
  res.status(200).json({ data });
}

/** GET /api/v1/films/:tmdbId/display-prefs — protected. */
export async function getFilmDisplayPrefs(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  if (!req.user) throw new AppError('Authentication required', 401);
  const data = await filmsService.getFilmDisplayPrefs(tmdbId, req.user.userId);
  res.status(200).json({ data });
}

/** PUT /api/v1/films/:tmdbId/display-prefs — protected. */
export async function updateFilmDisplayPrefs(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  if (!req.user) throw new AppError('Authentication required', 401);

  const body = req.body as {
    custom_poster_path?: string | null;
    custom_backdrop_path?: string | null;
  };

  const validatePath = (key: string, val: unknown): string | null | undefined => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (typeof val !== 'string' || val.length > 500) {
      throw new AppError(`Invalid ${key}`, 400);
    }
    return val;
  };

  const posterPath = validatePath('custom_poster_path', body.custom_poster_path);
  const backdropPath = validatePath('custom_backdrop_path', body.custom_backdrop_path);

  const data = await filmsService.setFilmDisplayPrefs(
    tmdbId,
    req.user.userId,
    posterPath,
    backdropPath,
  );
  res.status(200).json({ data });
}

/** GET /api/v1/films/:tmdbId/images */
export async function getFilmImages(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const data = await filmsService.getFilmImages(tmdbId);
  res.status(200).json({ data });
}

/** GET /api/v1/films/:tmdbId/credits */
export async function getFilmCredits(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const data = await filmsService.getFilmCredits(tmdbId);
  res.status(200).json({ data });
}

/** GET /api/v1/films/:tmdbId/trailer */
export async function getFilmTrailer(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const data = await filmsService.getFilmTrailer(tmdbId);
  res.status(200).json({ data });
}

/** POST /api/v1/films/:tmdbId/like */
export async function likeFilm(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  if (!req.user) throw new AppError('Authentication required', 401);
  await filmsService.likeFilm(tmdbId, req.user.userId);
  res.status(200).json({ message: 'Film liked' });
}

/** DELETE /api/v1/films/:tmdbId/like */
export async function unlikeFilm(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  if (!req.user) throw new AppError('Authentication required', 401);
  await filmsService.unlikeFilm(tmdbId, req.user.userId);
  res.status(200).json({ message: 'Film unliked' });
}
