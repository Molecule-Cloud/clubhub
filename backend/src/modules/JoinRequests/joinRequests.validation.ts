import { z } from "zod"


export const createJoinRequestSchema = z.object({
  params: z.object({ slug: z.string().min(1) }),
  body: z.object({
    eventId: z.string().cuid().optional(),
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().max(30).optional(),
    message: z.string().max(1000).optional(),
  }),
});

export const listJoinRequestSchema = z.object({
  query: z.object({
    status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
});

export const approveJoinRequestSchema = z.object({
  params: z.object({ joinRequestId: z.string().cuid() }),
  body: z.object({roleId: z.string().cuid() }),
});

export const rejectJoinRequestSchema = z.object({
  params: z.object({ joinRequestId: z.string().cuid() }),
});