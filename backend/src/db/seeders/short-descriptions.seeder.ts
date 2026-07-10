import { eq, isNull } from "drizzle-orm";
import { db } from "../client";
import { products } from "../schema";
import { shortDescriptionsBySlug } from "./data/short-descriptions";

/**
 * Backfill seeder: fills short_description for products that don't have one
 * yet. Safe to run repeatedly — already-populated rows are left untouched.
 */
export async function seedShortDescriptions() {
  const missing = await db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .where(isNull(products.shortDescription));

  if (missing.length === 0) {
    console.log("Short descriptions already seeded, skipping.");
    return;
  }

  let updated = 0;
  for (const row of missing) {
    const shortDescription = shortDescriptionsBySlug[row.slug];
    if (!shortDescription) continue;
    await db.update(products).set({ shortDescription }).where(eq(products.id, row.id));
    updated += 1;
  }
  console.log(`Backfilled short descriptions for ${updated} products.`);
}
