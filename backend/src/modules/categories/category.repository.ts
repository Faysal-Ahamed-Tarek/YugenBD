import { eq, ilike, sql, asc } from "drizzle-orm";
import { db } from "../../db/client";
import { categories, productCategories } from "../../db/schema";

type CategoryValues = { name?: string; slug?: string; parentId?: string | null };

export const categoryRepository = {
  findAll(q?: string) {
    const where = q ? ilike(categories.name, `%${q}%`) : undefined;
    return db.select().from(categories).where(where).orderBy(categories.name);
  },

  /**
   * Nested tree: top-level categories (parentId = null) each with a `children`
   * array of their subcategories. Built from a single table scan in memory —
   * no N+1. Both levels are name-sorted.
   */
  async findTree() {
    const all = await db.select().from(categories).orderBy(asc(categories.name));
    const childrenByParent = new Map<string, typeof all>();
    for (const c of all) {
      if (c.parentId) {
        const arr = childrenByParent.get(c.parentId) ?? [];
        arr.push(c);
        childrenByParent.set(c.parentId, arr);
      }
    }
    return all
      .filter((c) => c.parentId === null)
      .map((parent) => ({ ...parent, children: childrenByParent.get(parent.id) ?? [] }));
  },

  async countProductLinks(categoryId: string) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productCategories)
      .where(eq(productCategories.categoryId, categoryId));
    return count;
  },

  async countChildren(categoryId: string) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(categories)
      .where(eq(categories.parentId, categoryId));
    return count;
  },

  findById(id: string) {
    return db.query.categories.findFirst({
      where: eq(categories.id, id),
      with: { parent: true, children: true },
    });
  },

  findBySlug(slug: string) {
    return db.query.categories.findFirst({
      where: eq(categories.slug, slug),
      with: { parent: true, children: true },
    });
  },

  create(values: { name: string; slug: string; parentId?: string | null }) {
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
