import { z } from "zod";

export const listReviewsQuerySchema = z.object({
  productId: z.string().uuid("productId must be a valid UUID"),
});

// Fields arrive as multipart/form-data (alongside the optional image file),
// so numeric values come in as strings and need coercion.
export const createReviewSchema = z.object({
  productId: z.string().uuid("productId must be a valid UUID"),
  name: z.string().trim().min(2, "Name is too short").max(150),
  comment: z.string().trim().min(3, "Please write a short review").max(2000),
  rating: z.coerce.number().int().min(1).max(5),
});

const reviewStatuses = ["pending", "approved", "rejected"] as const;

/** Admin moderation list — all reviews, filterable/searchable, paginated. */
export const adminListReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(16),
  status: z.enum(reviewStatuses).optional(),
  productId: z.string().uuid().optional(),
  q: z.string().trim().optional(),
});

export const updateReviewStatusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export const reviewIdParamSchema = z.object({
  id: z.string().uuid("Invalid review id"),
});

// Admin-authored review (JSON). The optional image is uploaded first via the
// existing uploads flow and passed here as a Cloudinary URL.
export const adminCreateReviewSchema = z.object({
  productId: z.string().uuid("productId must be a valid UUID"),
  name: z.string().trim().min(2, "Name is too short").max(150),
  comment: z.string().trim().min(3, "Please write a short review").max(2000),
  rating: z.coerce.number().int().min(1).max(5),
  imageUrl: z.string().url().optional(),
});

export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type AdminListReviewsQuery = z.infer<typeof adminListReviewsQuerySchema>;
export type ReviewStatus = (typeof reviewStatuses)[number];
