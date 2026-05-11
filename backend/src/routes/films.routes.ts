import { Router } from 'express';
import {
  getTrendingFilms,
  getTopRatedFilms,
  getNewReleases,
  searchFilms,
  getFilmById,
  getFilmImages,
  getFilmCredits,
  getFilmTrailer,
  getFilmDistribution,
  getFilmWatchedBy,
  getFilmWatchlistedBy,
  getFilmMyLogs,
  getFilmDisplayPrefs,
  updateFilmDisplayPrefs,
  likeFilm,
  unlikeFilm,
} from '../controllers/films.controller';
import { verifyAccessToken, optionalAccessToken } from '../middleware/auth';

const router = Router();

// Static routes must appear before /:tmdbId to avoid param collision.
// optionalAccessToken lets these listings honour per-user poster overrides
// when a token is present, while still serving anonymous callers.
router.get('/trending', optionalAccessToken, getTrendingFilms);
router.get('/top-rated', optionalAccessToken, getTopRatedFilms);
router.get('/new-releases', optionalAccessToken, getNewReleases);
router.get('/search', optionalAccessToken, searchFilms);

// Sub-resource routes on /:tmdbId/<resource> must appear before the bare
// /:tmdbId route to avoid the bare param swallowing the request.
router.get('/:tmdbId/trailer', getFilmTrailer);
router.get('/:tmdbId/images', getFilmImages);
router.get('/:tmdbId/credits', getFilmCredits);
router.get('/:tmdbId/distribution', getFilmDistribution);
router.get('/:tmdbId/watched-by', optionalAccessToken, getFilmWatchedBy);
router.get('/:tmdbId/watchlisted-by', optionalAccessToken, getFilmWatchlistedBy);
router.get('/:tmdbId/my-logs', verifyAccessToken, getFilmMyLogs);
router.get('/:tmdbId/display-prefs', verifyAccessToken, getFilmDisplayPrefs);
router.put('/:tmdbId/display-prefs', verifyAccessToken, updateFilmDisplayPrefs);
router.post('/:tmdbId/like', verifyAccessToken, likeFilm);
router.delete('/:tmdbId/like', verifyAccessToken, unlikeFilm);

router.get('/:tmdbId', optionalAccessToken, getFilmById);

export default router;
