import { z } from 'zod';

const VALID_RATING_VALUES = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

const ratingValue = z
  .number()
  .refine((v) => (VALID_RATING_VALUES as readonly number[]).includes(v), {
    message: 'Rating value must be between 0.5 and 5 in 0.5 increments',
  });

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'watched_on must be a valid date in YYYY-MM-DD format');

const reviewInput = z.object({
  body: z.string().min(1).max(10000),
  contains_spoilers: z.boolean().optional().default(false),
  liked_title: z.boolean().optional().default(false),
});

const updateReviewInput = z.object({
  body: z.string().min(1).max(10000),
  contains_spoilers: z.boolean().optional(),
  liked_title: z.boolean().optional(),
});

export const createRatingSchema = z.object({
  film_id: z.number().int().positive().optional(),
  series_id: z.number().int().positive().optional(),
  value: ratingValue,
  watched_on: isoDate.optional(),
  is_rewatch: z.boolean().optional().default(false),
  review: reviewInput.optional(),
});

export const updateRatingSchema = z.object({
  value: ratingValue.optional(),
  watched_on: isoDate.optional(),
  is_rewatch: z.boolean().optional(),
  review: updateReviewInput.optional(),
});

export type CreateRatingInput = z.infer<typeof createRatingSchema>;
export type UpdateRatingInput = z.infer<typeof updateRatingSchema>;
