import type { Request, Response } from 'express';

/** GET /api/v1/films/trending */
export async function getTrendingFilms(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** GET /api/v1/films/new-releases */
export async function getNewReleases(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** GET /api/v1/films/search */
export async function searchFilms(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** GET /api/v1/films/:tmdbId */
export async function getFilmById(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** GET /api/v1/films/:tmdbId/images */
export async function getFilmImages(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** GET /api/v1/films/:tmdbId/credits */
export async function getFilmCredits(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** POST /api/v1/films/:tmdbId/like */
export async function likeFilm(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}

/** DELETE /api/v1/films/:tmdbId/like */
export async function unlikeFilm(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ message: 'not implemented yet' });
}
