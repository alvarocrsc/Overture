import { z } from 'zod';

export const createListSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  icon_url: z.string().url().max(500).nullable().optional(),
  view_mode: z.enum(['posters', 'expanded']).optional().default('posters'),
  is_public: z.boolean().optional().default(true),
  is_ranked: z.boolean().optional().default(false),
});

export const updateListSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  icon_url: z.string().url().max(500).nullable().optional(),
  view_mode: z.enum(['posters', 'expanded']).optional(),
  is_public: z.boolean().optional(),
  is_ranked: z.boolean().optional(),
  folder_id: z.number().int().positive().nullable().optional(),
});

export const addListItemSchema = z.object({
  film_id: z.number().int().positive().optional(),
  series_id: z.number().int().positive().optional(),
  position: z.number().int().positive().optional(),
  note: z.string().max(1000).nullable().optional(),
});

export const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(100),
  parent_folder_id: z.number().int().positive().nullable().optional(),
});

export type CreateListInput = z.infer<typeof createListSchema>;
export type UpdateListInput = z.infer<typeof updateListSchema>;
export type AddListItemInput = z.infer<typeof addListItemSchema>;
export type CreateFolderInput = z.infer<typeof createFolderSchema>;
