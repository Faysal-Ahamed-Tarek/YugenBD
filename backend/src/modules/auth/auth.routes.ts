import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { authLimiter } from "../../middleware/rateLimit";
import {
  login,
  register,
  customerLogin,
  me,
  refresh,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from "./auth.controller";

const router = Router();

// Admin login (by email).
router.post("/login", authLimiter, asyncHandler(login));

// Customer storefront auth (by phone).
router.post("/register", authLimiter, asyncHandler(register));
router.post("/customer-login", authLimiter, asyncHandler(customerLogin));
router.get("/me", requireAuth, asyncHandler(me));

router.post("/refresh", asyncHandler(refresh));
router.post("/logout", asyncHandler(logout));
router.post("/change-password", authLimiter, requireAuth, asyncHandler(changePassword));

// Password reset via emailed link (public, rate-limited).
router.post("/forgot-password", authLimiter, asyncHandler(forgotPassword));
router.post("/reset-password", authLimiter, asyncHandler(resetPassword));

// Account email verification (public, rate-limited).
router.post("/verify-email", authLimiter, asyncHandler(verifyEmail));
router.post("/resend-verification", authLimiter, asyncHandler(resendVerification));

export default router;
