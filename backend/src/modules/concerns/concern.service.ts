import { ApiError } from "../../utils/ApiError";
import { generateUniqueSlug } from "../../utils/slug";
import { concerns } from "../../db/schema";
import { concernRepository } from "./concern.repository";
import type { CreateConcernInput, UpdateConcernInput } from "./concern.validators";

export const concernService = {
  /**
   * Concern header info for its listing page. The products themselves are
   * fetched via GET /products?concernSlug=… so we don't duplicate the
   * products repository's filtering/pagination here.
   */
  async getBySlug(slug: string) {
    const concern = await concernRepository.findBySlug(slug);
    if (!concern) throw ApiError.notFound("Concern not found");
    return {
      id: concern.id,
      title: concern.title,
      slug: concern.slug,
      imageUrl: concern.imageUrl,
      sortOrder: concern.sortOrder,
      createdAt: concern.createdAt,
    };
  },

  /**
   * Public list for the homepage: sortOrder-sorted concerns, each carrying
   * ONE representative product (the first published linked product) whose
   * slug the frontend card links to. Concerns are returned even when no
   * published product is linked (product: null) so the UI can decide.
   */
  async list(q?: string) {
    const rows = await concernRepository.findAllWithProducts(q);

    return rows.map((concern) => {
      const representative = concern.productConcerns
        .map((join) => join.product)
        .find((product) => product.status === "published");

      return {
        id: concern.id,
        title: concern.title,
        slug: concern.slug,
        imageUrl: concern.imageUrl,
        sortOrder: concern.sortOrder,
        createdAt: concern.createdAt,
        product: representative
          ? {
              title: representative.title,
              slug: representative.slug,
              mainImage: representative.images[0] ?? null,
            }
          : null,
      };
    });
  },

  async getById(id: string) {
    const concern = await concernRepository.findById(id);
    if (!concern) throw ApiError.notFound("Concern not found");
    return concern;
  },

  async create(input: CreateConcernInput) {
    const slug = await generateUniqueSlug(concerns, concerns.slug, input.title);
    return concernRepository.create({ ...input, slug });
  },

  async update(id: string, input: UpdateConcernInput) {
    const existing = await this.getById(id);
    const slug =
      input.title && input.title !== existing.title
        ? await generateUniqueSlug(concerns, concerns.slug, input.title, {
            idColumn: concerns.id,
            excludeId: id,
          })
        : undefined;

    return concernRepository.update(id, {
      ...(input.title ? { title: input.title } : {}),
      ...(slug ? { slug } : {}),
      ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    });
  },

  async remove(id: string) {
    await this.getById(id);
    const inUse = await concernRepository.countProductLinks(id);
    if (inUse > 0) {
      throw ApiError.conflict(
        `This concern is linked to ${inUse} product${inUse === 1 ? "" : "s"}. Unlink them first.`
      );
    }
    return concernRepository.remove(id);
  },
};
