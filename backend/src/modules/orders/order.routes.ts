import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { orderCreateLimiter, orderReadLimiter } from "../../middleware/rateLimit";
import {
  createOrder,
  getOrder,
  getOrderPdf,
  listOrders,
  createManualOrder,
  updateOrderStatus,
  updatePaymentStatus,
} from "./order.controller";

const router = Router();

// Customer (public) order placement — rate limited.
router.post("/", orderCreateLimiter, asyncHandler(createOrder));

// Admin-only management routes (declared before /:id so they aren't shadowed).
router.get("/", requireAuth, requireRole("admin"), asyncHandler(listOrders));
router.post("/manual", requireAuth, requireRole("admin"), asyncHandler(createManualOrder));
router.patch("/:id/status", requireAuth, requireRole("admin"), asyncHandler(updateOrderStatus));
router.patch("/:id/payment-status", requireAuth, requireRole("admin"), asyncHandler(updatePaymentStatus));

// Public single-order reads (confirmation page + PDF) — rate limited.
router.get("/:id/pdf", orderReadLimiter, asyncHandler(getOrderPdf));
router.get("/:id", orderReadLimiter, asyncHandler(getOrder));

export default router;
