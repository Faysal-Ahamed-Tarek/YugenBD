import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { reviewReadLimiter, reviewWriteLimiter } from "../../middleware/rateLimit";
import { uploadImage } from "../uploads/upload.middleware";
import { listReviews, createReview, listFeaturedReviews } from "./review.controller";

const router = Router();

router.get("/", reviewReadLimiter, asyncHandler(listReviews));
// Home-page customer-reviews slider (featured, topped up with latest 4★+).
router.get("/featured", reviewReadLimiter, asyncHandler(listFeaturedReviews));

// Public guest submission: strict rate limit → parse a single optional image.
router.post(
  "/",
  reviewWriteLimiter,
  uploadImage.single("image"),
  asyncHandler(createReview)
);

export default router;
