import { prisma } from "../../lib/prisma";
import { env } from "../../lib/env";
import { generateReceiptPdf } from "../../lib/receiptGenerator";
import { uploadBuffer } from "../../lib/cloudinary";
import { sendEmail } from "../../lib/mailer";

async function generateReceiptNumber(organizationId: string, orgSlug: string): Promise<string> {
  // Same simple counter approach as membership numbers (see members.service.ts) —
  // acceptable at club-meeting payment volumes; would need a DB sequence if
  // ClubHub ever processes concurrent bulk payment batches.
  const count = await prisma.receipt.count({ where: { organizationId } });
  const sequence = String(count + 1).padStart(6, "0");
  return `${orgSlug.slice(0, 6).toUpperCase()}-RCPT-${sequence}`;
}

/**
 * Generates and persists a receipt for a SUCCESS payment. Called from the
 * webhook handler (Paystack payments) and directly from manual payment
 * recording. Idempotent: if a Receipt already exists for this payment
 * (e.g. a duplicate webhook delivery), returns the existing one instead of
 * generating a second PDF.
 */
export async function issueReceiptForPayment(paymentId: string) {
  const existing = await prisma.receipt.findUnique({ where: { paymentId } });
  if (existing) return existing;

  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: {
      category: true,
      membership: { include: { user: true, organization: true } },
    },
  });

  if (payment.status !== "SUCCESS") {
    throw new Error(`Cannot issue a receipt for a payment with status ${payment.status}`);
  }

  const org = payment.membership.organization;
  const receiptNumber = await generateReceiptNumber(payment.organizationId, org.slug);
  const verificationUrl = `${env.CLIENT_URL}/verify-receipt/${receiptNumber}`;

  const pdfBuffer = await generateReceiptPdf({
    receiptNumber,
    organizationName: org.name,
    organizationLogoUrl: org.logoUrl,
    primaryColor: org.primaryColor,
    memberName: `${payment.membership.user.firstName} ${payment.membership.user.lastName}`,
    categoryName: payment.category.name,
    amountMinorUnits: payment.amount,
    currency: payment.currency,
    gatewayRef: payment.gatewayRef,
    status: payment.status,
    paidAt: payment.paidAt ?? new Date(),
    verificationUrl,
  });

  const pdfUrl = await uploadBuffer(pdfBuffer, {
    folder: `clubhub/${org.slug}/receipts`,
    publicId: receiptNumber,
    resourceType: "raw",
  });

  const receipt = await prisma.receipt.create({
    data: {
      organizationId: payment.organizationId,
      paymentId: payment.id,
      receiptNumber,
      pdfUrl,
      qrCodeData: verificationUrl,
    },
  });

  await sendEmail({
    to: payment.membership.user.email,
    subject: `Your receipt from ${org.name}`,
    html: `<p>Thank you for your payment of ${payment.currency} ${(payment.amount / 100).toFixed(2)} for ${payment.category.name}.</p><p><a href="${pdfUrl}">Download your receipt</a></p>`,
  });

  return receipt;
}
