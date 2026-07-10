import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/ApiError";
import { uploadBufferToCloudinary } from "./upload.service";

export async function uploadImages(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];

  if (files.length === 0) {
    throw ApiError.badRequest("No files provided");
  }

  const folder = req.body.folder === "reviews" ? "yugenbd/reviews" : "yugenbd/products";

  const uploaded = await Promise.all(
    files.map((file) => uploadBufferToCloudinary(file.buffer, folder))
  );

  sendSuccess(res, uploaded, 201);
}
