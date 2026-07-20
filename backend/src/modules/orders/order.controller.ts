import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse";
import { orderService } from "./order.service";
import {
  createOrderSchema,
  createManualOrderSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
} from "./order.validators";
import { streamOrderPdf } from "./order.pdf";

export async function createOrder(req: Request, res: Response) {
  const input = createOrderSchema.parse(req.body);
  // optionalAuth: link the order to the customer when they're signed in.
  const order = await orderService.create(input, req.user?.userId ?? null);
  sendSuccess(res, order, 201);
}

export async function listMyOrders(req: Request, res: Response) {
  const orders = await orderService.listByUser(req.user!.userId);
  sendSuccess(res, orders);
}

export async function listOrders(req: Request, res: Response) {
  const query = listOrdersQuerySchema.parse(req.query);
  const result = await orderService.list(query);
  sendSuccess(res, result.items, 200, { pagination: result.pagination });
}

export async function getOrderCounts(_req: Request, res: Response) {
  const counts = await orderService.counts();
  // Short private cache: the admin polls this for the pending badge.
  res.setHeader("Cache-Control", "private, max-age=10");
  sendSuccess(res, counts);
}

export async function createManualOrder(req: Request, res: Response) {
  const input = createManualOrderSchema.parse(req.body);
  const order = await orderService.createManual(input);
  sendSuccess(res, order, 201);
}

export async function updateOrderStatus(req: Request, res: Response) {
  const { id } = orderIdParamSchema.parse(req.params);
  const { status } = updateOrderStatusSchema.parse(req.body);
  const order = await orderService.updateStatus(id, status);
  sendSuccess(res, order);
}

export async function updatePaymentStatus(req: Request, res: Response) {
  const { id } = orderIdParamSchema.parse(req.params);
  const { paymentStatus } = updatePaymentStatusSchema.parse(req.body);
  const order = await orderService.updatePaymentStatus(id, paymentStatus);
  sendSuccess(res, order);
}

export async function deleteOrder(req: Request, res: Response) {
  const { id } = orderIdParamSchema.parse(req.params);
  await orderService.remove(id);
  sendSuccess(res, { id });
}

export async function getOrder(req: Request, res: Response) {
  const { id } = orderIdParamSchema.parse(req.params);
  const order = await orderService.getById(id);
  sendSuccess(res, order);
}

export async function getOrderPdf(req: Request, res: Response) {
  const { id } = orderIdParamSchema.parse(req.params);
  const order = await orderService.getById(id);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="yugenbd-order-${id}.pdf"`);
  streamOrderPdf(order, res);
}
