import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getTopSelling, getLowStock, getTotalSales } from "./dashboard.controller";

const router = Router();

router.use(requireAuth, requireRole("admin"));
router.get("/sales", asyncHandler(getTotalSales));
router.get("/top-selling", asyncHandler(getTopSelling));
router.get("/low-stock", asyncHandler(getLowStock));

export default router;
