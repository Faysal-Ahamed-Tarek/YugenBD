import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { deliverySettings } from "../../db/schema";
import type { UpdateDeliverySettingsInput } from "./delivery.validators";

export const deliveryRepository = {
  /** The current settings row, or null before an admin has ever saved one. */
  async getCurrent() {
    const rows = await db
      .select()
      .from(deliverySettings)
      .orderBy(desc(deliverySettings.updatedAt))
      .limit(1);
    return rows[0] ?? null;
  },

  /** Update the existing row in place, or create the first one. */
  async upsert(input: UpdateDeliverySettingsInput) {
    const values = {
      freeDeliveryThreshold: input.freeDeliveryThreshold.toFixed(2),
      alwaysFree: input.alwaysFree,
    };
    const current = await this.getCurrent();
    if (current) {
      const [updated] = await db
        .update(deliverySettings)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(deliverySettings.id, current.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(deliverySettings).values(values).returning();
    return created;
  },
};
