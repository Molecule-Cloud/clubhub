import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { prisma, Prisma, scopedCreateData } from "../../lib/prisma";
import { env } from "../../lib/env";
import { ApiError } from "../../utils/ApiError";
import { getRequestContext } from "../../lib/requestContext";
import { writeAuditLog } from "../../lib/auditLog";
import { withTenantRLS } from "../../lib/withTenantRLS";
import { sendEmail } from "../../lib/mailer";

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export async function listRoles() {
  return prisma.role.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      isDefault: true,
      _count: { select: { memberships: true } },
      rolePermissions: { select: { permission: { select: { key: true, description: true } } } },
    },
  });
}

export async function listPermissionCatalog() {
  return prisma.permission.findMany({ orderBy: { key: "asc" } });
}

export async function createRole(name: string, permissionKeys: string[]) {
  const ctx = getRequestContext();
  if (!ctx.organizationId) throw ApiError.forbidden();

  const existing = await prisma.role.findFirst({ where: { name } });
  if (existing) throw ApiError.conflict("A role with this name already exists.");

  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });

  return withTenantRLS(ctx.organizationId, async (tx) => tx.role.create({
    data: scopedCreateData<Prisma.RoleUncheckedCreateInput>({
      name,
      isDefault: false,
      rolePermissions: { create: permissions.map((p) => ({ permissionId: p.id })) },
    }),
    include: { rolePermissions: { include: { permission: true } } },
  }));
}

export async function renameRole(roleId: string, name: string) {
  const ctx = getRequestContext();
  if (!ctx.organizationId) throw ApiError.forbidden();

  const role = await prisma.role.findFirst({ where: { id: roleId } });
  if (!role) throw ApiError.notFound("Role not found.");

  return withTenantRLS(ctx.organizationId, (tx) => tx.role.update({ where: { id: roleId }, data: { name } }));
}

/**
 * Replaces a role's entire permission set with the given list — simpler
 * and less error-prone for a checkbox-grid UI than diffing individual
 * add/remove operations. Wrapped in a transaction so a role is never left
 * with a partially-updated grant set if something fails mid-way.
 */
export async function setRolePermissions(roleId: string, permissionKeys: string[]) {
  const ctx = getRequestContext();
  if (!ctx.organizationId) throw ApiError.forbidden();

  const role = await prisma.role.findFirst({ where: { id: roleId } });
  if (!role) throw ApiError.notFound("Role not found.");

  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });

  await withTenantRLS(ctx.organizationId, async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId } });
    await tx.rolePermission.createMany({ data: permissions.map((p) => ({ roleId, permissionId: p.id })) });
  });
 
  await writeAuditLog({
    action: "role.permissions_updated",
    entityType: "Role",
    entityId: roleId,
    after: { permissions: permissionKeys },
  });

  return prisma.role.findUniqueOrThrow({
    where: { id: roleId },
    include: { rolePermissions: { include: { permission: true } } },
  });
}

/** Default (seeded) roles can't be deleted — deleting "President" or
 * "Treasurer" out from under an organization would be a footgun with no
 * real upside, since they can already be renamed and have permissions
 * fully customized instead. Custom roles can be deleted only if no member
 * currently holds them, since Role deletion is onDelete: Restrict against
 * Membership by design (see schema.prisma). */
export async function deleteRole(roleId: string) {
  const ctx = getRequestContext();
  if (!ctx.organizationId) throw ApiError.forbidden();

  const role = await prisma.role.findFirst({ where: { id: roleId }, include: { _count: { select: { memberships: true } } } });
  if (!role) throw ApiError.notFound("Role not found.");
  if (role.isDefault) throw ApiError.badRequest("Default roles can't be deleted, rename or adjust its permissions instead.");
  if (role._count.memberships > 0) {
    throw ApiError.conflict("This role is currently assigned to one or more members. Reassign them first.");
  }
  await withTenantRLS(ctx.organizationId, async (tx) => {
    await tx.role.delete({ where: { id: roleId } });
  });
}

async function generateMembershipNumber(organizationId: string, orgSlug: string): Promise<string> {
  const count = await prisma.membership.count({ where: { organizationId } });
  const sequence = String(count + 1).padStart(5, "0");
  return `${orgSlug.slice(0, 8).toUpperCase()}-${sequence}`;
}

