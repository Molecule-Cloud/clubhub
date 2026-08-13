import { Request, Response } from "express";
import { sendSuccess } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import * as paystack from "../../lib/paystack";
import { logger } from "../../lib/logger";
import * as service from "./payments.service";
import * as categoryService from "./paymentCategories.service";

// --- Categories ---

export async function createCategory(req: Request, res: Response) {
  const result = await categoryService.createCategory(req.body);
  return sendSuccess(res, result, 201);
}

export async function listCategories(req: Request, res: Response) {
  const result = await categoryService.listCategories();
  return sendSuccess(res, result);
}

export async function updateCategory(req: Request, res: Response) {
  const result = await categoryService.updateCategory(req.params.categoryId as string, req.body);
  return sendSuccess(res, result);
}

// --- Payments ---

export async function initializePayment(req: Request, res: Response) {
  const result = await service.initializePayment(req.body.categoryId, req.body.amount, req.body.projectId, req.body.callbackUrl);
  return sendSuccess(res, result, 201);
}

export async function verifyPayment(req: Request, res: Response) {
  const result = await service.verifyPaymentByReference(req.params.reference as string);
  return sendSuccess(res, result);
}

export async function recordManualPayment(req: Request, res: Response) {
  const result = await service.recordManualPayment(req.body);
  return sendSuccess(res, result, 201);
}

export async function refundPayment(req: Request, res: Response) {
  const result = await service.refundPayment(req.params.paymentId as string, req.body.amount);
  return sendSuccess(res, result);
}

export async function listPayments(req: Request, res: Response) {
  const result = await service.listPayments(req.query as never);
  return sendSuccess(res, result.payments, 200, result.pagination);
}

export async function listMyPayments(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const result = await service.listMyPayments(req.auth!.userId, page, pageSize);
  return sendSuccess(res, result.payments, 200, result.pagination);
}

export async function getPayment(req: Request, res: Response) {
  const result = await service.getPayment(req.params.paymentId as string);
  return sendSuccess(res, result);
}

// --- Webhook (Paystack calls this directly — no auth guard, signature-verified instead) ---

export async function paystackWebhook(req: Request, res: Response) {
  const signature = req.header("x-paystack-signature");

  if (!req.rawBody || !paystack.verifyWebhookSignature(req.rawBody, signature)) {
    logger.warn({ ip: req.ip }, "Rejected Paystack webhook with invalid signature");
    throw ApiError.unauthorized("Invalid webhook signature");
  }

  // Acknowledge receipt immediately (Paystack expects a fast 200), process
  // the event, and let errors surface via logging rather than a failed
  // response — Paystack will retry on non-2xx, and we've already verified
  // authenticity, so a downstream processing error shouldn't trigger
  // repeated retries of an already-accepted, authentic event.
  res.status(200).json({ received: true });

  try {
    await service.handlePaystackWebhookEvent(req.body);
  } catch (err) {
    logger.error({ err, body: req.body }, "Failed to process Paystack webhook event");
  }
}
