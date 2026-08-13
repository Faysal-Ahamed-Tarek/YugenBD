import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getShipmentDate, setShipmentDate } from "./shipment.controller";

const router = Router();
const admin = [requireAuth, requireRole("admin")] as const;

// Public: the storefront reads this to show the real ship-by date on
// pre-order products instead of a hardcoded +15-days guess.
router.get("/", asyncHandler(getShipmentDate));
router.put("/", ...admin, asyncHandler(setShipmentDate));

export default router;
