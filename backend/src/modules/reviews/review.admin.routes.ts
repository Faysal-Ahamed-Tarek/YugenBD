import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  adminListReviews,
  updateReviewStatus,
  createAdminReview,
  deleteReview,
} from "./review.controller";

// Mounted at /api/v1/admin/reviews — all admin-only.
const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/", asyncHandler(adminListReviews));
router.patch("/:id/status", asyncHandler(updateReviewStatus));
// Admin-authored review (JSON; optional imageUrl from the uploads flow).
router.post("/", asyncHandler(createAdminReview));
// Permanent delete (images cascade) — distinct from rejecting, which keeps the row.
router.delete("/:id", asyncHandler(deleteReview));

export default router;
