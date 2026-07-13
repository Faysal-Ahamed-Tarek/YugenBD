import { relations } from "drizzle-orm";
import { divisions, districts, upazilas } from "./locations";
import { users } from "./users";
import { addresses } from "./addresses";
import { categories } from "./categories";
import { products, productCategories, productImages, productWeights } from "./products";
import { reviews, reviewImages } from "./reviews";
import { concerns, productConcerns } from "./concerns";
import { orders, orderItems } from "./orders";

export const divisionsRelations = relations(divisions, ({ many }) => ({
  districts: many(districts),
  addresses: many(addresses),
}));

export const districtsRelations = relations(districts, ({ one, many }) => ({
  division: one(divisions, {
    fields: [districts.divisionId],
    references: [divisions.id],
  }),
  upazilas: many(upazilas),
  addresses: many(addresses),
}));

export const upazilasRelations = relations(upazilas, ({ one, many }) => ({
  district: one(districts, {
    fields: [upazilas.districtId],
    references: [districts.id],
  }),
  addresses: many(addresses),
}));

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  reviews: many(reviews),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
  division: one(divisions, {
    fields: [addresses.divisionId],
    references: [divisions.id],
  }),
  district: one(districts, {
    fields: [addresses.districtId],
    references: [districts.id],
  }),
  upazila: one(upazilas, {
    fields: [addresses.upazilaId],
    references: [upazilas.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  productCategories: many(productCategories),
  // Self-referencing tree (one level deep). `parent` is null for top-level
  // categories; `children` holds the subcategories of a top-level category.
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_children",
  }),
  children: many(categories, { relationName: "category_children" }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  productCategories: many(productCategories),
  productConcerns: many(productConcerns),
  images: many(productImages),
  weights: many(productWeights),
  reviews: many(reviews),
}));

export const productWeightsRelations = relations(productWeights, ({ one }) => ({
  product: one(products, {
    fields: [productWeights.productId],
    references: [products.id],
  }),
}));

export const concernsRelations = relations(concerns, ({ many }) => ({
  productConcerns: many(productConcerns),
}));

export const productConcernsRelations = relations(productConcerns, ({ one }) => ({
  product: one(products, {
    fields: [productConcerns.productId],
    references: [products.id],
  }),
  concern: one(concerns, {
    fields: [productConcerns.concernId],
    references: [concerns.id],
  }),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  images: many(reviewImages),
}));

export const reviewImagesRelations = relations(reviewImages, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewImages.reviewId],
    references: [reviews.id],
  }),
}));
