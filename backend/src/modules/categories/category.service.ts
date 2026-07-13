import { ApiError } from "../../utils/ApiError";
import { generateUniqueSlug } from "../../utils/slug";
import { categories } from "../../db/schema";
import { categoryRepository } from "./category.repository";
import type { CreateCategoryInput, UpdateCategoryInput } from "./category.validators";

export const categoryService = {
  /** `flat` returns every category as a flat list; otherwise the nested tree. */
  async list(opts: { q?: string; flat?: boolean } = {}) {
    if (opts.flat) return categoryRepository.findAll(opts.q);
    return categoryRepository.findTree();
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

  /**
   * Validates a candidate parent for the one-level-deep rule: it must exist and
   * be top-level (its own parentId must be null). `selfId` guards against a
   * category being made its own parent on update. Returns nothing on success.
   */
  async assertValidParent(parentId: string, selfId?: string) {
    if (selfId && parentId === selfId) {
      throw ApiError.badRequest("A category cannot be its own parent.");
    }
    const parent = await categoryRepository.findById(parentId);
    if (!parent) throw ApiError.badRequest("Parent category not found.");
    if (parent.parentId !== null) {
      throw ApiError.badRequest("Only one level of nesting is allowed — the chosen parent is itself a subcategory.");
    }
  },

  async create(input: CreateCategoryInput) {
    if (input.parentId) await this.assertValidParent(input.parentId);
    const slug = await generateUniqueSlug(categories, categories.slug, input.name);
    return categoryRepository.create({
      name: input.name,
      slug,
      parentId: input.parentId ?? null,
    });
  },

  async update(id: string, input: UpdateCategoryInput) {
    const existing = await this.getById(id);

    // Parent change: validate the target parent, and forbid demoting a category
    // that already has children into a subcategory (would create a 2nd level).
    if (input.parentId !== undefined && input.parentId !== null) {
      await this.assertValidParent(input.parentId, id);
      const childCount = await categoryRepository.countChildren(id);
      if (childCount > 0) {
        throw ApiError.badRequest(
          "This category has subcategories, so it can't become a subcategory itself. Reassign its children first."
        );
      }
    }

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
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    });
    return updated;
  },

  async remove(id: string) {
    await this.getById(id);

    const children = await categoryRepository.countChildren(id);
    if (children > 0) {
      throw ApiError.conflict(
        `This category has ${children} subcategor${children === 1 ? "y" : "ies"}. Delete or reassign them first.`
      );
    }

    const inUse = await categoryRepository.countProductLinks(id);
    if (inUse > 0) {
      throw ApiError.conflict(
        `This category is used by ${inUse} product${inUse === 1 ? "" : "s"}. Remove it from those products first.`
      );
    }
    return categoryRepository.remove(id);
  },
};
