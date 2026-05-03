import { z } from 'zod';

export const addToWatchlistSchema = z.object({
  film_id: z.number().int().positive().optional(),
  series_id: z.number().int().positive().optional(),
  priority: z.number().int().min(0).max(10).optional().default(0),
});

export type AddToWatchlistInput = z.infer<typeof addToWatchlistSchema>;
