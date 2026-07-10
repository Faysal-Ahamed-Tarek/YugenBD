import { db } from "../client";
import { categories } from "../schema";
import { categoriesData } from "./data/categories";

export async function seedCategories() {
  const existing = await db.select({ id: categories.id }).from(categories).limit(1);
  if (existing.length > 0) {
    console.log("Categories already seeded, skipping.");
    return db.select().from(categories);
  }

  const inserted = await db.insert(categories).values(categoriesData).returning();
  console.log(`Seeded ${inserted.length} categories.`);
  return inserted;
}
