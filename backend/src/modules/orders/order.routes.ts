import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole, optionalAuth } from "../../middleware/auth";
import { orderCreateLimiter, orderReadLimiter } from "../../middleware/rateLimit";
import {
  createOrder,
  getOrder,
  getOrderPdf,
  getOrderCounts,
  listOrders,
  listMyOrders,
  createManualOrder,
  updateOrderStatus,
  updatePaymentStatus,
  deleteOrder,
} from "./order.controller";

const router = Router();

// Customer order placement — rate limited. optionalAuth links the order to the
// signed-in customer (guests can still order).
router.post("/", orderCreateLimiter, optionalAuth, asyncHandler(createOrder));

// A customer's own order history (declared before /:id so it isn't shadowed).
router.get("/mine", requireAuth, asyncHandler(listMyOrders));

// Admin-only management routes (declared before /:id so they aren't shadowed).
router.get("/", requireAuth, requireRole("admin"), asyncHandler(listOrders));
router.get("/counts", requireAuth, requireRole("admin"), asyncHandler(getOrderCounts));
router.post("/manual", requireAuth, requireRole("admin"), asyncHandler(createManualOrder));
router.patch("/:id/status", requireAuth, requireRole("admin"), asyncHandler(updateOrderStatus));
router.patch("/:id/payment-status", requireAuth, requireRole("admin"), asyncHandler(updatePaymentStatus));
router.delete("/:id", requireAuth, requireRole("admin"), asyncHandler(deleteOrder));

// Public single-order reads (confirmation page + PDF) — rate limited.
router.get("/:id/pdf", orderReadLimiter, asyncHandler(getOrderPdf));
router.get("/:id", orderReadLimiter, asyncHandler(getOrder));

export default router;
