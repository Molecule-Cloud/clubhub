import { prisma, Prisma, scopedCreateData } from "./prisma";
import { getRequestContext } from "./requestContext";

interface WriteAuditLogInput {
  action: string; // e.g. "member.role_changed"
  entityType: string; // e.g. "Membership"
  entityId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
}





/**
 * Writes an audit log entry using the current request's tenant context.
 * Called explicitly at the point of mutation in service functions (not
 * automatically via a Prisma middleware) — automatic diffing of arbitrary
 * mutations produces noisy, low-signal logs. Explicit calls at meaningful
 * business events (role changed, payment approved, member removed) produce
 * an audit trail someone can actually read during a dispute.
 */
export async function writeAuditLog(input: WriteAuditLogInput) {
  const ctx = getRequestContext();
  if (!ctx.organizationId) return; // no-op outside a tenant context (e.g. org onboarding)

  await prisma.auditLog.create({
    data: scopedCreateData<Prisma.AuditLogUncheckedCreateInput>({
      userId: ctx.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeData: input.before === undefined ? undefined : (input.before as object),
      afterData: input.after === undefined ? undefined : (input.after as object),
      ipAddress: input.ipAddress,
    }),
  });
}