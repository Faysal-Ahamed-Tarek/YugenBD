import { ApiError } from "../../utils/ApiError";
import { testimonialRepository } from "./testimonial.repository";
import type { CreateTestimonialInput, UpdateTestimonialInput } from "./testimonial.validators";

export const testimonialService = {
  /** Public homepage list: active records only, lean columns, ordered by orderId. */
  async listActive() {
    return testimonialRepository.findActive();
  },

  /** Admin list: every record with full fields. */
  async listAll() {
    return testimonialRepository.findAll();
  },

  async getById(id: string) {
    const testimonial = await testimonialRepository.findById(id);
    if (!testimonial) throw ApiError.notFound("Testimonial not found");
    return testimonial;
  },

  async create(input: CreateTestimonialInput) {
    return testimonialRepository.create(input);
  },

  async update(id: string, input: UpdateTestimonialInput) {
    await this.getById(id);
    return testimonialRepository.update(id, input);
  },

  async remove(id: string) {
    await this.getById(id);
    return testimonialRepository.remove(id);
  },
};
