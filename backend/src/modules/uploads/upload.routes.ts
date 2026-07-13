import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { uploadImage, uploadVideoFile } from "./upload.middleware";
import { uploadImages, uploadVideo } from "./upload.controller";

const router = Router();

router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  uploadImage.array("images", 10),
  asyncHandler(uploadImages)
);

router.post(
  "/video",
  requireAuth,
  requireRole("admin"),
  uploadVideoFile.single("video"),
  asyncHandler(uploadVideo)
);

export default router;
