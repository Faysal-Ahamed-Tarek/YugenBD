import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  listHeroSlides,
  listAllHeroSlides,
  createHeroSlide,
  reorderHeroSlides,
  updateHeroSlide,
  deleteHeroSlide,
} from "./hero-slide.controller";

const router = Router();
const admin = [requireAuth, requireRole("admin")] as const;

router.get("/", asyncHandler(listHeroSlides));
router.get("/all", ...admin, asyncHandler(listAllHeroSlides));

router.post("/", ...admin, asyncHandler(createHeroSlide));
// `/reorder` must be declared before `/:id` so it isn't swallowed as an id.
router.patch("/reorder", ...admin, asyncHandler(reorderHeroSlides));
router.patch("/:id", ...admin, asyncHandler(updateHeroSlide));
router.delete("/:id", ...admin, asyncHandler(deleteHeroSlide));

export default router;
