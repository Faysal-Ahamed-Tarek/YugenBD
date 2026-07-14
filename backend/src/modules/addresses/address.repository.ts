import { and, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { addresses, divisions, districts, upazilas } from "../../db/schema";

type AddressValues = {
  divisionId: string;
  districtId: string;
  upazilaId: string;
  phone: string;
  streetAddress: string;
};

export const addressRepository = {
  /** The user's default shipping address, with location names for display. */
  async findDefaultByUser(userId: string) {
    const [row] = await db
      .select({
        id: addresses.id,
        divisionId: addresses.divisionId,
        districtId: addresses.districtId,
        upazilaId: addresses.upazilaId,
        phone: addresses.phone,
        addressLine1: addresses.streetAddress,
        divisionName: divisions.name,
        districtName: districts.name,
        upazilaName: upazilas.name,
      })
      .from(addresses)
      .innerJoin(divisions, eq(addresses.divisionId, divisions.id))
      .innerJoin(districts, eq(addresses.districtId, districts.id))
      .innerJoin(upazilas, eq(addresses.upazilaId, upazilas.id))
      .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)))
      .limit(1);
    return row ?? null;
  },

  findDefaultId(userId: string) {
    return db
      .select({ id: addresses.id })
      .from(addresses)
      .where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true)))
      .limit(1)
      .then((rows) => rows[0]?.id ?? null);
  },

  insertDefault(userId: string, values: AddressValues) {
    return db
      .insert(addresses)
      .values({ userId, isDefault: true, label: "Shipping", ...values })
      .returning()
      .then((rows) => rows[0]);
  },

  updateById(id: string, values: AddressValues) {
    return db
      .update(addresses)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(addresses.id, id))
      .returning()
      .then((rows) => rows[0]);
  },
};
