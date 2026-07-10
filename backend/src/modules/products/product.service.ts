import { eq, inArray } from "drizzle-orm";
import { db } from "../../db/client";
import { categories, productImages, products } from "../../db/schema";
import { ApiError } from "../../utils/ApiError";
import { generateUniqueSlug } from "../../utils/slug";
import { productRepository } from "./product.repository";
import { deriveEffective } from "./product.pricing";
import type { CreateProductInput, ListProductsQuery, UpdateProductInput } from "./product.validators";

async function assertCategoriesExist(categoryIds: string[]) {
  const found = await db
    .select({ id: categories.id })
    .from(categories)
    .where(inArray(categories.id, categoryIds));

  if (found.length !== categoryIds.length) {
    const foundIds = new Set(found.map((c) => c.id));
    const missing = categoryIds.filter((id) => !foundIds.has(id));
    throw ApiError.badRequest("One or more categoryIds do not exist", { missing });
  }
}

function toMoney(value: number) {
  return value.toFixed(2);
}

type DetailRow = NonNullable<Awaited<ReturnType<typeof productRepository.findBySlug>>>;

/** Flatten the productCategories/productConcerns join rows into plain
 *  arrays, matching the shape the list endpoint returns. */
function normalizeDetail(product: DetailRow) {
  const { productCategories: catJoins, productConcerns: conJoins, ...rest } = product;
  return {
    ...rest,
    // Effective stock/price account for weight variants (see product.pricing).
    ...deriveEffective(rest, rest.weights),
    categories: catJoins.map((join) => ({
      id: join.category.id,
      name: join.category.name,
      slug: join.category.slug,
    })),
    concerns: conJoins.map((join) => ({
      id: join.concern.id,
      title: join.concern.title,
      slug: join.concern.slug,
    })),
  };
}

