import { Router } from 'express';
import {
  getTrendingFilms,
  getTopRatedFilms,
  getNewReleases,
  searchFilms,
  getFilmById,
  getFilmImages,
  getFilmCredits,
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

router.get('/:tmdbId', getFilmById);
router.get('/:tmdbId/images', getFilmImages);
router.get('/:tmdbId/credits', getFilmCredits);
router.post('/:tmdbId/like', verifyAccessToken, likeFilm);
router.delete('/:tmdbId/like', verifyAccessToken, unlikeFilm);

export default router;
