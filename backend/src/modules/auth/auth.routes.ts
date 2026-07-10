import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { authLimiter } from "../../middleware/rateLimit";
import { login, refresh, logout, changePassword } from "./auth.controller";

const router = Router();

router.post("/login", authLimiter, asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));
router.post("/logout", asyncHandler(logout));
router.post("/change-password", authLimiter, requireAuth, asyncHandler(changePassword));

export default router;
