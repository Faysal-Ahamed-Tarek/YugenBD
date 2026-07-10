import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { uploadImage } from "./upload.middleware";
import { uploadImages } from "./upload.controller";

const router = Router();

router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  uploadImage.array("images", 10),
  asyncHandler(uploadImages)
);

export default router;
