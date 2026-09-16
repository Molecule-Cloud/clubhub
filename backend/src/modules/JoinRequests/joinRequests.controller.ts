import { Request, Response } from "express";
import { sendSuccess } from "../../utils/ApiResponse";
import * as service from "./joinRequests.service";


export async function listJoinRequests(req: Request, res: Response) {
  const result = await service.listJoinRequests(req.query as never);
  return sendSuccess(res, result.requests, 200, result.pagination);
}

export async function approveJoinrequest(req: Request, res: Response) {
  const result = await service.approveJoinRequest(req.params.joinRequestId as string, req.body.roleId);
  return sendSuccess(res, result);
}

export async function rejectJoinrequest(req: Request, res: Response) {
  const result = await service.rejectJoinRequest(req.params.joinRequestId as string);
  return sendSuccess(res, result);
}