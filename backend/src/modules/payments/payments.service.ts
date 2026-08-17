import { randomUUID } from "node:crypto";
import { prisma, Prisma, scopedCreateData } from "../../lib/prisma";
import { ApiError } from "../../utils/ApiError";
import { getRequestContext, runWithContext } from "../../lib/requestContext";
import { writeAuditLog } from "../../lib/auditLog";
import { withTenantRLS } from "../../lib/withTenantRLS";
import * as paystack from "../../lib/paystack";
import { issueReceiptForPayment } from "./receipts.service";
import { logger } from "../../lib/logger";

/**
 * Single place where a payment transitions into SUCCESS and everything
 * that must happen alongside that transition occurs: receipt issuance,
 * and — if this payment funds a project — the ProjectContribution record
 * plus Project.raisedAmount increment. Called from all three completion
 * paths (webhook, verify-poll fallback, manual recording) so project
 * bookkeeping can't drift out of sync between the Paystack path and the
 * offline-entry path.
 *
 * Idempotent: safe to call multiple times for the same payment (checks
 * status and existing ProjectContribution before acting).
 */
async function settleSuccessfulPayment(paymentId: string, paidAt: Date) {
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: { category: true },
  });

  if (payment.status !== "SUCCESS") {
    await prisma.payment.update({ where: { id: paymentId }, data: { status: "SUCCESS", paidAt } });
  }

  await issueReceiptForPayment(paymentId);

  if (payment.category.type === "PROJECT_CONTRIBUTION" && payment.projectId) {
    const existingContribution = await prisma.projectContribution.findFirst({
      where: { projectId: payment.projectId, membershipId: payment.membershipId, amount: payment.amount },
      // Note: this existence check is a best-effort idempotency guard, not
      // a hard uniqueness constraint — a member making two genuinely
      // separate contributions of the identical amount is a real (if rare)
      // case this could under-count. Acceptable for now; a dedicated
      // paymentId column on ProjectContribution would close this gap
      // cleanly if it becomes a problem in practice.
    });

    if (!existingContribution) {
      await prisma.$transaction([
        prisma.projectContribution.create({
          data: { projectId: payment.projectId, membershipId: payment.membershipId, amount: payment.amount },
        }),
        // updateMany (not update) specifically so organizationId can be
        // included directly in the where clause as a defensive, explicit
        // check — Project IS genuinely tenant-scoped, and this line runs
        // AFTER issueReceiptForPayment's Cloudinary upload above, which is
        // a stream-based operation in the same risk category as the
        // multer bug already confirmed to lose AsyncLocalStorage context
        // (see organizations.routes.ts). Since payment.organizationId is
        // already in hand as plain data from the fetch at the top of this
        // function, there's no reason to depend on ambient context
        // surviving here at all.
        prisma.project.updateMany({
          where: { id: payment.projectId, organizationId: payment.organizationId },
          data: { raisedAmount: { increment: payment.amount } },
        }),
      ]);
    }
  }
}

/**
 * Starts a Paystack checkout for the calling member. Creates a PENDING
 * Payment row up front with the Paystack reference already attached, so
 * the webhook (which only carries the reference) can find and update the
 * exact right row regardless of arrival order or retries.
 */
export async function initializePayment(
  categoryId: string,
  amountMinorUnits: number,
  projectId?: string,
  callbackUrl?: string
) {
  const ctx = getRequestContext();
  if (!ctx.organizationId || !ctx.userId) throw ApiError.forbidden();

  const category = await prisma.paymentCategory.findFirst({ where: { id: categoryId, isActive: true } });
  if (!category) throw ApiError.badRequest("Payment category not found or inactive.");

  if (category.type === "PROJECT_CONTRIBUTION" && !projectId) {
    throw ApiError.badRequest("projectId is required for project contribution payments.");
  }
  if (projectId) {
    const project = await prisma.project.findFirst({ where: { id: projectId } });
    if (!project) throw ApiError.badRequest("Project not found in this organization.");
  }

  const membership = await prisma.membership.findFirst({ where: { userId: ctx.userId } });
  if (!membership) throw ApiError.forbidden("No active membership found.");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });
  const reference = `CH-${randomUUID()}`;

  const payment = await prisma.payment.create({
    data: scopedCreateData<Prisma.PaymentUncheckedCreateInput>({
      membershipId: membership.id,
      categoryId,
      projectId,
      amount: amountMinorUnits,
      gateway: "PAYSTACK",
      gatewayRef: reference,
      status: "PENDING",
    }),
  });

  const { authorizationUrl, accessCode } = await paystack.initializeTransaction({
    email: user.email,
    amountMinorUnits,
    reference,
    metadata: { paymentId: payment.id, organizationId: ctx.organizationId, categoryId, projectId },
    callbackUrl,
  });

  return { paymentId: payment.id, authorizationUrl, accessCode, reference };
}

