import { eq, ilike, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { categories, productCategories } from "../../db/schema";

type CategoryValues = { name?: string; slug?: string; imageUrl?: string | null };

export const categoryRepository = {
  findAll(q?: string) {
    const where = q ? ilike(categories.name, `%${q}%`) : undefined;
    return db.select().from(categories).where(where).orderBy(categories.name);
  },

  async countProductLinks(categoryId: string) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productCategories)
      .where(eq(productCategories.categoryId, categoryId));
    return count;
  },

  findById(id: string) {
    return db.query.categories.findFirst({ where: eq(categories.id, id) });
  },

  findBySlug(slug: string) {
    return db.query.categories.findFirst({ where: eq(categories.slug, slug) });
  },

  create(values: { name: string; slug: string; imageUrl?: string | null }) {
    return db.insert(categories).values(values).returning().then((rows) => rows[0]);
  },

  update(id: string, values: CategoryValues) {
    return db
      .update(categories)
      .set(values)
      .where(eq(categories.id, id))
      .returning()
      .then((rows) => rows[0]);
  },

  remove(id: string) {
    return db.delete(categories).where(eq(categories.id, id)).returning().then((rows) => rows[0]);
  },
};
