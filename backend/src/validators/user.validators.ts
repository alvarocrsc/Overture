import { z } from 'zod';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const updateMeSchema = z
  .object({
    name: z.string().trim().max(100).nullable().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    location: z.string().trim().max(100).nullable().optional(),
    avatar_url: z.string().url().max(500).nullable().optional(),
    accent_color: z.string().regex(HEX_COLOR, 'Invalid hex color').optional(),
    profile_backdrop_tmdb_id: z.number().int().positive().nullable().optional(),
    profile_backdrop_media_type: z.enum(['film', 'series']).nullable().optional(),
    // Which scale the user sees ratings in, per media type. Episodes follow
    // the series setting rather than having one of their own.
    film_rating_format: z.enum(['stars', 'numeric']).optional(),
    series_rating_format: z.enum(['stars', 'numeric']).optional(),
  })
  .strict()
  .superRefine((patch, ctx) => {
    // The id alone is ambiguous — TMDB numbers films and series separately, so
    // setting a banner has to say which table the id belongs to. Clearing it
    // needs no type, and the service nulls the pair together.
    if (
      patch.profile_backdrop_tmdb_id != null &&
      patch.profile_backdrop_media_type == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['profile_backdrop_media_type'],
        message:
          'profile_backdrop_media_type is required when setting profile_backdrop_tmdb_id',
      });
    }
  });

export type UpdateMeInput = z.infer<typeof updateMeSchema>;

const favoriteItemSchema = z.object({
  position: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  tmdb_id: z.number().int().positive(),
  media_type: z.enum(['film', 'series']),
});

export const updateFavoritesSchema = z
  .object({
    items: z
      .array(favoriteItemSchema)
      .max(4)
      .superRefine((items, ctx) => {
        const seen = new Set<number>();
        for (const it of items) {
          if (seen.has(it.position)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Duplicate favorite position',
            });
            return;
          }
          seen.add(it.position);
        }
      }),
  })
  .strict();

export type UpdateFavoritesInput = z.infer<typeof updateFavoritesSchema>;

/**
 * Query params for the profile banner picker. Coerced from strings because
 * these arrive on the query string, and clamped so the interpolated
 * LIMIT/OFFSET can never carry anything but a bounded integer.
 */
export const backdropOptionsQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(40).default(20),
  })
  .strict();

export type BackdropOptionsQuery = z.infer<typeof backdropOptionsQuerySchema>;
