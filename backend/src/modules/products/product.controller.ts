import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { productService } from "./product.service";
import {
  createProductSchema,
  updateProductSchema,
  addProductImagesSchema,
  productIdParamSchema,
  productImageParamSchema,
  listProductsQuerySchema,
  reorderImagesSchema,
} from "./product.validators";

function isAdmin(req: Request) {
  return req.user?.role === "admin";
}

export async function listProducts(req: Request, res: Response) {
  const query = listProductsQuerySchema.parse(req.query);
  const result = await productService.list(query, isAdmin(req));
  sendSuccess(res, result.items, 200, { pagination: result.pagination });
}

export async function getProduct(req: Request, res: Response) {
  const { id } = productIdParamSchema.parse(req.params);
  const product = await productService.getById(id, isAdmin(req));
  sendSuccess(res, product);
}

export async function getProductBySlug(req: Request, res: Response) {
  const product = await productService.getBySlug(req.params.slug, isAdmin(req));
  sendSuccess(res, product);
}

export async function createProduct(req: Request, res: Response) {
  const input = createProductSchema.parse(req.body);
  const product = await productService.create(input);
  sendSuccess(res, product, 201);
}

export async function updateProduct(req: Request, res: Response) {
  const { id } = productIdParamSchema.parse(req.params);
  const input = updateProductSchema.parse(req.body);
  const product = await productService.update(id, input);
  sendSuccess(res, product);
}

export async function deleteProduct(req: Request, res: Response) {
  const { id } = productIdParamSchema.parse(req.params);
  await productService.remove(id);
  sendSuccess(res, { id });
}

export async function addProductImages(req: Request, res: Response) {
  const { id } = productIdParamSchema.parse(req.params);
  const { images } = addProductImagesSchema.parse(req.body);
  const created = await productService.addImages(id, images);
  sendSuccess(res, created, 201);
}

export async function setMainProductImage(req: Request, res: Response) {
  const { id, imageId } = productImageParamSchema.parse(req.params);
  const image = await productService.setMainImage(id, imageId);
  sendSuccess(res, image);
}

export async function removeProductImage(req: Request, res: Response) {
  const { id, imageId } = productImageParamSchema.parse(req.params);
  await productService.removeImage(id, imageId);
  sendSuccess(res, { id: imageId });
}

export async function reorderProductImages(req: Request, res: Response) {
  const { id } = productIdParamSchema.parse(req.params);
  const { imageIds } = reorderImagesSchema.parse(req.body);
  const product = await productService.reorderImages(id, imageIds);
  sendSuccess(res, product);
}
