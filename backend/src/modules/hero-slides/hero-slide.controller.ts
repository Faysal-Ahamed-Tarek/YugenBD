import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { heroSlideService } from "./hero-slide.service";
import {
  createHeroSlideSchema,
  updateHeroSlideSchema,
  reorderHeroSlidesSchema,
  heroSlideIdParamSchema,
} from "./hero-slide.validators";

export async function listHeroSlides(_req: Request, res: Response) {
  const slides = await heroSlideService.listActive();
  sendSuccess(res, slides);
}

export async function listAllHeroSlides(_req: Request, res: Response) {
  const slides = await heroSlideService.listAll();
  sendSuccess(res, slides);
}

export async function createHeroSlide(req: Request, res: Response) {
  const input = createHeroSlideSchema.parse(req.body);
  const slide = await heroSlideService.create(input);
  sendSuccess(res, slide, 201);
}

export async function reorderHeroSlides(req: Request, res: Response) {
  const { ids } = reorderHeroSlidesSchema.parse(req.body);
  const slides = await heroSlideService.reorder(ids);
  sendSuccess(res, slides);
}

export async function updateHeroSlide(req: Request, res: Response) {
  const { id } = heroSlideIdParamSchema.parse(req.params);
  const input = updateHeroSlideSchema.parse(req.body);
  const slide = await heroSlideService.update(id, input);
  sendSuccess(res, slide);
}

export async function deleteHeroSlide(req: Request, res: Response) {
  const { id } = heroSlideIdParamSchema.parse(req.params);
  await heroSlideService.remove(id);
  sendSuccess(res, { id });
}
