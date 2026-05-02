import { Router } from 'express';
import {
  getReviewById,
  updateReview,
  deleteReview,
  likeReview,
  unlikeReview,
  getReviewComments,
  createReviewComment,
} from '../controllers/reviews.controller';
import { verifyAccessToken } from '../middleware/auth';

const router = Router();

router.get('/:id', getReviewById);
router.put('/:id', verifyAccessToken, updateReview);
router.delete('/:id', verifyAccessToken, deleteReview);
router.post('/:id/like', verifyAccessToken, likeReview);
router.delete('/:id/like', verifyAccessToken, unlikeReview);
router.get('/:id/comments', getReviewComments);
router.post('/:id/comments', verifyAccessToken, createReviewComment);

export default router;
