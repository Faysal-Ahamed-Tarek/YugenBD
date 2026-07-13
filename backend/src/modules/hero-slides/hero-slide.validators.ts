import { z } from "zod";

export const heroSlideIdParamSchema = z.object({
  id: z.string().uuid("Invalid hero slide id"),
});

export const createHeroSlideSchema = z.object({
  imageUrl: z.string().url().max(500),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateHeroSlideSchema = createHeroSlideSchema.partial();

// Bulk reorder: the full ordered list of slide ids. Each id's sortOrder is set
// to its position in the array.
export const reorderHeroSlidesSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export type CreateHeroSlideInput = z.infer<typeof createHeroSlideSchema>;
export type UpdateHeroSlideInput = z.infer<typeof updateHeroSlideSchema>;
