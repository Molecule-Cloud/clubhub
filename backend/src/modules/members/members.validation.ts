import { z } from "zod";

export const inviteMemberSchema = z.object({
  body: z.object({
    email: z.string().email(),
    roleId: z.string().cuid(),
  }),
});

export const createRoleSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    permissions: z.array(z.string()).default([]),
  }),
});

export const renameRoleSchema = z.object({
  params: z.object({ roleId: z.string().cuid() }),
  body: z.object({ name: z.string().min(2).max(100) }),
});

export const setRolePermissionsSchema = z.object({
  params: z.object({ roleId: z.string().cuid() }),
  body: z.object({ permissions: z.array(z.string()) }),
});

export const roleIdParamSchema = z.object({
  params: z.object({ roleId: z.string().cuid() }),
});

export const acceptInvitationSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/)
      .regex(/[a-z]/)
      .regex(/[0-9]/),
  }),
});

export const listMembersSchema = z.object({
  query: z.object({
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "ALUMNI"]).optional(),
    roleId: z.string().cuid().optional(),
    search: z.string().max(200).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const memberIdParamSchema = z.object({
  params: z.object({
    membershipId: z.string().cuid(),
  }),
});

export const updateMemberRoleSchema = z.object({
  params: z.object({ membershipId: z.string().cuid() }),
  body: z.object({ roleId: z.string().cuid() }),
});

export const updateMemberStatusSchema = z.object({
  params: z.object({ membershipId: z.string().cuid() }),
  body: z.object({ status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "ALUMNI"]) }),
});
