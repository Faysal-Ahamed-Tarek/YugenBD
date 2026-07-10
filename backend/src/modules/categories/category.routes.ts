import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  listCategories,
  getCategory,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./category.controller";

const router = Router();

router.get("/", asyncHandler(listCategories));
router.get("/slug/:slug", asyncHandler(getCategoryBySlug));
router.get("/:id", asyncHandler(getCategory));

router.post("/", requireAuth, requireRole("admin"), asyncHandler(createCategory));
router.patch("/:id", requireAuth, requireRole("admin"), asyncHandler(updateCategory));
router.delete("/:id", requireAuth, requireRole("admin"), asyncHandler(deleteCategory));

export default router;
