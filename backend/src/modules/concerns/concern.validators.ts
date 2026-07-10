import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createConcernSchema = z.object({
  title: z.string().trim().min(2).max(150),
  // Slug is generated server-side from the title (unique), not client-supplied.
  imageUrl: z.string().url().max(500),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateConcernSchema = createConcernSchema.partial();

export const concernIdParamSchema = z.object({
  id: z.string().uuid("Invalid concern id"),
});

export const listConcernsQuerySchema = z.object({
  q: z.string().trim().optional(),
});

export type CreateConcernInput = z.infer<typeof createConcernSchema>;
export type UpdateConcernInput = z.infer<typeof updateConcernSchema>;