/**
 * Processes a verified Paystack webhook event. Signature verification
 * happens in the controller BEFORE this is called — this function trusts
 * that the event is authentic.
 *
 * Idempotent: if the payment is already SUCCESS, this is a no-op (Paystack
 * retries webhook delivery; duplicates are expected, not exceptional).
 *
 * Runs outside normal request auth (Paystack calls this, not a logged-in
 * user), so it builds its own tenant context explicitly via runWithContext
 * once it has looked up which organization this payment belongs to.
 */
export async function handlePaystackWebhookEvent(event: {
  event: string;
  data: { reference: string; status: string; amount: number; paid_at: string | null };
}) {
  // findUnique is intentionally NOT auto-tenant-scoped (see lib/prisma.ts
  // docstring) — exactly the right tool here, since we don't know the
  // organization yet and gatewayRef is globally unique anyway.
  const payment = await prisma.payment.findUnique({ where: { gatewayRef: event.data.reference } });
  if (!payment) {
    logger.warn({ reference: event.data.reference }, "Webhook received for unknown payment reference");
    return;
  }

  if (event.event !== "charge.success") {
    if (event.event === "charge.failed" && payment.status === "PENDING") {
      await runWithContext(
        { organizationId: payment.organizationId, userId: null, roleId: null, requestId: randomUUID() }, async () => {
        () => prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } })
        }
      );
    }
    return;
  }

  if (payment.status === "SUCCESS") {
    return; // already processed — duplicate webhook delivery, safe no-op
  }

  await runWithContext(
    { organizationId: payment.organizationId, userId: null, roleId: null, requestId: randomUUID() }, async () => {
    () => settleSuccessfulPayment(payment.id, event.data.paid_at ? new Date(event.data.paid_at) : new Date())
    }
  );
}

/** Client-facing polling fallback — checks Paystack directly rather than
 * trusting anything the client asserts about payment status. */
export async function verifyPaymentByReference(reference: string) {
  const payment = await prisma.payment.findFirst({ where: { gatewayRef: reference } });
  if (!payment) throw ApiError.notFound("Payment not found.");

  if (payment.status === "SUCCESS") return { status: "SUCCESS", paymentId: payment.id };

  const result = await paystack.verifyTransaction(reference);
  if (result.status === "success") {
    await settleSuccessfulPayment(payment.id, result.paidAt ? new Date(result.paidAt) : new Date());
    return { status: "SUCCESS", paymentId: payment.id };
  }

  return { status: result.status.toUpperCase(), paymentId: payment.id };
}

