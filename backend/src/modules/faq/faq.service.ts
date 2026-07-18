import { ApiError } from "../../utils/ApiError";
import { faqRepository } from "./faq.repository";
import type { CreateFaqInput, UpdateFaqInput } from "./faq.validators";

export const faqService = {
  /** Storefront: active items only. */
  async listActive() {
    return faqRepository.findActive();
  },

  /** Admin: every item. */
  async listAll() {
    return faqRepository.findAll();
  },

  async getById(id: string) {
    const item = await faqRepository.findById(id);
    if (!item) throw ApiError.notFound("FAQ item not found");
    return item;
  },

  /** New items append to the end of their segment unless a sortOrder is given. */
  async create(input: CreateFaqInput) {
    const sortOrder = input.sortOrder ?? (await faqRepository.maxSortOrder(input.segment)) + 1;
    return faqRepository.create({ ...input, sortOrder });
  },

  async update(id: string, input: UpdateFaqInput) {
    await this.getById(id);
    return faqRepository.update(id, input);
  },

  async remove(id: string) {
    await this.getById(id);
    return faqRepository.remove(id);
  },

  async reorder(ids: string[]) {
    await faqRepository.reorder(ids);
    return faqRepository.findAll();
  },
};
