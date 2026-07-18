import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  listFaq,
  listAllFaq,
  createFaq,
  reorderFaq,
  updateFaq,
  deleteFaq,
} from "./faq.controller";

const router = Router();
const admin = [requireAuth, requireRole("admin")] as const;

router.get("/", asyncHandler(listFaq));
router.get("/all", ...admin, asyncHandler(listAllFaq));

router.post("/", ...admin, asyncHandler(createFaq));
// `/reorder` must be declared before `/:id` so it isn't swallowed as an id.
router.patch("/reorder", ...admin, asyncHandler(reorderFaq));
router.patch("/:id", ...admin, asyncHandler(updateFaq));
router.delete("/:id", ...admin, asyncHandler(deleteFaq));

export default router;
