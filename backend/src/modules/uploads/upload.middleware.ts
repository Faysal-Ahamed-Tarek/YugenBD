import multer from "multer";
import { ApiError } from "../../utils/ApiError";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(ApiError.badRequest("Only JPEG, PNG, WEBP or AVIF images are allowed"));
      return;
    }
    cb(null, true);
  },
});

// Testimonial videos are larger; allow up to 100MB, a single file.
export const uploadVideoFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_VIDEO_TYPES.has(file.mimetype)) {
      cb(ApiError.badRequest("Only MP4, MOV or WEBM videos are allowed"));
      return;
    }
    cb(null, true);
  },
});
