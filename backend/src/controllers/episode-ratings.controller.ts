import type { Request, Response } from 'express';
import * as episodeRatingsService from '../services/episode-ratings.service';
import { resolveLocalSeriesId } from '../services/season-cache.service';
import type { RatingSource } from '../services/episode-ratings.service';
import { AppError } from '../utils/app-error';
import {
  createEpisodeRatingSchema,
  updateEpisodeRatingSchema,
} from '../validators/episode-rating.validators';

/** Parses and validates the `:tmdbId` route param. */
function parseTmdbId(req: Request): number {
  const tmdbId = Number(req.params['tmdbId']);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    throw new AppError('Invalid series ID', 400);
  }
  return tmdbId;
}

/** Parses and validates the `:seasonNumber` route param. */
function parseSeasonNumber(req: Request): number {
  const seasonNumber = Number(req.params['seasonNumber']);
  if (!Number.isInteger(seasonNumber) || seasonNumber <= 0) {
    throw new AppError('Invalid season number', 400);
  }
  return seasonNumber;
}

/** Parses and validates the `:id` route param. */
function parseId(req: Request): number {
  const id = Number(req.params['id']);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('Invalid episode rating ID', 400);
  }
  return id;
}

/**
 * Resolves which ratings a read should reflect. Defaults to the caller's own
 * ratings when signed in, and is forced to the app-wide average otherwise —
 * an anonymous caller has no personal ratings to show.
 */
function resolveSource(req: Request): {
  source: RatingSource;
  userId: number | null;
} {
  const userId = req.user?.userId ?? null;
  if (userId === null) return { source: 'app', userId: null };
  return { source: req.query['type'] === 'app' ? 'app' : 'user', userId };
}

/** GET /api/v1/series/:tmdbId/seasons */
export async function getSeasonSummaries(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const { source, userId } = resolveSource(req);
  const localSeriesId = await resolveLocalSeriesId(tmdbId);
  const data = await episodeRatingsService.getSeasonSummaries(
    localSeriesId,
    source,
    userId,
  );
  res.status(200).json({ data });
}

/** GET /api/v1/series/:tmdbId/episode-ratings */
export async function getEpisodeRatingsGrid(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const { source, userId } = resolveSource(req);
  const localSeriesId = await resolveLocalSeriesId(tmdbId);
  const data = await episodeRatingsService.getEpisodeRatingsGrid(
    localSeriesId,
    source,
    userId,
  );
  res.status(200).json({ data });
}

/** GET /api/v1/series/:tmdbId/season/:seasonNumber */
export async function getSeasonEpisodes(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const seasonNumber = parseSeasonNumber(req);
  const { source, userId } = resolveSource(req);
  const localSeriesId = await resolveLocalSeriesId(tmdbId);
  const data = await episodeRatingsService.getSeasonEpisodeList(
    localSeriesId,
    tmdbId,
    seasonNumber,
    source,
    userId,
  );
  res.status(200).json({ data });
}

/** POST /api/v1/series/:tmdbId/season/:seasonNumber/log-all */
export async function logEntireSeason(req: Request, res: Response): Promise<void> {
  const tmdbId = parseTmdbId(req);
  const seasonNumber = parseSeasonNumber(req);
  if (!req.user) throw new AppError('Authentication required', 401);

  const localSeriesId = await resolveLocalSeriesId(tmdbId);
  const data = await episodeRatingsService.logEntireSeason(
    localSeriesId,
    tmdbId,
    seasonNumber,
    req.user.userId,
  );
  res.status(200).json({ data, message: 'Season logged' });
}

/** POST /api/v1/episode-ratings */
export async function createEpisodeRating(req: Request, res: Response): Promise<void> {
  const data = createEpisodeRatingSchema.parse(req.body);
  if (!req.user) throw new AppError('Authentication required', 401);

  const result = await episodeRatingsService.createEpisodeRating(
    req.user.userId,
    data,
  );
  res.status(201).json({ data: result, message: 'Episode logged' });
}

/** PUT /api/v1/episode-ratings/:id */
export async function updateEpisodeRating(req: Request, res: Response): Promise<void> {
  const id = parseId(req);
  const data = updateEpisodeRatingSchema.parse(req.body);
  if (!req.user) throw new AppError('Authentication required', 401);

  const result = await episodeRatingsService.updateEpisodeRating(
    id,
    req.user.userId,
    data,
  );
  res.status(200).json({ data: result, message: 'Episode rating updated' });
}

/** DELETE /api/v1/episode-ratings/:id */
export async function deleteEpisodeRating(req: Request, res: Response): Promise<void> {
  const id = parseId(req);
  if (!req.user) throw new AppError('Authentication required', 401);

  await episodeRatingsService.deleteEpisodeRating(id, req.user.userId);
  res.status(200).json({ message: 'Episode rating deleted' });
}
