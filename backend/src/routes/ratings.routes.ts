import { Router } from 'express';
import {
  createRating,
  updateRating,
  deleteRating,
  getRatingsByUser,
  getLoggedMembership,
} from '../controllers/ratings.controller';
import { verifyAccessToken } from '../middleware/auth';

const router = Router();

router.post('/', verifyAccessToken, createRating);
router.get('/me/logged', verifyAccessToken, getLoggedMembership);
router.put('/:id', verifyAccessToken, updateRating);
router.delete('/:id', verifyAccessToken, deleteRating);
router.get('/user/:userId', getRatingsByUser);

export default router;
