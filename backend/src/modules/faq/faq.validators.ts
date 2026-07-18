import { z } from "zod";

export const faqSegments = ["products", "orders", "delivery", "returns"] as const;

export const faqIdParamSchema = z.object({
  id: z.string().uuid("Invalid FAQ id"),
});

export const createFaqSchema = z.object({
  segment: z.enum(faqSegments),
  question: z.string().trim().min(3, "Question is too short").max(300),
  answer: z.string().trim().min(3, "Answer is too short").max(4000),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateFaqSchema = createFaqSchema.partial();

// Bulk reorder within a segment: the full ordered list of ids.
export const reorderFaqSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export type FaqSegment = (typeof faqSegments)[number];
export type CreateFaqInput = z.infer<typeof createFaqSchema>;
export type UpdateFaqInput = z.infer<typeof updateFaqSchema>;
