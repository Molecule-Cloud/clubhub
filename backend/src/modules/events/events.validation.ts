import { z } from "zod";

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(200),
    description: z.string().max(5000).optional(),
    location: z.string().max(300).optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime().optional(),
    capacity: z.number().int().positive().optional(),
    ticketPrice: z.number().int().positive().optional(), // minor units; omit = free event
  }),
});

export const updateEventSchema = z.object({
  params: z.object({ eventId: z.string().cuid() }),
  body: z.object({
    title: z.string().min(2).max(200).optional(),
    description: z.string().max(5000).nullable().optional(),
    location: z.string().max(300).nullable().optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    capacity: z.number().int().positive().nullable().optional(),
    ticketPrice: z.number().int().positive().nullable().optional(),
  }),
});

export const eventIdParamSchema = z.object({
  params: z.object({ eventId: z.string().cuid() }),
});

export const listEventsSchema = z.object({
  query: z.object({
    upcoming: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const checkInSchema = z.object({
  params: z.object({ eventId: z.string().cuid() }),
  body: z.object({ code: z.string().min(1) }),
});

export const staffCheckInSchema = z.object({
  params: z.object({ eventId: z.string().cuid(), membershipId: z.string().cuid() }),
});

export const recordAttendanceSchema = z.object({
  body: z.object({
    membershipId: z.string().cuid(),
    eventId: z.string().cuid().optional(), // omit for general (non-event) meeting attendance
  }),
});
