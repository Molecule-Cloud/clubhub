import { z } from "zod";

export const createProjectSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(200),
    description: z.string().min(1).max(5000),
    budget: z.number().int().positive().optional(), // minor units
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({ projectId: z.string().cuid() }),
  body: z.object({
    title: z.string().min(2).max(200).optional(),
    description: z.string().min(1).max(5000).optional(),
    budget: z.number().int().positive().nullable().optional(),
    status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
    startDate: z.string().datetime().nullable().optional(),
    endDate: z.string().datetime().nullable().optional(),
  }),
});

export const projectIdParamSchema = z.object({
  params: z.object({ projectId: z.string().cuid() }),
});

export const listProjectsSchema = z.object({
  query: z.object({
    status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const createMilestoneSchema = z.object({
  params: z.object({ projectId: z.string().cuid() }),
  body: z.object({
    title: z.string().min(1).max(300),
    dueDate: z.string().datetime().optional(),
  }),
});

export const updateMilestoneSchema = z.object({
  params: z.object({ projectId: z.string().cuid(), milestoneId: z.string().cuid() }),
  body: z.object({
    title: z.string().min(1).max(300).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    completed: z.boolean().optional(), // convenience flag; service translates to completedAt
  }),
});
