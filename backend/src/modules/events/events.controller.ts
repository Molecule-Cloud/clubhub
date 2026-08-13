import { Request, Response } from "express";
import { sendSuccess } from "../../utils/ApiResponse";
import * as service from "./events.service";

export async function createEvent(req: Request, res: Response) {
  const result = await service.createEvent(req.body);
  return sendSuccess(res, result, 201);
}

export async function listEvents(req: Request, res: Response) {
  const result = await service.listEvents(req.query as never);
  return sendSuccess(res, result.events, 200, result.pagination);
}

export async function getEvent(req: Request, res: Response) {
  const result = await service.getEvent(req.params.eventId as string);
  return sendSuccess(res, result);
}

export async function updateEvent(req: Request, res: Response) {
  const result = await service.updateEvent(req.params.eventId as string, req.body);
  return sendSuccess(res, result);
}

export async function deleteEvent(req: Request, res: Response) {
  await service.deleteEvent(req.params.eventId as string);
  return sendSuccess(res, { message: "Event deleted." });
}

export async function getCheckinQrCode(req: Request, res: Response) {
  const result = await service.getCheckinQrCode(req.params.eventId as string);
  return sendSuccess(res, result);
}

export async function registerForEvent(req: Request, res: Response) {
  const result = await service.registerForEvent(req.params.eventId as string);
  return sendSuccess(res, result, 201);
}

export async function cancelRegistration(req: Request, res: Response) {
  await service.cancelRegistration(req.params.eventId as string);
  return sendSuccess(res, { message: "Registration cancelled." });
}

export async function listRegistrations(req: Request, res: Response) {
  const result = await service.listRegistrations(req.params.eventId as string);
  return sendSuccess(res, result);
}

export async function selfCheckIn(req: Request, res: Response) {
  const result = await service.selfCheckIn(req.params.eventId as string, req.body.code);
  return sendSuccess(res, result, 201);
}

export async function staffCheckIn(req: Request, res: Response) {
  const result = await service.staffCheckIn(req.params.eventId as string, req.params.membershipId as string);
  return sendSuccess(res, result, 201);
}

export async function listAttendance(req: Request, res: Response) {
  const result = await service.listAttendance(req.params.eventId as string);
  return sendSuccess(res, result);
}

export async function recordGeneralAttendance(req: Request, res: Response) {
  const result = await service.recordGeneralAttendance(req.body.membershipId, req.body.eventId);
  return sendSuccess(res, result, 201);
}
