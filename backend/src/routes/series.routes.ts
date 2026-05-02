import { Router } from 'express';
import {
  getTrendingSeries,
  getNewSeriesReleases,
  searchSeries,
  getSeriesById,
  getSeriesImages,
  getSeriesCredits,
  likeSeries,
  unlikeSeries,
} from '../controllers/series.controller';
import { verifyAccessToken } from '../middleware/auth';

const router = Router();

// Static routes must appear before /:tmdbId to avoid param collision
router.get('/trending', getTrendingSeries);
router.get('/new-releases', getNewSeriesReleases);
router.get('/search', searchSeries);

router.get('/:tmdbId', getSeriesById);
router.get('/:tmdbId/images', getSeriesImages);
router.get('/:tmdbId/credits', getSeriesCredits);
router.post('/:tmdbId/like', verifyAccessToken, likeSeries);
router.delete('/:tmdbId/like', verifyAccessToken, unlikeSeries);

export default router;
