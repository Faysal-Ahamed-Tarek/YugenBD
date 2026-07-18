import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { faqService } from "./faq.service";
import {
  createFaqSchema,
  updateFaqSchema,
  reorderFaqSchema,
  faqIdParamSchema,
} from "./faq.validators";

export async function listFaq(_req: Request, res: Response) {
  const items = await faqService.listActive();
  sendSuccess(res, items);
}

export async function listAllFaq(_req: Request, res: Response) {
  const items = await faqService.listAll();
  sendSuccess(res, items);
}

export async function createFaq(req: Request, res: Response) {
  const input = createFaqSchema.parse(req.body);
  const item = await faqService.create(input);
  sendSuccess(res, item, 201);
}

export async function reorderFaq(req: Request, res: Response) {
  const { ids } = reorderFaqSchema.parse(req.body);
  const items = await faqService.reorder(ids);
  sendSuccess(res, items);
}

export async function updateFaq(req: Request, res: Response) {
  const { id } = faqIdParamSchema.parse(req.params);
  const input = updateFaqSchema.parse(req.body);
  const item = await faqService.update(id, input);
  sendSuccess(res, item);
}

export async function deleteFaq(req: Request, res: Response) {
  const { id } = faqIdParamSchema.parse(req.params);
  await faqService.remove(id);
  sendSuccess(res, { id });
}
