import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { concernService } from "./concern.service";
import {
  createConcernSchema,
  updateConcernSchema,
  concernIdParamSchema,
  listConcernsQuerySchema,
} from "./concern.validators";

export async function listConcerns(req: Request, res: Response) {
  const { q } = listConcernsQuerySchema.parse(req.query);
  const concerns = await concernService.list(q);
  sendSuccess(res, concerns);
}

export async function getConcernBySlug(req: Request, res: Response) {
  const concern = await concernService.getBySlug(req.params.slug);
  sendSuccess(res, concern);
}

export async function createConcern(req: Request, res: Response) {
  const input = createConcernSchema.parse(req.body);
  const concern = await concernService.create(input);
  sendSuccess(res, concern, 201);
}

export async function updateConcern(req: Request, res: Response) {
  const { id } = concernIdParamSchema.parse(req.params);
  const input = updateConcernSchema.parse(req.body);
  const concern = await concernService.update(id, input);
  sendSuccess(res, concern);
}

export async function deleteConcern(req: Request, res: Response) {
  const { id } = concernIdParamSchema.parse(req.params);
  await concernService.remove(id);
  sendSuccess(res, { id });
}
