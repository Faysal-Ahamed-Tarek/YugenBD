import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { userService } from "./user.service";
import { listUsersQuerySchema, userIdParamSchema } from "./user.validators";

export async function listUsers(req: Request, res: Response) {
  const query = listUsersQuerySchema.parse(req.query);
  const result = await userService.list(query);
  sendSuccess(res, result.items, 200, { pagination: result.pagination });
}

export async function getUser(req: Request, res: Response) {
  const { id } = userIdParamSchema.parse(req.params);
  sendSuccess(res, await userService.getById(id));
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = userIdParamSchema.parse(req.params);
  await userService.remove(id);
  sendSuccess(res, { id });
}
