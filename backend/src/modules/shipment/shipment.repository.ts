import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { shipmentSettings } from "../../db/schema";

export const shipmentRepository = {
  /** The current shipment date row, or null if the admin hasn't set one yet. */
  async getCurrent() {
    const rows = await db
      .select()
      .from(shipmentSettings)
      .orderBy(desc(shipmentSettings.updatedAt))
      .limit(1);
    return rows[0] ?? null;
  },

  /** Update the existing row in place, or create the first one. */
  async upsert(expectedDate: string) {
    const current = await this.getCurrent();
    if (current) {
      const [updated] = await db
        .update(shipmentSettings)
        .set({ expectedDate, updatedAt: new Date() })
        .where(eq(shipmentSettings.id, current.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(shipmentSettings).values({ expectedDate }).returning();
    return created;
  },
};
