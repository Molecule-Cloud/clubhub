import { z } from "zod";

export const listPublicEventsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  }),
});


export const publicEventIdParamSchema = z.object({
  params: z.object({ eventId: z.string().cuid() }),
})


