import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getDeliverySettings, updateDeliverySettings } from "./delivery.controller";

const router = Router();
const admin = [requireAuth, requireRole("admin")] as const;

// Public: checkout reads this to mirror the free-delivery rule in the UI.
router.get("/", asyncHandler(getDeliverySettings));
router.put("/", ...admin, asyncHandler(updateDeliverySettings));

export default router;
