import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { reviewService } from "./review.service";
import {
  listReviewsQuerySchema,
  listAllReviewsQuerySchema,
  createReviewSchema,
  adminListReviewsQuerySchema,
  adminCreateReviewSchema,
  adminUpdateReviewSchema,
  updateReviewStatusSchema,
  reviewIdParamSchema,
} from "./review.validators";
import { uploadBufferToCloudinary } from "../uploads/upload.service";

export async function listReviews(req: Request, res: Response) {
  const { productId } = listReviewsQuerySchema.parse(req.query);
  const reviews = await reviewService.listByProduct(productId);
  sendSuccess(res, reviews);
}

export async function createReview(req: Request, res: Response) {
  const input = createReviewSchema.parse(req.body);

  let imageUrl: string | undefined;
  if (req.file) {
    const { url } = await uploadBufferToCloudinary(req.file.buffer, "reviews");
    imageUrl = url;
  }

  const review = await reviewService.create(input, imageUrl);
  sendSuccess(res, review, 201);
}

// ─── Admin ────────────────────────────────────────────────────────────────

export async function adminListReviews(req: Request, res: Response) {
  const query = adminListReviewsQuerySchema.parse(req.query);
  const result = await reviewService.adminList(query);
  sendSuccess(res, result.items, 200, { pagination: result.pagination });
}

export async function updateReviewStatus(req: Request, res: Response) {
  const { id } = reviewIdParamSchema.parse(req.params);
  const { status } = updateReviewStatusSchema.parse(req.body);
  const review = await reviewService.updateStatus(id, status);
  sendSuccess(res, review);
}

export async function deleteReview(req: Request, res: Response) {
  const { id } = reviewIdParamSchema.parse(req.params);
  await reviewService.remove(id);
  sendSuccess(res, { id });
}

export async function createAdminReview(req: Request, res: Response) {
  const input = adminCreateReviewSchema.parse(req.body);
  const review = await reviewService.createByAdmin(input);
  sendSuccess(res, review, 201);
}

export async function updateAdminReview(req: Request, res: Response) {
  const { id } = reviewIdParamSchema.parse(req.params);
  const input = adminUpdateReviewSchema.parse(req.body);
  const review = await reviewService.update(id, input);
  sendSuccess(res, review);
}

export async function listFeaturedReviews(_req: Request, res: Response) {
  const reviews = await reviewService.listFeatured();
  sendSuccess(res, reviews);
}

export async function listAllReviews(req: Request, res: Response) {
  const query = listAllReviewsQuerySchema.parse(req.query);
  const result = await reviewService.listAll(query);
  sendSuccess(res, result.items, 200, { pagination: result.pagination });
}
