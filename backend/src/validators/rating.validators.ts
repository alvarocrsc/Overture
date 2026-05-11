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

const backdropPath = z
  .string()
  .regex(/^\/[\w\-./]+\.(jpg|jpeg|png|webp)$/i, 'Invalid TMDB backdrop path');

const reviewInput = z.object({
  body: z.string().min(1).max(10000),
  contains_spoilers: z.boolean().optional().default(false),
  liked_title: z.boolean().optional().default(false),
  backdrop_paths: z.array(backdropPath).max(10).optional().default([]),
});

const updateReviewInput = z.object({
  body: z.string().min(1).max(10000),
  contains_spoilers: z.boolean().optional(),
  liked_title: z.boolean().optional(),
});

export const createRatingSchema = z
  .object({
    // Legacy shape: film_id / series_id carry the TMDB id directly.
    film_id: z.number().int().positive().optional(),
    series_id: z.number().int().positive().optional(),
    // New unified shape: tmdb_id + media_type. Normalised into the legacy
    // fields below so the service has a single code path.
    tmdb_id: z.number().int().positive().optional(),
    media_type: z.enum(['film', 'series']).optional(),
    value: ratingValue,
    watched_on: isoDate.optional(),
    is_rewatch: z.boolean().optional().default(false),
    review: reviewInput.optional(),
  })
  .transform((data) => {
    if (data.tmdb_id !== undefined && data.media_type !== undefined) {
      return {
        ...data,
        film_id: data.media_type === 'film' ? data.tmdb_id : data.film_id,
        series_id: data.media_type === 'series' ? data.tmdb_id : data.series_id,
      };
    }
    return data;
  });

export const updateRatingSchema = z.object({
  value: ratingValue.optional(),
  watched_on: isoDate.optional(),
  is_rewatch: z.boolean().optional(),
  review: updateReviewInput.optional(),
});

export type CreateRatingInput = z.infer<typeof createRatingSchema>;
export type UpdateRatingInput = z.infer<typeof updateRatingSchema>;
