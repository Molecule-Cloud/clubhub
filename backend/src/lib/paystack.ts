import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";
import { ApiError } from "../utils/ApiError";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

interface InitializeTransactionInput {
  email: string;
  amountMinorUnits: number; // pesewas — Paystack's amount field is minor units too
  reference: string;
  metadata?: Record<string, unknown>;
  callbackUrl?: string;
}

interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export async function initializeTransaction(
  input: InitializeTransactionInput
): Promise<InitializeTransactionResult> {
  if (!env.PAYSTACK_SECRET_KEY) {
    throw ApiError.internal("Payment gateway is not configured.");
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountMinorUnits,
      reference: input.reference,
      currency: "GHS",
      metadata: input.metadata,
      callback_url: input.callbackUrl,
    }),
  });

  const json = (await response.json()) as {
    status: boolean;
    message: string;
    data?: { authorization_url: string; access_code: string; reference: string };
  };

  if (!response.ok || !json.status || !json.data) {
    throw ApiError.badRequest(`Payment initialization failed: ${json.message}`);
  }

  return {
    authorizationUrl: json.data.authorization_url,
    accessCode: json.data.access_code,
    reference: json.data.reference,
  };
}

interface VerifyTransactionResult {
  status: "success" | "failed" | "abandoned" | "pending";
  reference: string;
  amountMinorUnits: number;
  paidAt: string | null;
  channel: string | null;
}

/**
 * Direct server-to-server verification against Paystack — used both as a
 * fallback path (client polls "check my payment status") and, in principle,
 * could be used to double-check a webhook event. Never trust a client's
 * claim of payment success without going through either this or the webhook.
 */
export async function verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
  if (!env.PAYSTACK_SECRET_KEY) {
    throw ApiError.internal("Payment gateway is not configured.");
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
  });

  const json = (await response.json()) as {
    status: boolean;
    message: string;
    data?: { status: string; reference: string; amount: number; paid_at: string | null; channel: string | null };
  };

  if (!response.ok || !json.status || !json.data) {
    throw ApiError.badRequest(`Payment verification failed: ${json.message}`);
  }

  return {
    status: json.data.status as VerifyTransactionResult["status"],
    reference: json.data.reference,
    amountMinorUnits: json.data.amount,
    paidAt: json.data.paid_at,
    channel: json.data.channel,
  };
}

/**
 * Verifies the `x-paystack-signature` header against a raw request body
 * using a constant-time comparison (timingSafeEqual) — a naive `===` string
 * comparison on a signature is itself a timing side-channel.
 */
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  if (!env.PAYSTACK_WEBHOOK_SECRET || !signatureHeader) return false;

  const expected = createHmac("sha512", env.PAYSTACK_WEBHOOK_SECRET).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(signatureHeader, "utf8");

  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

/** Initiates a refund via Paystack. Amount omitted = full refund. */
export async function refundTransaction(reference: string, amountMinorUnits?: number): Promise<void> {
  if (!env.PAYSTACK_SECRET_KEY) {
    throw ApiError.internal("Payment gateway is not configured.");
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transaction: reference, ...(amountMinorUnits ? { amount: amountMinorUnits } : {}) }),
  });

  const json = (await response.json()) as { status: boolean; message: string };
  if (!response.ok || !json.status) {
    throw ApiError.badRequest(`Refund failed: ${json.message}`);
  }
}
