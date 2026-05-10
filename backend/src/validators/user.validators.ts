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
  })
  .strict();

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
