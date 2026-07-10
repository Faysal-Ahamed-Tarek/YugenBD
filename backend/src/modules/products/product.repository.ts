import { and, asc, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm";
import { db } from "../../db/client";
import {
  products,
  productCategories,
  productImages,
  productWeights,
  categories,
  productConcerns,
  concerns,
  orderItems,
} from "../../db/schema";

type WeightInput = {
  value: number;
  unit: "ml" | "g" | "l" | "kg" | "pcs";
  stock: number;
  price: number | null;
  isDefault: boolean;
};
import type { ListProductsQuery } from "./product.validators";
import { deriveEffective } from "./product.pricing";

type ProductRow = typeof products.$inferSelect;

function buildFilters(
  query: Pick<
    ListProductsQuery,
    "status" | "categoryId" | "categorySlug" | "concernSlug" | "search" | "q" | "minPrice" | "maxPrice"
  >
) {
  const conditions = [];

  if (query.status) {
    conditions.push(eq(products.status, query.status));
  }

  if (query.categoryId) {
    conditions.push(
      inArray(
        products.id,
        db
          .select({ id: productCategories.productId })
          .from(productCategories)
          .where(eq(productCategories.categoryId, query.categoryId))
      )
    );
  }

  if (query.categorySlug) {
    conditions.push(
      inArray(
        products.id,
        db
          .select({ id: productCategories.productId })
          .from(productCategories)
          .innerJoin(categories, eq(productCategories.categoryId, categories.id))
          .where(eq(categories.slug, query.categorySlug))
      )
    );
  }

  if (query.concernSlug) {
    conditions.push(
      inArray(
        products.id,
        db
          .select({ id: productConcerns.productId })
          .from(productConcerns)
          .innerJoin(concerns, eq(productConcerns.concernId, concerns.id))
          .where(eq(concerns.slug, query.concernSlug))
      )
    );
  }

  const titleQuery = query.q ?? query.search;
  if (titleQuery) {
    conditions.push(ilike(products.title, `%${titleQuery}%`));
  }

  // Filter on the effective (paid) price: discountPrice when set, else basePrice.
  const effectivePrice = sql`coalesce(${products.discountPrice}, ${products.basePrice})`;

  if (query.minPrice != null) {
    conditions.push(gte(effectivePrice, query.minPrice.toFixed(2)));
  }

  if (query.maxPrice != null) {
    conditions.push(lte(effectivePrice, query.maxPrice.toFixed(2)));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function sortColumn(sort: ListProductsQuery["sort"]) {
  switch (sort) {
    case "price_asc":
      return asc(products.basePrice);
    case "price_desc":
      return desc(products.basePrice);
    case "title_asc":
      return asc(products.title);
    case "newest":
    default:
      return desc(products.createdAt);
  }
}

async function attachRelations(rows: ProductRow[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);

  const [images, categoryLinks, weightRows] = await Promise.all([
    db
      .select()
      .from(productImages)
      .where(and(inArray(productImages.productId, ids), eq(productImages.isMain, true))),
    db
      .select({
        productId: productCategories.productId,
        categoryId: categories.id,
        categoryName: categories.name,
        categorySlug: categories.slug,
      })
      .from(productCategories)
      .innerJoin(categories, eq(productCategories.categoryId, categories.id))
      .where(inArray(productCategories.productId, ids)),
    db
      .select({ productId: productWeights.productId, stock: productWeights.stock, price: productWeights.price })
      .from(productWeights)
      .where(inArray(productWeights.productId, ids)),
  ]);

  const imageByProduct = new Map(images.map((img) => [img.productId, img]));
  const categoriesByProduct = new Map<string, Array<{ id: string; name: string; slug: string }>>();
  for (const link of categoryLinks) {
    const list = categoriesByProduct.get(link.productId) ?? [];
    list.push({ id: link.categoryId, name: link.categoryName, slug: link.categorySlug });
    categoriesByProduct.set(link.productId, list);
  }
  const weightsByProduct = new Map<string, Array<{ stock: number; price: string | null }>>();
  for (const w of weightRows) {
    const list = weightsByProduct.get(w.productId) ?? [];
    list.push({ stock: w.stock, price: w.price });
    weightsByProduct.set(w.productId, list);
  }

  return rows.map((row) => ({
    ...row,
    mainImage: imageByProduct.get(row.id) ?? null,
    categories: categoriesByProduct.get(row.id) ?? [],
    // Effective stock/price account for weight variants (see product.pricing).
    ...deriveEffective(row, weightsByProduct.get(row.id)),
  }));
}

export const productRepository = {
  async findMany(query: ListProductsQuery) {
    const where = buildFilters(query);
    const offset = (query.page - 1) * query.limit;

    const [rows, [{ count }]] = await Promise.all([
      db
        .select()
        .from(products)
        .where(where)
        .orderBy(sortColumn(query.sort))
        .limit(query.limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(products).where(where),
    ]);

    const withRelations = await attachRelations(rows);

    return { rows: withRelations, total: count };
  },

  findById(id: string) {
    return db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        images: { orderBy: asc(productImages.sortOrder) },
        weights: { orderBy: asc(productWeights.sortOrder) },
        productCategories: { with: { category: true } },
        productConcerns: { with: { concern: true } },
      },
    });
  },

  findBySlug(slug: string) {
    return db.query.products.findFirst({
      where: eq(products.slug, slug),
      with: {
        images: { orderBy: asc(productImages.sortOrder) },
        weights: { orderBy: asc(productWeights.sortOrder) },
        productCategories: { with: { category: true } },
        productConcerns: { with: { concern: true } },
      },
    });
  },

  findRawById(id: string) {
    return db.query.products.findFirst({ where: eq(products.id, id) });
  },

  findRawBySlug(slug: string) {
    return db.query.products.findFirst({ where: eq(products.slug, slug) });
  },

  async create(
    values: typeof products.$inferInsert,
    categoryIds: string[],
    concernIds: string[],
    images: Array<{ imageUrl: string; isMain: boolean; sortOrder: number }>,
    weights: WeightInput[]
  ) {
    return db.transaction(async (tx) => {
      const [product] = await tx.insert(products).values(values).returning();

      await tx
        .insert(productCategories)
        .values(categoryIds.map((categoryId) => ({ productId: product.id, categoryId })));

      if (concernIds.length > 0) {
        await tx
          .insert(productConcerns)
          .values(concernIds.map((concernId) => ({ productId: product.id, concernId })));
      }

      if (images.length > 0) {
        await tx.insert(productImages).values(
          images.map((image) => ({ ...image, productId: product.id }))
        );
      }

      if (weights.length > 0) {
        await tx.insert(productWeights).values(
          weights.map((w, i) => ({
            productId: product.id,
            value: w.value.toString(),
            unit: w.unit,
            stock: w.stock,
            price: w.price != null ? w.price.toFixed(2) : null,
            isDefault: w.isDefault,
            sortOrder: i,
          }))
        );
      }

      return product;
    });
  },

  async update(
    id: string,
    values: Partial<typeof products.$inferInsert>,
    categoryIds?: string[],
    concernIds?: string[],
    weights?: WeightInput[]
  ) {
    return db.transaction(async (tx) => {
      const [product] = await tx
        .update(products)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();

      if (categoryIds) {
        await tx.delete(productCategories).where(eq(productCategories.productId, id));
        await tx
          .insert(productCategories)
          .values(categoryIds.map((categoryId) => ({ productId: id, categoryId })));
      }

      if (concernIds) {
        await tx.delete(productConcerns).where(eq(productConcerns.productId, id));
        if (concernIds.length > 0) {
          await tx
            .insert(productConcerns)
            .values(concernIds.map((concernId) => ({ productId: id, concernId })));
        }
      }

      if (weights) {
        await tx.delete(productWeights).where(eq(productWeights.productId, id));
        if (weights.length > 0) {
          await tx.insert(productWeights).values(
            weights.map((w, i) => ({
              productId: id,
              value: w.value.toString(),
              unit: w.unit,
              stock: w.stock,
              price: w.price != null ? w.price.toFixed(2) : null,
              isDefault: w.isDefault,
              sortOrder: i,
            }))
          );
        }
      }

      return product;
    });
  },

  remove(id: string) {
    return db.delete(products).where(eq(products.id, id)).returning().then((rows) => rows[0]);
  },

  addImages(productId: string, images: Array<{ imageUrl: string; isMain: boolean; sortOrder: number }>) {
    return db
      .insert(productImages)
      .values(images.map((image) => ({ ...image, productId })))
      .returning();
  },

  async setMainImage(productId: string, imageId: string) {
    return db.transaction(async (tx) => {
      await tx
        .update(productImages)
        .set({ isMain: false })
        .where(eq(productImages.productId, productId));

      const [updated] = await tx
        .update(productImages)
        .set({ isMain: true })
        .where(eq(productImages.id, imageId))
        .returning();

      return updated;
    });
  },

  removeImage(imageId: string) {
    return db
      .delete(productImages)
      .where(eq(productImages.id, imageId))
      .returning()
      .then((rows) => rows[0]);
  },

  async reorderImages(imageIds: string[]) {
    await db.transaction(async (tx) => {
      for (let i = 0; i < imageIds.length; i++) {
        await tx.update(productImages).set({ sortOrder: i }).where(eq(productImages.id, imageIds[i]));
      }
    });
  },

  findImageById(imageId: string) {
    return db.query.productImages.findFirst({ where: eq(productImages.id, imageId) });
  },

  async countOrderReferences(productId: string) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(orderItems)
      .where(eq(orderItems.productId, productId));
    return count;
  },
};
