import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth, requireRole, optionalAuth } from "../../middleware/auth";
import {
  listProducts,
  getProduct,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImages,
  setMainProductImage,
  removeProductImage,
  reorderProductImages,
} from "./product.controller";

const router = Router();

router.get("/", optionalAuth, asyncHandler(listProducts));
router.get("/slug/:slug", optionalAuth, asyncHandler(getProductBySlug));
router.get("/:id", optionalAuth, asyncHandler(getProduct));

router.post("/", requireAuth, requireRole("admin"), asyncHandler(createProduct));
router.patch("/:id", requireAuth, requireRole("admin"), asyncHandler(updateProduct));
router.delete("/:id", requireAuth, requireRole("admin"), asyncHandler(deleteProduct));

router.post(
  "/:id/images",
  requireAuth,
  requireRole("admin"),
  asyncHandler(addProductImages)
);
router.patch(
  "/:id/images/reorder",
  requireAuth,
  requireRole("admin"),
  asyncHandler(reorderProductImages)
);
router.patch(
  "/:id/images/:imageId/main",
  requireAuth,
  requireRole("admin"),
  asyncHandler(setMainProductImage)
);
router.delete(
  "/:id/images/:imageId",
  requireAuth,
  requireRole("admin"),
  asyncHandler(removeProductImage)
);

export default router;
