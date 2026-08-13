import { z } from "zod";

export const revenueReportSchema = z.object({
  query: z.object({
    bucket: z.enum(["day", "month", "year"]).default("month"),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
});

export const attendanceReportSchema = z.object({
  query: z.object({
    eventId: z.string().cuid().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
});

export const membershipGrowthSchema = z.object({
  query: z.object({
    bucket: z.enum(["day", "month", "year"]).default("month"),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
});

export const exportPaymentsSchema = z.object({
  query: z.object({
    status: z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
});
