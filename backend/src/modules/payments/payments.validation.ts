import { z } from "zod";
import { eventIdParamSchema } from "../events/events.validation";

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(150),
    type: z.enum(["DUES", "DONATION", "PROJECT_CONTRIBUTION", "FUNDRAISING", "EVENT_FEE", "LEVY", "CUSTOM"]),
    isRecurring: z.boolean().default(false),
    defaultAmount: z.number().int().positive().optional(), // minor units
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({ categoryId: z.string().cuid() }),
  body: z.object({
    name: z.string().min(2).max(150).optional(),
    isRecurring: z.boolean().optional(),
    defaultAmount: z.number().int().positive().nullable().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const initializePaymentSchema = z.object({
  body: z.object({
    categoryId: z.string().cuid(),
    amount: z.number().int().positive().optional(), // Recalculated by the service layer based on category.defaultAmount if not provided.
    projectId: z.string().cuid().optional(), // required in practice when category.type === PROJECT_CONTRIBUTION;
    eventId: z.string().cuid().optional(),
    // enforced in the service layer, not here, since it depends on the category's type.
    callbackUrl: z
      .string()
      .url()
      .optional(), // where Paystack redirects the browser after checkout completes.
    // Web (admin) doesn't currently send this and falls back to Paystack's
    // dashboard-configured default. Mobile sends a custom-scheme deep link
    // (e.g. "clubhub://payment-callback") so the app can detect completion
    // via expo-web-browser's openAuthSessionAsync instead of leaving the
    // person stranded in an external browser tab with no way back.
  }),
});

export const recordManualPaymentSchema = z.object({
  body: z.object({
    membershipId: z.string().cuid(),
    categoryId: z.string().cuid(),
    amount: z.number().int().positive(),
    projectId: z.string().cuid().optional(),
    eventId: z.string().cuid().optional(),
    notes: z.string().max(500).optional(),
  }),
});

export const listPaymentsSchema = z.object({
  query: z.object({
    status: z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED", "CANCELLED"]).optional(),
    categoryId: z.string().cuid().optional(),
    membershipId: z.string().cuid().optional(), // treasurer filtering by member
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const paymentIdParamSchema = z.object({
  params: z.object({ paymentId: z.string().cuid() }),
});

export const verifyPaymentSchema = z.object({
  params: z.object({ reference: z.string().min(1) }),
});

export const requestCashPaymentSchema = z.object({
  body: z.object({
    categoryId: z.string().cuid(),
    amount: z.number().int().positive(), // minor units, same convention as initializePayment
    projectId: z.string().cuid().optional(),
    eventId: z.string().cuid().optional(),
  }),
});

export const confirmCashPaymentSchema = z.object({
  params: z.object({ paymentId: z.string().cuid() }),
});

export const refundPaymentSchema = z.object({
  params: z.object({ paymentId: z.string().cuid() }),
  body: z.object({ amount: z.number().int().positive().optional() }), // omit = full refund
});

export const cancelPaymentSchema = z.object({
  params: z.object({ paymentId: z.string().cuid() }),
});