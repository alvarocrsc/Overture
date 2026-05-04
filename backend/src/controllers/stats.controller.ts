import type { Request, Response } from 'express';
import * as statsService from '../services/stats.service';

/** GET /api/v1/stats/me?period=month|year|all */
export async function getMyStats(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const rawPeriod = typeof req.query['period'] === 'string' ? req.query['period'] : undefined;
  const period = statsService.resolvePeriod(rawPeriod);
  const data = await statsService.getMyStats(userId, period);
  res.status(200).json({ data });
}
