import { z } from "zod";

export const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(10000),
    sendEmail: z.boolean().default(true),
    sendPush: z.boolean().default(true),
  }),
});

export const listAnnouncementsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const announcementIdParamSchema = z.object({
  params: z.object({ announcementId: z.string().cuid() }),
});
