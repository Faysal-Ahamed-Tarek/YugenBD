import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { reviewService } from "./review.service";
import {
  listReviewsQuerySchema,
  createReviewSchema,
  adminListReviewsQuerySchema,
  adminCreateReviewSchema,
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

export async function createAdminReview(req: Request, res: Response) {
  const { imageUrl, ...input } = adminCreateReviewSchema.parse(req.body);
  const review = await reviewService.createByAdmin(input, imageUrl);
  sendSuccess(res, review, 201);
}
