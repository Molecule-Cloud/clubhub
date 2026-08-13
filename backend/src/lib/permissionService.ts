import { prisma } from "../lib/prisma";
import type { PermissionKey } from "../constants/permissions";

/**
 * Checks whether a role has a given permission. Simple direct query for
 * now — roles rarely change and permission sets are small, so this isn't a
 * hot-path concern yet. Revisit with an in-memory cache (keyed by roleId,
 * invalidated on RolePermission writes) if profiling ever shows otherwise;
 * premature caching here would just be a stale-permission bug waiting to
 * happen.
 */
export async function roleHasPermission(roleId: string, permissionKey: PermissionKey): Promise<boolean> {
  const grant = await prisma.rolePermission.findFirst({
    where: { roleId, permission: { key: permissionKey } },
    select: { roleId: true },
  });
  return grant !== null;
}