/**
 * Invites a new member by email. Creates an Invitation record and emails a
 * tokenized accept link — does NOT create a User or Membership yet, since
 * the invitee may not have an account and needs to set their own password.
 */
export async function inviteMember(email: string, roleId: string) {
  const ctx = getRequestContext();
  if (!ctx.organizationId) throw ApiError.forbidden();

  const role = await prisma.role.findFirst({ where: { id: roleId, organizationId: ctx.organizationId } });
  if (!role) throw ApiError.badRequest("Role not found in this organization.");

  const existingPending = await prisma.invitation.findFirst({
    where: { organizationId: ctx.organizationId, email, status: "PENDING" },
  });
  if (existingPending) {
    throw ApiError.conflict("An invitation is already pending for this email.");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const existingMembership = await prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: ctx.organizationId, userId: existingUser.id } },
    });
    if (existingMembership) {
      throw ApiError.conflict("This person is already a member of your organization.");
    }
  }

  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } });

  const invitation = await prisma.invitation.create({
    data: scopedCreateData<Prisma.InvitationUncheckedCreateInput>({
      email,
      roleId,
      invitedByUserId: ctx.userId!,
      tokenHash: hashToken(rawToken),
      expiresAt,
    }),
  });

  const acceptUrl = `${env.CLIENT_URL}/join/${organization.slug}?token=${rawToken}`;
  await sendEmail({
    to: email,
    subject: `You're invited to join ${organization.name} on ClubHub`,
    html: `<p>You've been invited to join <strong>${organization.name}</strong> as ${role.name}.</p><p><a href="${acceptUrl}">Accept your invitation</a> (expires in 7 days).</p>`,
  });

  return { invitationId: invitation.id, expiresAt };
}

/**
 * Accepts an invitation: creates the User (if they don't already exist —
 * someone could be invited to a second organization while already having a
 * ClubHub account elsewhere) and the Membership, in one transaction.
 * Runs pre-tenant-context (organizationId isn't known from a token alone
 * without looking it up), same pattern as org onboarding.
 */
export async function acceptInvitation(input: {
  token: string;
  firstName: string;
  lastName: string;
  phone?: string;
  password: string;
}) {
  const tokenHash = hashToken(input.token);
  const invitation = await prisma.invitation.findUnique({ where: { tokenHash } });

  if (!invitation || invitation.status !== "PENDING") {
    throw ApiError.badRequest("Invalid or already-used invitation.");
  }
  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "EXPIRED" } });
    throw ApiError.badRequest("This invitation has expired. Please ask for a new one.");
  }

  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: invitation.organizationId } });

  const result = await prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({ where: { email: invitation.email } });

    if (!user) {
      const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
      user = await tx.user.create({
        data: {
          email: invitation.email,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          passwordHash,
          isEmailVerified: true, // clicking a tokenized email link IS the verification
        },
      });
    }

    const membershipNumber = await generateMembershipNumber(invitation.organizationId, organization.slug);

    const membership = await tx.membership.create({
      data: {
        organizationId: invitation.organizationId,
        userId: user.id,
        roleId: invitation.roleId,
        membershipNumber,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    return { user, membership };
  });

  return {
    userId: result.user.id,
    membershipId: result.membership.id,
    organizationSlug: organization.slug,
    message: "Welcome! You can now log in.",
  };
}

export async function revokeInvitation(invitationId: string) {
  const ctx = getRequestContext();
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, organizationId: ctx.organizationId! },
  });
  if (!invitation) throw ApiError.notFound("Invitation not found.");
  if (invitation.status !== "PENDING") throw ApiError.badRequest("Only pending invitations can be revoked.");

  await prisma.invitation.update({ where: { id: invitationId }, data: { status: "REVOKED" } });
}

interface ListMembersFilters {
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "ALUMNI";
  roleId?: string;
  search?: string;
  page: number;
  pageSize: number;
}

/** Member directory — the tenant Prisma extension scopes this to the
 * caller's organization automatically; no manual organizationId needed. */
