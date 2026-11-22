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

// Admin-authored review content (JSON). Images are uploaded first through the
// shared /uploads endpoint and arrive here as Cloudinary URLs. `images` is the
// full ordered list — on update it REPLACES the review's existing images.
const reviewContentFields = {
  productId: z.string().uuid("productId must be a valid UUID").nullable(),
  name: z.string().trim().min(2, "Name is too short").max(150),
  comment: z.string().trim().min(3, "Please write a short review").max(2000),
  rating: z.coerce.number().int().min(1).max(5),
  reviewerImageUrl: z.string().url().max(500).nullable(),
  images: z.array(z.string().url().max(500)).max(10, "At most 10 images"),
  isFeatured: z.boolean(),
  featuredOrder: z.coerce.number().int().min(0).max(9999).nullable(),
};

export const adminCreateReviewSchema = z.object({
  ...reviewContentFields,
  productId: reviewContentFields.productId.default(null),
  reviewerImageUrl: reviewContentFields.reviewerImageUrl.default(null),
  images: reviewContentFields.images.default([]),
  isFeatured: reviewContentFields.isFeatured.default(false),
  featuredOrder: reviewContentFields.featuredOrder.default(null),
});

export const adminUpdateReviewSchema = z.object(reviewContentFields).partial();

export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type AdminListReviewsQuery = z.infer<typeof adminListReviewsQuerySchema>;
export type ReviewStatus = (typeof reviewStatuses)[number];
export type AdminCreateReviewInput = z.infer<typeof adminCreateReviewSchema>;
export type AdminUpdateReviewInput = z.infer<typeof adminUpdateReviewSchema>;
