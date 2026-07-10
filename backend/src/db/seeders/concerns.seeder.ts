import { inArray } from "drizzle-orm";
import { db } from "../client";
import { concerns, productConcerns, products } from "../schema";
import { concernsData } from "./data/concerns";

export async function seedConcerns() {
  const existing = await db.select({ id: concerns.id }).from(concerns).limit(1);
  if (existing.length > 0) {
    console.log("Concerns already seeded, skipping.");
    return;
  }

  const allSlugs = [...new Set(concernsData.flatMap((c) => c.productSlugs))];
  const rows = await db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .where(inArray(products.slug, allSlugs));
  const productIdBySlug = new Map(rows.map((row) => [row.slug, row.id]));

  for (const concernSeed of concernsData) {
    const [concern] = await db
      .insert(concerns)
      .values({
        title: concernSeed.title,
        slug: concernSeed.slug,
        imageUrl: concernSeed.imageUrl,
        sortOrder: concernSeed.sortOrder,
      })
      .returning();

    const productIds = concernSeed.productSlugs
      .map((slug) => productIdBySlug.get(slug))
      .filter((id): id is string => Boolean(id));

    if (productIds.length > 0) {
      await db
        .insert(productConcerns)
        .values(productIds.map((productId) => ({ productId, concernId: concern.id })));
    }
  }

  console.log(`Seeded ${concernsData.length} concerns with product links.`);
}
