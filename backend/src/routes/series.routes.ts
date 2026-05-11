import { Router } from 'express';
import {
  getTrendingSeries,
  getNewSeriesReleases,
  searchSeries,
  getSeriesById,
  getSeriesImages,
  getSeriesCredits,
  getSeriesDistribution,
  getSeriesWatchedBy,
  getSeriesWatchlistedBy,
  getSeriesMyLogs,
  getSeriesDisplayPrefs,
  updateSeriesDisplayPrefs,
  likeSeries,
  unlikeSeries,
} from '../controllers/series.controller';
import { verifyAccessToken, optionalAccessToken } from '../middleware/auth';

const router = Router();

// Static routes must appear before /:tmdbId to avoid param collision.
// optionalAccessToken lets these listings honour per-user poster overrides
// when a token is present, while still serving anonymous callers.
router.get('/trending', optionalAccessToken, getTrendingSeries);
router.get('/new-releases', optionalAccessToken, getNewSeriesReleases);
router.get('/search', optionalAccessToken, searchSeries);

// Sub-resource routes on /:tmdbId/<resource> must appear before the bare
// /:tmdbId route to avoid the bare param swallowing the request.
router.get('/:tmdbId/images', getSeriesImages);
router.get('/:tmdbId/credits', getSeriesCredits);
router.get('/:tmdbId/distribution', getSeriesDistribution);
router.get('/:tmdbId/watched-by', optionalAccessToken, getSeriesWatchedBy);
router.get('/:tmdbId/watchlisted-by', optionalAccessToken, getSeriesWatchlistedBy);
router.get('/:tmdbId/my-logs', verifyAccessToken, getSeriesMyLogs);
router.get('/:tmdbId/display-prefs', verifyAccessToken, getSeriesDisplayPrefs);
router.put('/:tmdbId/display-prefs', verifyAccessToken, updateSeriesDisplayPrefs);
router.post('/:tmdbId/like', verifyAccessToken, likeSeries);
router.delete('/:tmdbId/like', verifyAccessToken, unlikeSeries);

router.get('/:tmdbId', optionalAccessToken, getSeriesById);

export default router;
