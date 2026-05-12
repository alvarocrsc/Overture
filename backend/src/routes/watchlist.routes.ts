import { Router } from 'express';
import {
  getWatchlist,
  getWatchlistMembership,
  addToWatchlist,
  deleteFromWatchlist,
} from '../controllers/watchlist.controller';
import { verifyAccessToken } from '../middleware/auth';

const router = Router();

router.get('/', verifyAccessToken, getWatchlist);
router.get('/membership', verifyAccessToken, getWatchlistMembership);
router.post('/', verifyAccessToken, addToWatchlist);
router.delete('/:id', verifyAccessToken, deleteFromWatchlist);

export default router;
