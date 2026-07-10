import { ApiError } from "../../utils/ApiError";
import { generateUniqueSlug } from "../../utils/slug";
import { categories } from "../../db/schema";
import { categoryRepository } from "./category.repository";
import type { CreateCategoryInput, UpdateCategoryInput } from "./category.validators";

export const categoryService = {
  async list(q?: string) {
    return categoryRepository.findAll(q);
  },

  async getById(id: string) {
    const category = await categoryRepository.findById(id);
    if (!category) throw ApiError.notFound("Category not found");
    return category;
  },

  async getBySlug(slug: string) {
    const category = await categoryRepository.findBySlug(slug);
    if (!category) throw ApiError.notFound("Category not found");
    return category;
  },

  async create(input: CreateCategoryInput) {
    const slug = await generateUniqueSlug(categories, categories.slug, input.name);
    return categoryRepository.create({ name: input.name, slug, imageUrl: input.imageUrl ?? null });
  },

  async update(id: string, input: UpdateCategoryInput) {
    const existing = await this.getById(id);

    // Only regenerate the slug when the name actually changes, so unrelated
    // edits never break existing category URLs.
    const slug =
      input.name && input.name !== existing.name
        ? await generateUniqueSlug(categories, categories.slug, input.name, {
            idColumn: categories.id,
            excludeId: id,
          })
        : undefined;

    const updated = await categoryRepository.update(id, {
      ...(input.name ? { name: input.name } : {}),
      ...(slug ? { slug } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
    });
    return updated;
  },

  async remove(id: string) {
    await this.getById(id);
    const inUse = await categoryRepository.countProductLinks(id);
    if (inUse > 0) {
      throw ApiError.conflict(
        `This category is used by ${inUse} product${inUse === 1 ? "" : "s"}. Remove it from those products first.`
      );
    }
    return categoryRepository.remove(id);
  },
};
