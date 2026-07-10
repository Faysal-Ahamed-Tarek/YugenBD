import { pgTable, uuid, varchar, boolean, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { userRoleEnum } from "./enums";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: varchar("full_name", { length: 150 }).notNull(),
    email: varchar("email", { length: 255 }),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    phoneVerified: boolean("phone_verified").notNull().default(false),
    role: userRoleEnum("role").notNull().default("customer"),
    isActive: boolean("is_active").notNull().default(true),
    // Bumped on password change to invalidate previously issued refresh tokens.
    tokenVersion: integer("token_version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
    phoneIdx: uniqueIndex("users_phone_idx").on(table.phone),
  })
);
