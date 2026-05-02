import { Router } from 'express';
import { getMyStats } from '../controllers/stats.controller';
import { verifyAccessToken } from '../middleware/auth';

const router = Router();

router.get('/me', verifyAccessToken, getMyStats);

export default router;
