import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const imageInputSchema = z.object({
  imageUrl: z.string().url(),
  isMain: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});

export const createProductSchema = z
  .object({
    title: z.string().trim().min(2).max(255),
    basePrice: z.number().positive(),
    discountPrice: z.number().positive().nullable().optional(),
    stock: z.number().int().min(0).default(0),
    shortDescription: z.string().max(2000).optional(),
    whoIsItBestFor: z.string().optional(),
    ingredients: z.string().optional(),
    usageInstructions: z.string().optional(),
    additionInformation: z.string().optional(),
    status: z.enum(["draft", "published"]).default("draft"),
    categoryIds: z.array(z.string().uuid()).min(1, "At least one category is required"),
    concernIds: z.array(z.string().uuid()).optional().default([]),
    images: z.array(imageInputSchema).optional().default([]),
  })
  .refine((data) => !data.discountPrice || data.discountPrice < data.basePrice, {
    message: "discountPrice must be less than basePrice",
    path: ["discountPrice"],
  });

export const updateProductSchema = z
  .object({
    title: z.string().trim().min(2).max(255).optional(),
    basePrice: z.number().positive().optional(),
    discountPrice: z.number().positive().nullable().optional(),
    stock: z.number().int().min(0).optional(),
    shortDescription: z.string().max(2000).optional(),
    whoIsItBestFor: z.string().optional(),
    ingredients: z.string().optional(),
    usageInstructions: z.string().optional(),
    additionInformation: z.string().optional(),
    status: z.enum(["draft", "published"]).optional(),
    categoryIds: z.array(z.string().uuid()).min(1).optional(),
    concernIds: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (data) =>
      data.discountPrice == null || data.basePrice == null || data.discountPrice < data.basePrice,
    {
      message: "discountPrice must be less than basePrice",
      path: ["discountPrice"],
    }
  );

export const addProductImagesSchema = z.object({
  images: z.array(imageInputSchema).min(1),
});

export const reorderImagesSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1),
});

export const productIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const productImageParamSchema = z.object({
  id: z.string().uuid(),
  imageId: z.string().uuid(),
});

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["draft", "published"]).optional(),
  categoryId: z.string().uuid().optional(),
  categorySlug: z.string().optional(),
  concernSlug: z.string().optional(),
  search: z.string().trim().optional(),
  q: z.string().trim().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "title_asc"]).default("newest"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
