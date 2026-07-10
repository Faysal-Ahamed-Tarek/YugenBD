import { z } from "zod";

export const testimonialIdParamSchema = z.object({
  id: z.string().uuid("Invalid testimonial id"),
});

export const createTestimonialSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  videoUrl: z.string().url().max(500),
  posterUrl: z.string().url().max(500),
  orderId: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateTestimonialSchema = createTestimonialSchema.partial();

export type CreateTestimonialInput = z.infer<typeof createTestimonialSchema>;
export type UpdateTestimonialInput = z.infer<typeof updateTestimonialSchema>;
