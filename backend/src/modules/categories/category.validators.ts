import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(150),
  // Slug is generated server-side from the name (unique), not client-supplied.
  // Optional parent for subcategories. null / omitted = top-level category.
  // The service validates the parent exists and is itself top-level.
  parentId: z.string().uuid().nullable().optional(),
  // Manual display order (lower first), like concerns.
  sortOrder: z.number().int().min(0).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listCategoriesQuerySchema = z.object({
  q: z.string().trim().optional(),
  // Default response is the nested tree (top-level categories with `children`).
  // `?flat=true` returns the legacy flat list of every category.
  flat: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
