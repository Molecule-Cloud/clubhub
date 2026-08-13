import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { validate } from "../../middleware/validate";
import { authGuard } from "../../middleware/authGuard";
import { tenantContextMiddleware } from "../../middleware/tenantContext";
import { requirePermission } from "../../middleware/requirePermission";
import { authRateLimiter } from "../../middleware/rateLimiter";
import * as controller from "./members.controller";
import {
  inviteMemberSchema,
  acceptInvitationSchema,
  listMembersSchema,
  memberIdParamSchema,
  updateMemberRoleSchema,
  updateMemberStatusSchema,
  createRoleSchema,
  renameRoleSchema,
  setRolePermissionsSchema,
  roleIdParamSchema,
} from "./members.validation";

const router = Router();

// --- Public: accepting an invitation happens before the invitee has an
// account, so it can't require authGuard. Rate-limited like other
// unauthenticated auth-adjacent endpoints. ---
router.post(
  "/accept-invitation",
  authRateLimiter,
  validate(acceptInvitationSchema),
  asyncHandler(controller.acceptInvitation)
);

// --- Everything below requires an authenticated member of an organization ---
router.use(authGuard, tenantContextMiddleware);

router.get("/me/card", asyncHandler(controller.getMembershipCard));

router.get("/", validate(listMembersSchema), asyncHandler(controller.listMembers));

// Registered before /:membershipId — a literal "/roles" segment would
// otherwise be swallowed by the dynamic param route below it, since Express
// matches routes in registration order regardless of validation.
router.get("/roles", asyncHandler(controller.listRoles));
router.get("/permissions", asyncHandler(controller.listPermissionCatalog));

router.post(
  "/roles",
  requirePermission("roles:manage"),
  validate(createRoleSchema),
  asyncHandler(controller.createRole)
);
router.patch(
  "/roles/:roleId",
  requirePermission("roles:manage"),
  validate(renameRoleSchema),
  asyncHandler(controller.renameRole)
);
router.put(
  "/roles/:roleId/permissions",
  requirePermission("roles:manage"),
  validate(setRolePermissionsSchema),
  asyncHandler(controller.setRolePermissions)
);
router.delete(
  "/roles/:roleId",
  requirePermission("roles:manage"),
  validate(roleIdParamSchema),
  asyncHandler(controller.deleteRole)
);

router.post(
  "/invitations",
  requirePermission("members:invite"),
  validate(inviteMemberSchema),
  asyncHandler(controller.inviteMember)
);

router.delete(
  "/invitations/:invitationId",
  requirePermission("members:invite"),
  asyncHandler(controller.revokeInvitation)
);

router.get("/:membershipId", validate(memberIdParamSchema), asyncHandler(controller.getMember));

router.get(
  "/:membershipId/card",
  requirePermission("members:manage"),
  validate(memberIdParamSchema),
  asyncHandler(controller.getMembershipCardById)
);

router.patch(
  "/:membershipId/role",
  requirePermission("roles:manage"),
  validate(updateMemberRoleSchema),
  asyncHandler(controller.updateMemberRole)
);

router.patch(
  "/:membershipId/status",
  requirePermission("members:manage"),
  validate(updateMemberStatusSchema),
  asyncHandler(controller.updateMemberStatus)
);

router.delete(
  "/:membershipId",
  requirePermission("members:manage"),
  validate(memberIdParamSchema),
  asyncHandler(controller.removeMember)
);

export default router;
