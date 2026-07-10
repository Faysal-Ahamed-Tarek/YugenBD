import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  text,
  timestamp,
  uniqueIndex,
  index,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { productStatusEnum, weightUnitEnum } from "./enums";
import { categories } from "./categories";

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 280 }).notNull(),
    basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
    discountPrice: numeric("discount_price", { precision: 10, scale: 2 }),
    stock: integer("stock").notNull().default(0),
    shortDescription: text("short_description"),
    whoIsItBestFor: text("who_is_it_best_for"),
    ingredients: text("ingredients"),
    usageInstructions: text("usage_instructions"),
    additionInformation: text("addition_information"),
    status: productStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("products_slug_idx").on(table.slug),
    statusIdx: index("products_status_idx").on(table.status),
  })
);

export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.productId, table.categoryId] }),
    categoryIdx: index("product_categories_category_id_idx").on(table.categoryId),
  })
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    imageUrl: varchar("image_url", { length: 500 }).notNull(),
    isMain: boolean("is_main").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => ({
    productIdx: index("product_images_product_id_idx").on(table.productId),
  })
);

// Weight/size variants (e.g. 50ml, 100g). Each row is now a fully sellable
// variant carrying its OWN stock + price. When a product has any weight rows,
// the product-level `stock` and `basePrice`/`discountPrice` are IGNORED for
// derivation — effective stock = SUM(weights.stock) and the storefront price
// is the lowest weight price (see product.service getEffectiveStockAndPrice).
// `price` is nullable only so legacy rows survive the migration; the admin
// form requires it for every weight going forward, falling back to the
// product base price when absent.
export const productWeights = pgTable(
  "product_weights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    value: numeric("value", { precision: 10, scale: 2 }).notNull(),
    unit: weightUnitEnum("unit").notNull(),
    stock: integer("stock").notNull().default(0),
    price: numeric("price", { precision: 10, scale: 2 }),
    sortOrder: integer("sort_order").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
  },
  (table) => ({
    productIdx: index("product_weights_product_id_idx").on(table.productId),
  })
);
