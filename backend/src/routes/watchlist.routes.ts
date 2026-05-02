import { Router } from 'express';
import {
  getWatchlist,
  addToWatchlist,
  deleteFromWatchlist,
} from '../controllers/watchlist.controller';
import { verifyAccessToken } from '../middleware/auth';

const router = Router();

router.get('/', verifyAccessToken, getWatchlist);
router.post('/', verifyAccessToken, addToWatchlist);
router.delete('/:id', verifyAccessToken, deleteFromWatchlist);

export default router;
