import { Router } from 'express';
import {
  search,
  getRecentSearches,
  deleteRecentSearch,
  clearRecentSearches,
  recordRecentSearch,
} from '../controllers/search.controller';
import { verifyAccessToken } from '../middleware/auth';

const router = Router();

router.get('/', verifyAccessToken, search);
router.get('/recent', verifyAccessToken, getRecentSearches);
router.post('/recent', verifyAccessToken, recordRecentSearch);
router.delete('/recent/:id', verifyAccessToken, deleteRecentSearch);
router.delete('/recent', verifyAccessToken, clearRecentSearches);

export default router;
