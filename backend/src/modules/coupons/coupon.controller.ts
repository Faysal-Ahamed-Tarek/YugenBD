import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { couponService } from "./coupon.service";
import {
  createCouponSchema,
  updateCouponSchema,
  couponIdParamSchema,
  validateCouponSchema,
} from "./coupon.validators";

export async function listCoupons(_req: Request, res: Response) {
  sendSuccess(res, await couponService.list());
}

export async function getCoupon(req: Request, res: Response) {
  const { id } = couponIdParamSchema.parse(req.params);
  sendSuccess(res, await couponService.getById(id));
}

export async function createCoupon(req: Request, res: Response) {
  const input = createCouponSchema.parse(req.body);
  sendSuccess(res, await couponService.create(input), 201);
}

export async function updateCoupon(req: Request, res: Response) {
  const { id } = couponIdParamSchema.parse(req.params);
  const input = updateCouponSchema.parse(req.body);
  sendSuccess(res, await couponService.update(id, input));
}

export async function deleteCoupon(req: Request, res: Response) {
  const { id } = couponIdParamSchema.parse(req.params);
  await couponService.remove(id);
  sendSuccess(res, { id });
}

export async function validateCoupon(req: Request, res: Response) {
  const { code, subtotal } = validateCouponSchema.parse(req.body);
  sendSuccess(res, await couponService.validate(code, subtotal));
}
