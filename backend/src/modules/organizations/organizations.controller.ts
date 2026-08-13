import { Request, Response } from "express";
import { sendSuccess } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import * as service from "./organizations.service";

export async function getCurrentOrganization(req: Request, res: Response) {
  const result = await service.getCurrentOrganization();
  return sendSuccess(res, result);
}

export async function updateOrganization(req: Request, res: Response) {
  const result = await service.updateOrganization(req.body);
  return sendSuccess(res, result);
}

export async function updateLogo(req: Request, res: Response) {
  if (!req.file) throw ApiError.badRequest("No logo file was provided.");
  const result = await service.updateLogo(req.file.buffer);
  return sendSuccess(res, result);
}
