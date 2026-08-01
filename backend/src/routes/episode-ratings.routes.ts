import { Router } from 'express';
import {
  getSeasonSummaries,
  getEpisodeRatingsGrid,
  getSeasonEpisodes,
  logEntireSeason,
  createEpisodeRating,
  updateEpisodeRating,
  deleteEpisodeRating,
} from '../controllers/episode-ratings.controller';
import { verifyAccessToken, optionalAccessToken } from '../middleware/auth';

const router = Router();

// Series-scoped reads. These live under /series/:tmdbId/... but are mounted at
// /api/v1 rather than added to series.routes.ts, keeping the whole episode
// ratings feature in one router. Requests fall through to here because
// series.routes.ts defines no matching path.
//
// optionalAccessToken: readable signed out (app-wide averages), and enriched
// with the caller's own ratings and watch progress when a token is present.
router.get('/series/:tmdbId/seasons', optionalAccessToken, getSeasonSummaries);
router.get('/series/:tmdbId/episode-ratings', optionalAccessToken, getEpisodeRatingsGrid);
router.get('/series/:tmdbId/season/:seasonNumber', optionalAccessToken, getSeasonEpisodes);
router.post('/series/:tmdbId/season/:seasonNumber/log-all', verifyAccessToken, logEntireSeason);

router.post('/episode-ratings', verifyAccessToken, createEpisodeRating);
router.put('/episode-ratings/:id', verifyAccessToken, updateEpisodeRating);
router.delete('/episode-ratings/:id', verifyAccessToken, deleteEpisodeRating);

export default router;
