import { Request, Response } from "express";
import { sendSuccess } from "../../utils/ApiResponse";
import * as service from "./reports.service";

export async function getRevenueSummary(req: Request, res: Response) {
  const { bucket, from, to } = req.query as { bucket: "day" | "month" | "year"; from?: string; to?: string };
  const result = await service.getRevenueSummary(bucket, { from, to });
  return sendSuccess(res, result);
}

export async function getRevenueByCategory(req: Request, res: Response) {
  const { from, to } = req.query as { from?: string; to?: string };
  const result = await service.getRevenueByCategory({ from, to });
  return sendSuccess(res, result);
}

export async function getOutstandingDues(req: Request, res: Response) {
  const { from, to } = req.query as { from?: string; to?: string };
  const result = await service.getOutstandingDuesEstimate({ from, to });
  return sendSuccess(res, result);
}

export async function getMembershipGrowth(req: Request, res: Response) {
  const { bucket, from, to } = req.query as { bucket: "day" | "month" | "year"; from?: string; to?: string };
  const result = await service.getMembershipGrowth(bucket, { from, to });
  return sendSuccess(res, result);
}

export async function getMembershipBreakdown(_req: Request, res: Response) {
  const result = await service.getMembershipBreakdown();
  return sendSuccess(res, result);
}

export async function getAttendanceSummary(req: Request, res: Response) {
  const { eventId, from, to } = req.query as { eventId?: string; from?: string; to?: string };
  const result = await service.getAttendanceSummary(eventId, { from, to });
  return sendSuccess(res, result);
}

export async function getProjectsFundingSummary(_req: Request, res: Response) {
  const result = await service.getProjectsFundingSummary();
  return sendSuccess(res, result);
}

export async function exportPaymentsCsv(req: Request, res: Response) {
  const { status, from, to } = req.query as { status?: string; from?: string; to?: string };
  const csv = await service.exportPaymentsCsv({ status, from, to });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="payments-export-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.status(200).send(csv);
}
