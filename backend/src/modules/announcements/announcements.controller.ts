import { Request, Response } from "express";
import { sendSuccess } from "../../utils/ApiResponse";
import * as service from "./announcements.service";

export async function createAnnouncement(req: Request, res: Response) {
  const result = await service.createAnnouncement(req.body);
  return sendSuccess(res, result, 201);
}

export async function listAnnouncements(req: Request, res: Response) {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const result = await service.listAnnouncements(page, pageSize);
  return sendSuccess(res, result.announcements, 200, result.pagination);
}

export async function getAnnouncement(req: Request, res: Response) {
  const result = await service.getAnnouncement(req.params.announcementId as string);
  return sendSuccess(res, result);
}
