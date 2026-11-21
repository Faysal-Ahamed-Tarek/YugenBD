import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { couponValidateLimiter } from "../../middleware/rateLimit";
import { validateCoupon } from "./coupon.controller";

// Public: checkout "Apply" preview. Rate limited to curb code guessing.
const router = Router();
router.post("/validate", couponValidateLimiter, asyncHandler(validateCoupon));

export default router;
