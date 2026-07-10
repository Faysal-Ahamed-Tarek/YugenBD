import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  listTestimonials,
  listAllTestimonials,
  getTestimonial,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from "./testimonial.controller";

const router = Router();

router.get("/", asyncHandler(listTestimonials));
router.get("/all", requireAuth, requireRole("admin"), asyncHandler(listAllTestimonials));
router.get("/:id", asyncHandler(getTestimonial));

router.post("/", requireAuth, requireRole("admin"), asyncHandler(createTestimonial));
router.patch("/:id", requireAuth, requireRole("admin"), asyncHandler(updateTestimonial));
router.delete("/:id", requireAuth, requireRole("admin"), asyncHandler(deleteTestimonial));

export default router;
