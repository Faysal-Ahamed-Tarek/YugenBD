import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { testimonialService } from "./testimonial.service";
import {
  createTestimonialSchema,
  updateTestimonialSchema,
  testimonialIdParamSchema,
} from "./testimonial.validators";

export async function listTestimonials(_req: Request, res: Response) {
  const testimonials = await testimonialService.listActive();
  sendSuccess(res, testimonials);
}

export async function listAllTestimonials(_req: Request, res: Response) {
  const testimonials = await testimonialService.listAll();
  sendSuccess(res, testimonials);
}

export async function getTestimonial(req: Request, res: Response) {
  const { id } = testimonialIdParamSchema.parse(req.params);
  const testimonial = await testimonialService.getById(id);
  sendSuccess(res, testimonial);
}

export async function createTestimonial(req: Request, res: Response) {
  const input = createTestimonialSchema.parse(req.body);
  const testimonial = await testimonialService.create(input);
  sendSuccess(res, testimonial, 201);
}

export async function updateTestimonial(req: Request, res: Response) {
  const { id } = testimonialIdParamSchema.parse(req.params);
  const input = updateTestimonialSchema.parse(req.body);
  const testimonial = await testimonialService.update(id, input);
  sendSuccess(res, testimonial);
}

export async function deleteTestimonial(req: Request, res: Response) {
  const { id } = testimonialIdParamSchema.parse(req.params);
  await testimonialService.remove(id);
  sendSuccess(res, { id });
}
