import { ApiError } from "../../utils/ApiError";
import { heroSlideRepository } from "./hero-slide.repository";
import type { CreateHeroSlideInput, UpdateHeroSlideInput } from "./hero-slide.validators";

export const heroSlideService = {
  /** Storefront: active slides only, ordered. */
  async listActive() {
    return heroSlideRepository.findActive();
  },

  /** Admin: every slide, ordered. */
  async listAll() {
    return heroSlideRepository.findAll();
  },

  async getById(id: string) {
    const slide = await heroSlideRepository.findById(id);
    if (!slide) throw ApiError.notFound("Hero slide not found");
    return slide;
  },

  /** New slides append to the end unless an explicit sortOrder is given. */
  async create(input: CreateHeroSlideInput) {
    const sortOrder = input.sortOrder ?? (await heroSlideRepository.maxSortOrder()) + 1;
    return heroSlideRepository.create({ ...input, sortOrder });
  },

  async update(id: string, input: UpdateHeroSlideInput) {
    await this.getById(id);
    return heroSlideRepository.update(id, input);
  },

  async remove(id: string) {
    await this.getById(id);
    return heroSlideRepository.remove(id);
  },

  async reorder(ids: string[]) {
    await heroSlideRepository.reorder(ids);
    return heroSlideRepository.findAll();
  },
};
