import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { categoryService } from "./category.service";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  listCategoriesQuerySchema,
} from "./category.validators";

export async function listCategories(req: Request, res: Response) {
  const { q, flat } = listCategoriesQuerySchema.parse(req.query);
  const categories = await categoryService.list({ q, flat });
  sendSuccess(res, categories);
}

export async function getCategory(req: Request, res: Response) {
  const { id } = categoryIdParamSchema.parse(req.params);
  const category = await categoryService.getById(id);
  sendSuccess(res, category);
}

export async function getCategoryBySlug(req: Request, res: Response) {
  const category = await categoryService.getBySlug(req.params.slug);
  sendSuccess(res, category);
}

export async function createCategory(req: Request, res: Response) {
  const input = createCategorySchema.parse(req.body);
  const category = await categoryService.create(input);
  sendSuccess(res, category, 201);
}

export async function updateCategory(req: Request, res: Response) {
  const { id } = categoryIdParamSchema.parse(req.params);
  const input = updateCategorySchema.parse(req.body);
  const category = await categoryService.update(id, input);
  sendSuccess(res, category);
}

export async function deleteCategory(req: Request, res: Response) {
  const { id } = categoryIdParamSchema.parse(req.params);
  await categoryService.remove(id);
  sendSuccess(res, { id }, 200);
}
