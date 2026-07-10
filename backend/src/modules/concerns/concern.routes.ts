import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  listConcerns,
  getConcernBySlug,
  createConcern,
  updateConcern,
  deleteConcern,
} from "./concern.controller";

const router = Router();

router.get("/", asyncHandler(listConcerns));

router.post("/", requireAuth, requireRole("admin"), asyncHandler(createConcern));
router.patch("/:id", requireAuth, requireRole("admin"), asyncHandler(updateConcern));
router.delete("/:id", requireAuth, requireRole("admin"), asyncHandler(deleteConcern));

// Keep the public slug lookup last so it doesn't shadow the admin routes above.
router.get("/:slug", asyncHandler(getConcernBySlug));

export default router;