export const productService = {
  async list(query: ListProductsQuery, isAdmin: boolean) {
    const effectiveQuery = isAdmin ? query : { ...query, status: "published" as const };
    const { rows, total } = await productRepository.findMany(effectiveQuery);
    return {
      items: rows,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasMore: query.page * query.limit < total,
      },
    };
  },

  async getById(id: string, isAdmin: boolean) {
    const product = await productRepository.findById(id);
    if (!product || (!isAdmin && product.status !== "published")) {
      throw ApiError.notFound("Product not found");
    }
    return normalizeDetail(product);
  },

  async getBySlug(slug: string, isAdmin: boolean) {
    const product = await productRepository.findBySlug(slug);
    if (!product || (!isAdmin && product.status !== "published")) {
      throw ApiError.notFound("Product not found");
    }
    return normalizeDetail(product);
  },

  async create(input: CreateProductInput) {
    await assertCategoriesExist(input.categoryIds);

    const slug = await generateUniqueSlug(products, products.slug, input.title);

    if (input.images.filter((img) => img.isMain).length > 1) {
      throw ApiError.badRequest("Only one image can be marked as main");
    }

    const product = await productRepository.create(
      {
        title: input.title,
        slug,
        basePrice: toMoney(input.basePrice),
        discountPrice: input.discountPrice != null ? toMoney(input.discountPrice) : null,
        stock: input.stock,
        shortDescription: input.shortDescription,
        whoIsItBestFor: input.whoIsItBestFor,
        ingredients: input.ingredients,
        usageInstructions: input.usageInstructions,
        additionInformation: input.additionInformation,
        status: input.status,
      },
      input.categoryIds,
      input.concernIds,
      input.images,
      input.weights
    );

    return productRepository.findById(product.id);
  },

  async update(id: string, input: UpdateProductInput) {
    const existing = await productRepository.findRawById(id);
    if (!existing) throw ApiError.notFound("Product not found");

    if (input.categoryIds) {
      await assertCategoriesExist(input.categoryIds);
    }

    // Only regenerate the slug when the title actually changes, keeping
    // existing product URLs stable on unrelated edits.
    const slug =
      input.title && input.title !== existing.title
        ? await generateUniqueSlug(products, products.slug, input.title, {
            idColumn: products.id,
            excludeId: id,
          })
        : undefined;

    const basePrice = input.basePrice != null ? input.basePrice : Number(existing.basePrice);
    const discountPrice =
      input.discountPrice !== undefined
        ? input.discountPrice
        : existing.discountPrice != null
          ? Number(existing.discountPrice)
          : null;

    if (discountPrice != null && discountPrice >= basePrice) {
      throw ApiError.badRequest("discountPrice must be less than basePrice");
    }

    await productRepository.update(
      id,
      {
        ...(input.title ? { title: input.title } : {}),
        ...(slug ? { slug } : {}),
        ...(input.basePrice != null ? { basePrice: toMoney(input.basePrice) } : {}),
        ...(input.discountPrice !== undefined
          ? { discountPrice: input.discountPrice != null ? toMoney(input.discountPrice) : null }
          : {}),
        ...(input.stock != null ? { stock: input.stock } : {}),
        ...(input.shortDescription !== undefined ? { shortDescription: input.shortDescription } : {}),
        ...(input.whoIsItBestFor !== undefined ? { whoIsItBestFor: input.whoIsItBestFor } : {}),
        ...(input.ingredients !== undefined ? { ingredients: input.ingredients } : {}),
        ...(input.usageInstructions !== undefined
          ? { usageInstructions: input.usageInstructions }
          : {}),
        ...(input.additionInformation !== undefined
          ? { additionInformation: input.additionInformation }
          : {}),
        ...(input.status ? { status: input.status } : {}),
      },
      input.categoryIds,
      input.concernIds,
      input.weights
    );

    return productRepository.findById(id);
  },

  async remove(id: string) {
    const existing = await productRepository.findRawById(id);
    if (!existing) throw ApiError.notFound("Product not found");

    // Preserve order history: block hard-delete if any order references this
    // product. Setting status to 'draft' hides it from the storefront instead.
    const orderRefs = await productRepository.countOrderReferences(id);
    if (orderRefs > 0) {
      throw ApiError.conflict(
        `This product appears in ${orderRefs} order${orderRefs === 1 ? "" : "s"} and can't be deleted. Set its status to "draft" to hide it from the store instead.`
      );
    }

    await productRepository.remove(id);
  },

  async addImages(productId: string, images: Array<{ imageUrl: string; isMain: boolean; sortOrder: number }>) {
    const existing = await productRepository.findRawById(productId);
    if (!existing) throw ApiError.notFound("Product not found");

    if (images.filter((img) => img.isMain).length > 1) {
      throw ApiError.badRequest("Only one image can be marked as main");
    }

    if (images.some((img) => img.isMain)) {
      await db
        .update(productImages)
        .set({ isMain: false })
        .where(eq(productImages.productId, productId));
    }

    return productRepository.addImages(productId, images);
  },

  async setMainImage(productId: string, imageId: string) {
    const image = await productRepository.findImageById(imageId);
    if (!image || image.productId !== productId) {
      throw ApiError.notFound("Product image not found");
    }
    return productRepository.setMainImage(productId, imageId);
  },

  async removeImage(productId: string, imageId: string) {
    const image = await productRepository.findImageById(imageId);
    if (!image || image.productId !== productId) {
      throw ApiError.notFound("Product image not found");
    }
    return productRepository.removeImage(imageId);
  },

  async reorderImages(productId: string, imageIds: string[]) {
    const product = await productRepository.findById(productId);
    if (!product) throw ApiError.notFound("Product not found");

    const ownIds = new Set(product.images.map((img) => img.id));
    if (imageIds.length !== ownIds.size || imageIds.some((id) => !ownIds.has(id))) {
      throw ApiError.badRequest("imageIds must list exactly this product's images");
    }

    await productRepository.reorderImages(imageIds);
    return productRepository.findById(productId);
  },
};
