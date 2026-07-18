import { ApiError } from "../../utils/ApiError";
import { announcementRepository } from "./announcement.repository";
import type { CreateAnnouncementInput, UpdateAnnouncementInput } from "./announcement.validators";

export const announcementService = {
  /** Storefront: active announcements only. */
  async listActive() {
    return announcementRepository.findActive();
  },

  /** Admin: every announcement. */
  async listAll() {
    return announcementRepository.findAll();
  },

  async getById(id: string) {
    const item = await announcementRepository.findById(id);
    if (!item) throw ApiError.notFound("Announcement not found");
    return item;
  },

  /** New announcements append to the end unless an explicit sortOrder is given. */
  async create(input: CreateAnnouncementInput) {
    const sortOrder = input.sortOrder ?? (await announcementRepository.maxSortOrder()) + 1;
    return announcementRepository.create({ ...input, sortOrder });
  },

  async update(id: string, input: UpdateAnnouncementInput) {
    await this.getById(id);
    return announcementRepository.update(id, input);
  },

  async remove(id: string) {
    await this.getById(id);
    return announcementRepository.remove(id);
  },

  async reorder(ids: string[]) {
    await announcementRepository.reorder(ids);
    return announcementRepository.findAll();
  },
};
