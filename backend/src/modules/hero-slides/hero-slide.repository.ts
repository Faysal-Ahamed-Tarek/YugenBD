import { asc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { heroSlides } from "../../db/schema";
import type { CreateHeroSlideInput, UpdateHeroSlideInput } from "./hero-slide.validators";

export const heroSlideRepository = {
  /** Storefront: active slides only, ordered. */
  findActive() {
    return db
      .select({ id: heroSlides.id, imageUrl: heroSlides.imageUrl, sortOrder: heroSlides.sortOrder })
      .from(heroSlides)
      .where(eq(heroSlides.isActive, true))
      .orderBy(asc(heroSlides.sortOrder));
  },

  /** Admin: every slide, ordered. */
  findAll() {
    return db.select().from(heroSlides).orderBy(asc(heroSlides.sortOrder));
  },

  findById(id: string) {
    return db.query.heroSlides.findFirst({ where: eq(heroSlides.id, id) });
  },

  async maxSortOrder() {
    const [row] = await db
      .select({ max: sql<number>`coalesce(max(${heroSlides.sortOrder}), -1)::int` })
      .from(heroSlides);
    return row.max;
  },

  create(values: CreateHeroSlideInput & { sortOrder: number }) {
    return db.insert(heroSlides).values(values).returning().then((rows) => rows[0]);
  },

  update(id: string, values: UpdateHeroSlideInput) {
    return db.update(heroSlides).set(values).where(eq(heroSlides.id, id)).returning().then((rows) => rows[0]);
  },

  remove(id: string) {
    return db.delete(heroSlides).where(eq(heroSlides.id, id)).returning().then((rows) => rows[0]);
  },

  /** Set each id's sortOrder to its index in `ids`, in one transaction. */
  reorder(ids: string[]) {
    return db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx.update(heroSlides).set({ sortOrder: i }).where(eq(heroSlides.id, ids[i]));
      }
    });
  },
};
