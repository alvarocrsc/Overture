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
  likeFilm,
  unlikeFilm,
} from '../controllers/films.controller';
import { verifyAccessToken } from '../middleware/auth';

const router = Router();

// Static routes must appear before /:tmdbId to avoid param collision
router.get('/trending', getTrendingFilms);
router.get('/top-rated', getTopRatedFilms);
router.get('/new-releases', getNewReleases);
router.get('/search', searchFilms);

// Sub-resource routes on /:tmdbId/<resource> must appear before the bare
// /:tmdbId route to avoid the bare param swallowing the request.
router.get('/:tmdbId/trailer', getFilmTrailer);
router.get('/:tmdbId/images', getFilmImages);
router.get('/:tmdbId/credits', getFilmCredits);
router.post('/:tmdbId/like', verifyAccessToken, likeFilm);
router.delete('/:tmdbId/like', verifyAccessToken, unlikeFilm);

router.get('/:tmdbId', getFilmById);

export default router;
