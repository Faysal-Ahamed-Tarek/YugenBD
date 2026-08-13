import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { shipmentService } from "./shipment.service";
import { setShipmentDateSchema } from "./shipment.validators";

export async function getShipmentDate(_req: Request, res: Response) {
  const current = await shipmentService.getCurrent();
  sendSuccess(res, current);
}

export async function setShipmentDate(req: Request, res: Response) {
  const { expectedDate } = setShipmentDateSchema.parse(req.body);
  const updated = await shipmentService.setCurrent(expectedDate);
  sendSuccess(res, updated);
}
