import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { deliveryService } from "./delivery.service";
import { updateDeliverySettingsSchema } from "./delivery.validators";

/**
 * Public read: the storefront mirrors these numbers at checkout (the server
 * still recomputes the authoritative fee when the order is placed), so the
 * resolved shape with defaults applied is what goes over the wire.
 */
export async function getDeliverySettings(_req: Request, res: Response) {
  const settings = await deliveryService.resolve();
  sendSuccess(res, settings);
}

export async function updateDeliverySettings(req: Request, res: Response) {
  const input = updateDeliverySettingsSchema.parse(req.body);
  const updated = await deliveryService.update(input);
  sendSuccess(res, updated);
}
