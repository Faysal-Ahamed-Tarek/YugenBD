import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { listCoupons, getCoupon, createCoupon, updateCoupon, deleteCoupon } from "./coupon.controller";

// Mounted at /api/v1/admin/coupons — every route is admin-only.
const router = Router();
router.use(requireAuth, requireRole("admin"));

router.get("/", asyncHandler(listCoupons));
router.post("/", asyncHandler(createCoupon));
router.get("/:id", asyncHandler(getCoupon));
router.patch("/:id", asyncHandler(updateCoupon));
router.delete("/:id", asyncHandler(deleteCoupon));

export default router;
