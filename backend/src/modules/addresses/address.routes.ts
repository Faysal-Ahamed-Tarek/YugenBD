import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/auth";
import { getMyAddress, saveMyAddress } from "./address.controller";

// The signed-in customer's shipping details.
const router = Router();

router.get("/me", requireAuth, asyncHandler(getMyAddress));
router.put("/me", requireAuth, asyncHandler(saveMyAddress));

export default router;
