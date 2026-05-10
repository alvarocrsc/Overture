import { Router } from 'express';
import { getMyStats, getUserStats } from '../controllers/stats.controller';
import { verifyAccessToken } from '../middleware/auth';

const router = Router();

router.get('/me', verifyAccessToken, getMyStats);
router.get('/user/:id', getUserStats);

export default router;
