/**
 * Reference Drizzle query patterns for this schema. Not wired into the API —
 * copy the pattern into a service/repository when the corresponding feature
 * (auth, cart/orders) is built.
 */
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "./client";
import { users, addresses, districts, upazilas } from "./schema";

/** Create a user together with their first address in one transaction. */
export async function createUserWithAddress(input: {
  fullName: string;
  phone: string;
  password: string;
  divisionId: string;
  districtId: string;
  upazilaId: string;
  streetAddress: string;
}) {
  const passwordHash = await bcrypt.hash(input.password, 10);

  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        fullName: input.fullName,
        phone: input.phone,
        passwordHash,
      })
      .returning();

    const [address] = await tx
      .insert(addresses)
      .values({
        userId: user.id,
        divisionId: input.divisionId,
        districtId: input.districtId,
        upazilaId: input.upazilaId,
        streetAddress: input.streetAddress,
        isDefault: true,
      })
      .returning();

    return { user, address };
  });
}

/** Fetch a user with all of their saved addresses (one-to-many). */
export function getUserWithAddresses(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { addresses: true },
  });
}

/** Cascading dropdown: districts that belong to a given division. */
export function getDistrictsByDivision(divisionId: string) {
  return db.select().from(districts).where(eq(districts.divisionId, divisionId));
}

/** Cascading dropdown: upazilas that belong to a given district. */
export function getUpazilasByDistrict(districtId: string) {
  return db.select().from(upazilas).where(eq(upazilas.districtId, districtId));
}

/**
 * Conceptual only — the orders/order_items tables are phase-3 work per
 * Claude.md's build order and aren't part of this schema yet. The intended
 * pattern: snapshot the chosen address as a JSONB column on the order row
 * (e.g. `shippingAddress: jsonb("shipping_address")`) rather than a live FK,
 * so a later edit/delete of the user's address never rewrites history on a
 * past order. Sketch:
 *
 *   const [order] = await tx.insert(orders).values({
 *     userId,
 *     status: "pending",
 *     shippingAddress: { streetAddress, upazila, district, division, postalCode },
 *     totalAmount,
 *   }).returning();
 */
