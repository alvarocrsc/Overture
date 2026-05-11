import { Router } from 'express';
import {
  getReviewById,
  updateReview,
  deleteReview,
  likeReview,
  unlikeReview,
  getReviewComments,
  createReviewComment,
  likeComment,
  unlikeComment,
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
router.post('/:id/comments/:commentId/like', verifyAccessToken, likeComment);
router.delete('/:id/comments/:commentId/like', verifyAccessToken, unlikeComment);

export default router;
