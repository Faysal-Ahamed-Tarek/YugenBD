import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { dashboardRepository } from "./dashboard.repository";

// Aggregate queries — cache briefly, per-user only (authenticated data).
const CACHE_HEADER = "private, max-age=20";

export async function getTopSelling(_req: Request, res: Response) {
  const rows = await dashboardRepository.topSelling();
  res.setHeader("Cache-Control", CACHE_HEADER);
  sendSuccess(res, rows);
}

export async function getLowStock(_req: Request, res: Response) {
  const rows = await dashboardRepository.lowStock();
  res.setHeader("Cache-Control", CACHE_HEADER);
  sendSuccess(res, rows);
}
