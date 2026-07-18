import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { announcementService } from "./announcement.service";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  reorderAnnouncementsSchema,
  announcementIdParamSchema,
} from "./announcement.validators";

export async function listAnnouncements(_req: Request, res: Response) {
  const items = await announcementService.listActive();
  sendSuccess(res, items);
}

export async function listAllAnnouncements(_req: Request, res: Response) {
  const items = await announcementService.listAll();
  sendSuccess(res, items);
}

export async function createAnnouncement(req: Request, res: Response) {
  const input = createAnnouncementSchema.parse(req.body);
  const item = await announcementService.create(input);
  sendSuccess(res, item, 201);
}

export async function reorderAnnouncements(req: Request, res: Response) {
  const { ids } = reorderAnnouncementsSchema.parse(req.body);
  const items = await announcementService.reorder(ids);
  sendSuccess(res, items);
}

export async function updateAnnouncement(req: Request, res: Response) {
  const { id } = announcementIdParamSchema.parse(req.params);
  const input = updateAnnouncementSchema.parse(req.body);
  const item = await announcementService.update(id, input);
  sendSuccess(res, item);
}

export async function deleteAnnouncement(req: Request, res: Response) {
  const { id } = announcementIdParamSchema.parse(req.params);
  await announcementService.remove(id);
  sendSuccess(res, { id });
}
