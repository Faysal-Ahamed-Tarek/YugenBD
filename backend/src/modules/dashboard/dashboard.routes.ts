import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getTopSelling, getLowStock } from "./dashboard.controller";

const router = Router();

router.use(requireAuth, requireRole("admin"));
router.get("/top-selling", asyncHandler(getTopSelling));
router.get("/low-stock", asyncHandler(getLowStock));

export default router;