export async function listMembers(filters: ListMembersFilters) {
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.roleId ? { roleId: filters.roleId } : {}),
    ...(filters.search
      ? {
          user: {
            OR: [
              { firstName: { contains: filters.search, mode: "insensitive" as const } },
              { lastName: { contains: filters.search, mode: "insensitive" as const } },
              { email: { contains: filters.search, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const [total, members] = await Promise.all([
    prisma.membership.count({ where }),
    prisma.membership.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { joinedAt: "desc" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        role: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    members,
    pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) },
  };
}

export async function getMember(membershipId: string) {
  const member = await prisma.membership.findFirst({
    where: { id: membershipId }, // tenant extension adds organizationId automatically
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
      role: { select: { id: true, name: true } },
    },
  });
  if (!member) throw ApiError.notFound("Member not found.");
  return member;
}

/**
 * Role changes go through withTenantRLS — the extra DB-level check on top
 * of the app-layer scoping, reserved for this kind of high-privilege
 * mutation per the Phase 2 chunk 2 design note.
 */
export async function updateMemberRole(membershipId: string, newRoleId: string) {
  const ctx = getRequestContext();
  if (!ctx.organizationId) throw ApiError.forbidden();

  const newRole = await prisma.role.findFirst({ where: { id: newRoleId, organizationId: ctx.organizationId } });
  if (!newRole) throw ApiError.badRequest("Role not found in this organization.");

  const before = await prisma.membership.findFirst({ where: { id: membershipId } });
  if (!before) throw ApiError.notFound("Member not found.");

  const updated = await withTenantRLS(ctx.organizationId, (tx) =>
    tx.membership.update({ where: { id: membershipId }, data: { roleId: newRoleId } })
  );

  await writeAuditLog({
    action: "member.role_changed",
    entityType: "Membership",
    entityId: membershipId,
    before: { roleId: before.roleId },
    after: { roleId: newRoleId },
  });

  return updated;
}

export async function updateMemberStatus(
  membershipId: string,
  newStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "ALUMNI"
) {
  const ctx = getRequestContext();
  if (!ctx.organizationId) throw ApiError.forbidden();

  const before = await prisma.membership.findFirst({ where: { id: membershipId } });
  if (!before) throw ApiError.notFound("Member not found.");

  const updated = await withTenantRLS(ctx.organizationId, (tx) =>
    tx.membership.update({ where: { id: membershipId }, data: { status: newStatus } })
  );

  await writeAuditLog({
    action: "member.status_changed",
    entityType: "Membership",
    entityId: membershipId,
    before: { status: before.status },
    after: { status: newStatus },
  });

  return updated;
}

/**
 * Digital membership card: identity + a QR code encoding a verification
 * payload. The QR payload is deliberately just IDs (not signed/encrypted
 * here) — verifying a scanned card against the database is a Phase 3+
 * concern (event check-in module); Phase 2 just needs the card renderable.
 */
export async function getMembershipCard(membershipId: string) {
  const member = await prisma.membership.findFirst({
    where: { id: membershipId },
    include: {
      user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      role: { select: { name: true } },
      organization: { select: { name: true, logoUrl: true, primaryColor: true } },
    },
  });
  if (!member) throw ApiError.notFound("Member not found.");

  const qrPayload = JSON.stringify({ membershipId: member.id, organizationId: member.organizationId });
  const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 320 });

  return {
    membershipNumber: member.membershipNumber,
    memberName: `${member.user.firstName} ${member.user.lastName}`,
    role: member.role.name,
    status: member.status,
    joinedAt: member.joinedAt,
    organizationName: member.organization.name,
    organizationLogoUrl: member.organization.logoUrl,
    primaryColor: member.organization.primaryColor,
    qrCodeDataUrl,
  };
}

/** Removes a member from the organization. Restrict, not Cascade, on
 * Membership's financial relations means this will correctly fail loudly
 * (via a Prisma FK error → 409 in errorHandler) if the member has payment
 * history, rather than silently deleting financial records. Deactivation
 * (updateMemberStatus) is the intended path for members with history. */
export async function removeMember(membershipId: string) {
  const ctx = getRequestContext();
  if (!ctx.organizationId) throw ApiError.forbidden();

  const before = await prisma.membership.findFirst({ where: { id: membershipId } });
  if (!before) throw ApiError.notFound("Member not found.");

  await withTenantRLS(ctx.organizationId, (tx) => tx.membership.delete({ where: { id: membershipId } }));

  await writeAuditLog({
    action: "member.removed",
    entityType: "Membership",
    entityId: membershipId,
    before: { membershipNumber: before.membershipNumber, roleId: before.roleId },
  });
}
