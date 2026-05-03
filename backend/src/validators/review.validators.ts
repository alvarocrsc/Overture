import { z } from 'zod';

export const updateReviewSchema = z.object({
  body: z.string().min(1).max(10000).optional(),
  contains_spoilers: z.boolean().optional(),
  liked_title: z.boolean().optional(),
});

export const createCommentSchema = z.object({
  body: z.string().min(1).max(2000),
  parent_id: z.number().int().positive().nullable().optional(),
});

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
