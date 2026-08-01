import { z } from 'zod';

/**
 * Episodes are scored 0.0-10.0 in 0.1 steps — a different scale from the
 * 0.5-5.0 stars used for films and series. Null means "watched, not rated",
 * which is what the bulk season log produces.
 */
const episodeRatingValue = z
  .number()
  .min(0)
  .max(10)
  // Compared against an epsilon rather than with `%`: 0.1 has no exact binary
  // representation, so `v % 0.1` is not reliably 0 for valid inputs.
  .refine((v) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-9, {
    message: 'Rating value must be between 0.0 and 10.0 in 0.1 increments',
  });

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'watched_on must be a valid date in YYYY-MM-DD format');

const reviewInput = z.object({
  body: z.string().min(1).max(5000),
  contains_spoilers: z.boolean().optional().default(false),
});

export const createEpisodeRatingSchema = z.object({
  tmdb_series_id: z.number().int().positive(),
  season_number: z.number().int().nonnegative(),
  episode_number: z.number().int().positive(),
  value: episodeRatingValue.nullable(),
  watched_on: isoDate.nullable().optional(),
  is_rewatch: z.boolean().optional().default(false),
  review: reviewInput.nullable().optional(),
});

export const updateEpisodeRatingSchema = z.object({
  value: episodeRatingValue.nullable().optional(),
  watched_on: isoDate.nullable().optional(),
  is_rewatch: z.boolean().optional(),
  review: reviewInput.nullable().optional(),
});

export type CreateEpisodeRatingInput = z.infer<typeof createEpisodeRatingSchema>;
export type UpdateEpisodeRatingInput = z.infer<typeof updateEpisodeRatingSchema>;
