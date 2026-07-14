import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { authLimiter } from "../../middleware/rateLimit";
import { login, register, customerLogin, me, refresh, logout, changePassword } from "./auth.controller";

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

export default router;