/** Treasurer/admin recording an offline (cash, bank transfer) payment. */
export async function recordManualPayment(input: {
  membershipId: string;
  categoryId: string;
  amount: number;
  projectId?: string;
  notes?: string;
}) {
  const ctx = getRequestContext();
  if (!ctx.organizationId || !ctx.userId) throw ApiError.forbidden();

  const membership = await prisma.membership.findFirst({ where: { id: input.membershipId } });
  if (!membership) throw ApiError.badRequest("Member not found in this organization.");

  const category = await prisma.paymentCategory.findFirst({ where: { id: input.categoryId, isActive: true } });
  if (!category) throw ApiError.badRequest("Payment category not found or inactive.");

  if (category.type === "PROJECT_CONTRIBUTION" && !input.projectId) {
    throw ApiError.badRequest("projectId is required for project contribution payments.");
  }

  const payment = await withTenantRLS(ctx.organizationId, (tx) => tx.payment.create({
    data: scopedCreateData<Prisma.PaymentUncheckedCreateInput>({
      membershipId: input.membershipId,
      categoryId: input.categoryId,
      projectId: input.projectId,
      amount: input.amount,
      gateway: "MANUAL",
      gatewayRef: `MANUAL-${randomUUID()}`,
      status: "PENDING", // settleSuccessfulPayment flips this to SUCCESS, same path as every other completion
      recordedByUserId: ctx.userId,
      notes: input.notes,
    }),
  }));

  await settleSuccessfulPayment(payment.id, new Date());

  // Re-establish context explicitly before this next call. settleSuccessfulPayment
  // internally calls issueReceiptForPayment, which uploads the generated PDF to
  // Cloudinary — a stream-based operation in the same risk category confirmed to
  // lose AsyncLocalStorage context in organizations.routes.ts's multer upload.
  // writeAuditLog() calls getRequestContext() internally, which THROWS if the
  // context is gone — without this, a lost context here would crash the entire
  // manual-payment recording after the payment and receipt were already
  // successfully created, which is worse than a merely-missing audit log entry.
  return runWithContext(ctx, async () => {
    await writeAuditLog({
      action: "payment.recorded_manually",
      entityType: "Payment",
      entityId: payment.id,
      after: { amount: input.amount, categoryId: input.categoryId, membershipId: input.membershipId },
    });

    return prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
  });
}

/** Refund goes through withTenantRLS — the extra DB-level check reserved
 * for high-risk financial mutations, per the Phase 2 design. */
export async function refundPayment(paymentId: string, amountMinorUnits?: number) {
  const ctx = getRequestContext();
  if (!ctx.organizationId) throw ApiError.forbidden();

  const payment = await prisma.payment.findFirst({ where: { id: paymentId } });
  if (!payment) throw ApiError.notFound("Payment not found.");
  if (payment.status !== "SUCCESS") throw ApiError.badRequest("Only successful payments can be refunded.");

  if (payment.gateway === "PAYSTACK") {
    await paystack.refundTransaction(payment.gatewayRef, amountMinorUnits);
  }
  // MANUAL payments have no gateway to call — refunding those is purely a
  // bookkeeping status change; reconciling the actual cash return happens
  // outside the system, same as the original cash collection did.

  const updated = await withTenantRLS(ctx.organizationId, (tx) =>
    tx.payment.update({ where: { id: paymentId }, data: { status: "REFUNDED" } })
  );

  await writeAuditLog({
    action: "payment.refunded",
    entityType: "Payment",
    entityId: paymentId,
    before: { status: "SUCCESS" },
    after: { status: "REFUNDED", refundedAmount: amountMinorUnits ?? payment.amount },
  });

  return updated;
}

interface ListPaymentsFilters {
  status?: "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
  categoryId?: string;
  membershipId?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export async function listPayments(filters: ListPaymentsFilters) {
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.membershipId ? { membershipId: filters.membershipId } : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: new Date(filters.from) } : {}),
            ...(filters.to ? { lte: new Date(filters.to) } : {}),
          },
        }
      : {}),
  };

  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true, type: true } },
        membership: { include: { user: { select: { firstName: true, lastName: true } } } },
        receipt: { select: { id: true, receiptNumber: true, pdfUrl: true } },
      },
    }),
  ]);

  return {
    payments,
    pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) },
  };
}

/** A member's own payment history — scoped to their membership regardless
 * of what filters they pass, so one member can never query another's. */
export async function listMyPayments(userId: string, page: number, pageSize: number) {
  const membership = await prisma.membership.findFirst({ where: { userId } });
  if (!membership) throw ApiError.forbidden("No active membership found.");

  return listPayments({ membershipId: membership.id, page, pageSize });
}

export async function getPayment(paymentId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId },
    include: {
      category: true,
      membership: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      receipt: true,
    },
  });
  if (!payment) throw ApiError.notFound("Payment not found.");
  return payment;
}
