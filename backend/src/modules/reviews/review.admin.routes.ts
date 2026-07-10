import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { adminListReviews, updateReviewStatus, createAdminReview } from "./review.controller";

// Mounted at /api/v1/admin/reviews — all admin-only.
const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", asyncHandler(adminListReviews));
router.patch("/:id/status", asyncHandler(updateReviewStatus));
// Admin-authored review (JSON; optional imageUrl from the uploads flow).
router.post("/", asyncHandler(createAdminReview));

export default router;
