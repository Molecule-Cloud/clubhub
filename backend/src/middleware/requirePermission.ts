import { NextFunction, Request, Response } from "express";
import { roleHasPermission } from "../lib/permissionService";
import { ApiError } from "../utils/ApiError";
import type { PermissionKey } from "../constants/permissions";

/**
 * Must run after authGuard (needs req.auth.roleId). Checks the caller's
 * role against the permission catalog seeded in Phase 2's first chunk.
 * Because roles are per-organization and customizable, this reads live
 * from RolePermission rather than checking a hardcoded role name — an org
 * that renames "Treasurer" to "Finance Officer" doesn't break this check.
 */
export function requirePermission(permissionKey: PermissionKey) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(ApiError.unauthorized());
    }

    const allowed = await roleHasPermission(req.auth.roleId, permissionKey);
    if (!allowed) {
      return next(ApiError.forbidden(`Missing required permission: ${permissionKey}`));
    }

    next();
  };
}
