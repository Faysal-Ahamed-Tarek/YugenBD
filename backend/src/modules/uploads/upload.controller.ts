import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/ApiError";
import { uploadBufferToCloudinary } from "./upload.service";

// Whitelist the folders the admin UIs upload into.
const IMAGE_FOLDERS: Record<string, string> = {
  reviews: "yugenbd/reviews",
  hero: "yugenbd/hero",
  products: "yugenbd/products",
};

export async function uploadImages(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];

  if (files.length === 0) {
    throw ApiError.badRequest("No files provided");
  }

  const folder = IMAGE_FOLDERS[req.body.folder as string] ?? IMAGE_FOLDERS.products;

  const uploaded = await Promise.all(
    files.map((file) => uploadBufferToCloudinary(file.buffer, folder))
  );

  sendSuccess(res, uploaded, 201);
}

/** Single video upload (testimonials) → Cloudinary as a video resource. */
export async function uploadVideo(req: Request, res: Response) {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) throw ApiError.badRequest("No video provided");

  const uploaded = await uploadBufferToCloudinary(file.buffer, "yugenbd/testimonials", "video");
  sendSuccess(res, uploaded, 201);
}
