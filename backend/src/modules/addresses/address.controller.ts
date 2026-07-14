import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { addressService } from "./address.service";
import { saveAddressSchema } from "./address.validators";

export async function getMyAddress(req: Request, res: Response) {
  const address = await addressService.getMine(req.user!.userId);
  sendSuccess(res, address);
}

export async function saveMyAddress(req: Request, res: Response) {
  const input = saveAddressSchema.parse(req.body);
  const address = await addressService.saveMine(req.user!.userId, input);
  sendSuccess(res, address);
}
