import { pgTable, uuid, varchar, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { divisions, districts, upazilas } from "./locations";

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 50 }),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => divisions.id),
    districtId: uuid("district_id")
      .notNull()
      .references(() => districts.id),
    upazilaId: uuid("upazila_id")
      .notNull()
      .references(() => upazilas.id),
    // Delivery contact number (Bangladeshi local format 01XXXXXXXXX).
    phone: varchar("phone", { length: 20 }),
    unionOrArea: varchar("union_or_area", { length: 150 }),
    postOffice: varchar("post_office", { length: 100 }),
    postalCode: varchar("postal_code", { length: 4 }),
    streetAddress: varchar("street_address", { length: 255 }).notNull(),
    landmark: varchar("landmark", { length: 150 }),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("addresses_user_id_idx").on(table.userId),
    divisionIdx: index("addresses_division_id_idx").on(table.divisionId),
    districtIdx: index("addresses_district_id_idx").on(table.districtId),
    upazilaIdx: index("addresses_upazila_id_idx").on(table.upazilaId),
  })
);
