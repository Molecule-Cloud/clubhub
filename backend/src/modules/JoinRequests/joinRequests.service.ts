import { prisma, Prisma, scopedCreateData } from "../../lib/prisma";
import { ApiError } from "../../utils/ApiError";
import { getRequestContext } from "../../lib/requestContext";
import { writeAuditLog } from "../../lib/auditLog";
import { withTenantRLS } from "../../lib/withTenantRLS";
import { inviteMember } from "../members/members.service";

/**
 * Public unauthenticated: a non-member requesting to join, optionally
 * prompted by a specific public event, Takes the org's slug (not id)
 * matches the slug-based convention already used throughout the-
 * public side of this app (/join/[slug] /login?slug=), rather than requiring
 * a separate auth flow.
 */
export async function createJoinRequest(
  slug: string,
  input: { eventId?: string; email: string; firstName: string; lastName: string; phone?: string; message?: string }
) {
  const organization = await prisma.organization.findUnique({ where: { slug } });
  if (!organization) throw ApiError.notFound("Organization not found.");
  const organizationId = organization.id;

  if (input.eventId) {
    const event = await prisma.event.findFirst({
      where: { id: input.eventId, organizationId, isPublic: true },
    });
    if (!event) throw ApiError.badRequest("Event not found.");
  }

  const existingPending = await prisma.joinRequest.findFirst({
    where: { organizationId, email: input.email, status: "PENDING" },
  });
  if (existingPending) {
    throw ApiError.conflict("A join request is already pending for this email.");
  }

  //   return prisma.joinRequest.create({
  //     data: {
  //       organizationId,
  //       eventId: input.eventId,
  //       email: input.email,
  //       firstName: input.firstName,
  //       lastName: input.lastName,
  //       phone: input.phone,
  //       message: input.message,
  //     },
  //   });
  // }
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_org_id', ${organizationId}, true)`;
    return tx.joinRequest.create({
      data: {
        organizationId,
        eventId: input.eventId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        message: input.message,
      },
    });
  });
}  

interface ListJoinRequestsFilters {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  page: number;
  pageSize: number;
}

export async function listJoinRequests(filters: ListJoinRequestsFilters) {
  const where = filters.status ? { status: filters.status } : {};

  const [total, requests] = await Promise.all([
    prisma.joinRequest.count({ where }),
    prisma.joinRequest.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { createdAt: "desc" },
      include: { event: { select: { id: true, title: true } } },
    }),
  ]);

  return {
    requests,
    pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) },
  };
}

/**
 * Approvoing a request delegates entirely to inviteMember - this reuses
 * the inviteMember logic and already-a-member logic to add the user to the organization.
 * rather than reimplementing it here.
 * The admin supplies roleId explicitly; there's no default role inference.
 */
export async function approveJoinRequest(joinRequestId: string, roleId: string) {
  const ctx = getRequestContext();
  if (!ctx.organizationId) throw ApiError.forbidden();

  const request = await prisma.joinRequest.findFirst({ where: { id: joinRequestId } });
  if (!request) throw ApiError.notFound("Join request not found.");
  if (request.status !== "PENDING") throw ApiError.badRequest("This request has already been reviewed.");

  const invitation = await inviteMember(request.email, roleId);

  const updated = await withTenantRLS(ctx.organizationId, (tx) =>
    tx.joinRequest.update({
      where: { id: joinRequestId },
      data: { status: "APPROVED", reviewedByUserId: ctx.userId, reviewedAt: new Date() },
    })
  );

  await writeAuditLog({
    action: "joinRequest.approved",
    entityType: "JoinRequest",
    entityId: joinRequestId,
    after: { roleId, invitationId: invitation.invitationId },
  });

  return updated;
}

export async function rejectJoinRequest(joinRequestId: string) {
  const ctx = getRequestContext();
  if (!ctx.organizationId) throw ApiError.forbidden();

  const request = await prisma.joinRequest.findFirst({ where: { id: joinRequestId } });
  if (!request) throw ApiError.notFound("Join request not found.");
  if (request.status !== "PENDING") throw ApiError.badRequest("This request has already been reviewed.");

  const updated = await withTenantRLS(ctx.organizationId, (tx) =>
    tx.joinRequest.update({
      where: { id: joinRequestId },
      data: { status: "REJECTED", reviewedByUserId: ctx.userId, reviewedAt: new Date() },
    })
  );

  await writeAuditLog({ action: "joinRequest.rejected", entityType: "JoinRequest", entityId: joinRequestId });

  return updated;
}