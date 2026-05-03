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
export async function getTrendingFilms(_req: Request, res: Response): Promise<void> {
  const data = await filmsService.getTrendingFilms();
  res.status(200).json({ data });
}

/** GET /api/v1/films/new-releases */
export async function getNewReleases(_req: Request, res: Response): Promise<void> {
  const data = await filmsService.getNewReleases();
  res.status(200).json({ data });
}

/** GET /api/v1/films/search */
export async function searchFilms(req: Request, res: Response): Promise<void> {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.trim() === '') {
    throw new AppError('Query required', 400);
  }
  const data = await filmsService.searchFilms(q.trim());
  res.status(200).json({ data });
}

/** GET /api/v1/films/:tmdbId */
export async function getFilmById(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const data = await filmsService.getFilmById(tmdbId);
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

/** POST /api/v1/films/:tmdbId/like */
export async function likeFilm(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** DELETE /api/v1/films/:tmdbId/like */
export async function unlikeFilm(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}
