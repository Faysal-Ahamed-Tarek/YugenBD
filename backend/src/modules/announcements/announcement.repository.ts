import { asc, eq, sql } from "drizzle-orm";
import { db } from "../../db/client";
import { announcements } from "../../db/schema";
import type { CreateAnnouncementInput, UpdateAnnouncementInput } from "./announcement.validators";

export const announcementRepository = {
  /** Storefront: active announcements only, ordered. */
  findActive() {
    return db
      .select({ id: announcements.id, text: announcements.text, sortOrder: announcements.sortOrder })
      .from(announcements)
      .where(eq(announcements.isActive, true))
      .orderBy(asc(announcements.sortOrder));
  },

  /** Admin: every announcement, ordered. */
  findAll() {
    return db.select().from(announcements).orderBy(asc(announcements.sortOrder));
  },

  findById(id: string) {
    return db.query.announcements.findFirst({ where: eq(announcements.id, id) });
  },

  async maxSortOrder() {
    const [row] = await db
      .select({ max: sql<number>`coalesce(max(${announcements.sortOrder}), -1)::int` })
      .from(announcements);
    return row.max;
  },

  create(values: CreateAnnouncementInput & { sortOrder: number }) {
    return db.insert(announcements).values(values).returning().then((rows) => rows[0]);
  },

  update(id: string, values: UpdateAnnouncementInput) {
    return db
      .update(announcements)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(announcements.id, id))
      .returning()
      .then((rows) => rows[0]);
  },

  remove(id: string) {
    return db.delete(announcements).where(eq(announcements.id, id)).returning().then((rows) => rows[0]);
  },

  /** Set each id's sortOrder to its index in `ids`, in one transaction. */
  reorder(ids: string[]) {
    return db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx.update(announcements).set({ sortOrder: i }).where(eq(announcements.id, ids[i]));
      }
    });
  },
};
