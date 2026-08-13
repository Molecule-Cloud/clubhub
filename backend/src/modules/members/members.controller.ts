import { Request, Response } from "express";
import { sendSuccess } from "../../utils/ApiResponse";
import * as service from "./members.service";

export async function inviteMember(req: Request, res: Response) {
  const result = await service.inviteMember(req.body.email, req.body.roleId);
  return sendSuccess(res, result, 201);
}

export async function acceptInvitation(req: Request, res: Response) {
  const result = await service.acceptInvitation(req.body);
  return sendSuccess(res, result, 201);
}

export async function revokeInvitation(req: Request, res: Response) {
  await service.revokeInvitation(req.params.invitationId as string);
  return sendSuccess(res, { message: "Invitation revoked." });
}

export async function listMembers(req: Request, res: Response) {
  const result = await service.listMembers(req.query as never);
  return sendSuccess(res, result.members, 200, result.pagination);
}

export async function listRoles(req: Request, res: Response) {
  const result = await service.listRoles();
  return sendSuccess(res, result);
}

export async function listPermissionCatalog(req: Request, res: Response) {
  const result = await service.listPermissionCatalog();
  return sendSuccess(res, result);
}

export async function createRole(req: Request, res: Response) {
  const result = await service.createRole(req.body.name, req.body.permissions);
  return sendSuccess(res, result, 201);
}

export async function renameRole(req: Request, res: Response) {
  const result = await service.renameRole(req.params.roleId as string, req.body.name);
  return sendSuccess(res, result);
}

export async function setRolePermissions(req: Request, res: Response) {
  const result = await service.setRolePermissions(req.params.roleId as string, req.body.permissions);
  return sendSuccess(res, result);
}

export async function deleteRole(req: Request, res: Response) {
  await service.deleteRole(req.params.roleId as string);
  return sendSuccess(res, { message: "Role deleted." });
}

export async function getMember(req: Request, res: Response) {
  const result = await service.getMember(req.params.membershipId as string);
  return sendSuccess(res, result);
}

export async function updateMemberRole(req: Request, res: Response) {
  const result = await service.updateMemberRole(req.params.membershipId as string, req.body.roleId);
  return sendSuccess(res, result);
}

export async function updateMemberStatus(req: Request, res: Response) {
  const result = await service.updateMemberStatus(req.params.membershipId as string, req.body.status);
  return sendSuccess(res, result);
}

export async function removeMember(req: Request, res: Response) {
  await service.removeMember(req.params.membershipId as string);
  return sendSuccess(res, { message: "Member removed." });
}

export async function getMembershipCard(req: Request, res: Response) {
  // /members/me/card resolves to the caller's own membership via req.auth.
  const result = await service.getMembershipCard(req.auth!.membershipId);
  return sendSuccess(res, result);
}

export async function getMembershipCardById(req: Request, res: Response) {
  const result = await service.getMembershipCard(req.params.membershipId as string);
  return sendSuccess(res, result);
}
