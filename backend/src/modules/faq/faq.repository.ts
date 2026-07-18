import { asc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { faqItems } from "../../db/schema";
import type { CreateFaqInput, UpdateFaqInput, FaqSegment } from "./faq.validators";

export const faqRepository = {
  /** Storefront: active items only, ordered by segment then sortOrder. */
  findActive() {
    return db
      .select({
        id: faqItems.id,
        segment: faqItems.segment,
        question: faqItems.question,
        answer: faqItems.answer,
        sortOrder: faqItems.sortOrder,
      })
      .from(faqItems)
      .where(eq(faqItems.isActive, true))
      .orderBy(asc(faqItems.segment), asc(faqItems.sortOrder));
  },

  /** Admin: every item, ordered by segment then sortOrder. */
  findAll() {
    return db.select().from(faqItems).orderBy(asc(faqItems.segment), asc(faqItems.sortOrder));
  },

  findById(id: string) {
    return db.query.faqItems.findFirst({ where: eq(faqItems.id, id) });
  },

  /** Highest sortOrder within a segment, or -1 when the segment is empty. */
  async maxSortOrder(segment: FaqSegment) {
    const [row] = await db
      .select({ max: sql<number>`coalesce(max(${faqItems.sortOrder}), -1)::int` })
      .from(faqItems)
      .where(eq(faqItems.segment, segment));
    return row.max;
  },

  create(values: CreateFaqInput & { sortOrder: number }) {
    return db.insert(faqItems).values(values).returning().then((rows) => rows[0]);
  },

  update(id: string, values: UpdateFaqInput) {
    return db
      .update(faqItems)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(faqItems.id, id))
      .returning()
      .then((rows) => rows[0]);
  },

  remove(id: string) {
    return db.delete(faqItems).where(eq(faqItems.id, id)).returning().then((rows) => rows[0]);
  },

  /** Set each id's sortOrder to its index in `ids`, in one transaction. */
  reorder(ids: string[]) {
    return db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx.update(faqItems).set({ sortOrder: i }).where(eq(faqItems.id, ids[i]));
      }
    });
  },
};
