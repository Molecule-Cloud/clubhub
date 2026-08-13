import { Request, Response } from "express";
import { sendSuccess } from "../../utils/ApiResponse";
import * as service from "./projects.service";

export async function createProject(req: Request, res: Response) {
  const result = await service.createProject(req.body);
  return sendSuccess(res, result, 201);
}

export async function listProjects(req: Request, res: Response) {
  const result = await service.listProjects(req.query as never);
  return sendSuccess(res, result.projects, 200, result.pagination);
}

export async function getProject(req: Request, res: Response) {
  const result = await service.getProject(req.params.projectId as string);
  return sendSuccess(res, result);
}

export async function updateProject(req: Request, res: Response) {
  const result = await service.updateProject(req.params.projectId as string, req.body);
  return sendSuccess(res, result);
}

export async function createMilestone(req: Request, res: Response) {
  const result = await service.createMilestone(req.params.projectId as string, req.body.title, req.body.dueDate);
  return sendSuccess(res, result, 201);
}

export async function updateMilestone(req: Request, res: Response) {
  const result = await service.updateMilestone(
    req.params.projectId as string,
    req.params.milestoneId as string,
    req.body
  );
  return sendSuccess(res, result);
}
