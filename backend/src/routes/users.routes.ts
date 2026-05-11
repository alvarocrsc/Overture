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
  getUserFavoritesById,
  getMyFriendsActivity,
  uploadAvatar,
} from '../controllers/users.controller';
import { verifyAccessToken, optionalAccessToken } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { upload } from '../middleware/upload';
import {
  updateMeSchema,
  updateFavoritesSchema,
} from '../validators/user.validators';

const router = Router();

router.get('/me', verifyAccessToken, getMe);
router.put('/me', verifyAccessToken, validate(updateMeSchema), updateMe);
router.post(
  '/me/avatar',
  verifyAccessToken,
  upload.single('avatar'),
  uploadAvatar,
);
router.get('/me/favorites', verifyAccessToken, getMyFavorites);
router.put(
  '/me/favorites',
  verifyAccessToken,
  validate(updateFavoritesSchema),
  updateMyFavorites,
);
router.get('/me/friends-activity', verifyAccessToken, getMyFriendsActivity);

router.get('/:id', optionalAccessToken, getUserById);
router.get('/:id/favorites', getUserFavoritesById);
router.post('/:id/follow', verifyAccessToken, followUser);
router.delete('/:id/follow', verifyAccessToken, unfollowUser);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);

export default router;
