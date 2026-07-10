import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { reviewReadLimiter, reviewWriteLimiter } from "../../middleware/rateLimit";
import { uploadImage } from "../uploads/upload.middleware";
import { listReviews, createReview } from "./review.controller";

const router = Router();

router.get("/", reviewReadLimiter, asyncHandler(listReviews));

// Public guest submission: strict rate limit → parse a single optional image.
router.post(
  "/",
  reviewWriteLimiter,
  uploadImage.single("image"),
  asyncHandler(createReview)
);

export default router;
