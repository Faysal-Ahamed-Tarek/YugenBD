import { pgTable, uuid, varchar, timestamp, uniqueIndex, index, type AnyPgColumn } from "drizzle-orm/pg-core";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 150 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    // Self-referencing parent. NULL = top-level category; set = a subcategory
    // of that parent. Nesting is capped at ONE level at the service layer (a
    // parent can't itself have a parent). ON DELETE RESTRICT blocks deleting a
    // category that still has children — consistent with product-in-use deletes.
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("categories_slug_idx").on(table.slug),
    parentIdx: index("categories_parent_id_idx").on(table.parentId),
  })
);
