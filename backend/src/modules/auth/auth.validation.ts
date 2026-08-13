import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a number");

export const registerOrganizationSchema = z.object({
  body: z.object({
    organization: z.object({
      name: z.string().min(2).max(200),
      type: z.enum([
        "ROTARY",
        "ROTARACT",
        "LIONS",
        "LEO",
        "CHURCH",
        "NGO",
        "ALUMNI",
        "PROFESSIONAL_BODY",
        "COMMUNITY_ASSOCIATION",
        "FOUNDATION",
        "OTHER",
      ]),
      contactEmail: z.string().email(),
      contactPhone: z.string().optional(),
    }),
    admin: z.object({
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      email: z.string().email(),
      phone: z.string().optional(),
      password: passwordSchema,
    }),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    userId: z.string().cuid(),
    code: z.string().length(6),
    purpose: z.enum(["EMAIL_VERIFICATION", "PASSWORD_RESET", "LOGIN_2FA"]),
  }),
});

export const resendOtpSchema = z.object({
  body: z.object({
    userId: z.string().cuid(),
    purpose: z.enum(["EMAIL_VERIFICATION", "PASSWORD_RESET", "LOGIN_2FA"]),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().max(30).nullable().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
    organizationSlug: z.string().min(1), // required: a user may belong to multiple orgs
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1).optional(), // optional: may arrive via httpOnly cookie instead
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    userId: z.string().cuid(),
    code: z.string().length(6),
    newPassword: passwordSchema,
  }),
});

export type RegisterOrganizationInput = z.infer<typeof registerOrganizationSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
