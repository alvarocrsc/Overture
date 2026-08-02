import { z } from 'zod';

/**
 * Ratings are stored on the canonical 0.0-10.0 scale in 0.1 steps — the same
 * scale as `episode_ratings`, so every rating in the app is directly
 * comparable. Five stars is a display format layered on top: the client sends
 * a 4.5-star rating as 9.0.
 */
const ratingValue = z
  .number()
  .min(0)
  .max(10)
  // Epsilon rather than `%`: 0.1 has no exact binary representation, so
  // `v % 0.1` is not reliably 0 for valid inputs.
  .refine((v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9, {
    message: 'Rating value must be between 0.0 and 10.0 in 0.1 increments',
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
