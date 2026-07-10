import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(150),
  // Slug is generated server-side from the name (unique), not client-supplied.
  imageUrl: z.string().url().max(500).nullable().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listCategoriesQuerySchema = z.object({
  q: z.string().trim().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
