import { db } from "../client";
import { products, productCategories, productImages, categories } from "../schema";
import { productsData } from "./data/products";
import { shortDescriptionsBySlug } from "./data/short-descriptions";

export async function seedProducts() {
  const existing = await db.select({ id: products.id }).from(products).limit(1);
  if (existing.length > 0) {
    console.log("Products already seeded, skipping.");
    return;
  }

  const allCategories = await db.select().from(categories);
  const categoryIdBySlug = new Map(allCategories.map((c) => [c.slug, c.id]));

  for (const productSeed of productsData) {
    const [product] = await db
      .insert(products)
      .values({
        title: productSeed.title,
        slug: productSeed.slug,
        basePrice: productSeed.basePrice,
        discountPrice: productSeed.discountPrice,
        stock: productSeed.stock,
        shortDescription: shortDescriptionsBySlug[productSeed.slug] ?? null,
        whoIsItBestFor: productSeed.whoIsItBestFor,
        ingredients: productSeed.ingredients,
        usageInstructions: productSeed.usageInstructions,
        additionInformation: productSeed.additionInformation,
        status: productSeed.status,
      })
      .returning();

    const categoryIds = productSeed.categorySlugs
      .map((slug) => categoryIdBySlug.get(slug))
      .filter((id): id is string => Boolean(id));

    if (categoryIds.length > 0) {
      await db
        .insert(productCategories)
        .values(categoryIds.map((categoryId) => ({ productId: product.id, categoryId })));
    }

    if (productSeed.images.length > 0) {
      await db
        .insert(productImages)
        .values(productSeed.images.map((image) => ({ ...image, productId: product.id })));
    }
  }

  console.log(`Seeded ${productsData.length} products.`);
}
