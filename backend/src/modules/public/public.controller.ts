import { Request, Response } from "express";
import { sendSuccess } from "../../utils/ApiResponse";
import * as service from "./public.service";
import * as joinRequestsService from "../JoinRequests/joinRequests.service";

export async function listPublicEvents(req: Request, res: Response) {
  const result = await service.listPublicEvents(req.query as never);
  return sendSuccess(res, result.events, 200, result.pagination);
}

export async function getPublicEvent(req: Request, res: Response) {
  const result = await service.getPublicEvent(req.params.eventId as string);
  return sendSuccess(res, result);
}

export async function createJoinRequest(req: Request, res: Response) {
  const result = await joinRequestsService.createJoinRequest(req.params.slug as string, req.body);
  return sendSuccess(res, result, 201);
}