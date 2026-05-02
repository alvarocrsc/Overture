import { Router } from 'express';
import {
  getMe,
  updateMe,
  getUserById,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getMyFavorites,
  updateMyFavorites,
} from '../controllers/users.controller';
import { verifyAccessToken } from '../middleware/auth';

const router = Router();

router.get('/me', verifyAccessToken, getMe);
router.put('/me', verifyAccessToken, updateMe);
router.get('/me/favorites', verifyAccessToken, getMyFavorites);
router.put('/me/favorites', verifyAccessToken, updateMyFavorites);

router.get('/:id', getUserById);
router.post('/:id/follow', verifyAccessToken, followUser);
router.delete('/:id/follow', verifyAccessToken, unfollowUser);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);

export default router;
