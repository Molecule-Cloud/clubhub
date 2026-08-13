import { z } from "zod";

export const updateOrganizationSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(200).optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().max(30).nullable().optional(),
    address: z.string().max(500).nullable().optional(),
    // Accepts any valid CSS hex color — validated loosely here since the
    // admin UI's color picker already constrains input; this guards
    // against a malformed value reaching stored branding data (which
    // flows straight into generated PDF receipts) rather than replicating
    // full CSS color-syntax validation.
    primaryColor: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color like #2563EB")
      .nullable()
      .optional(),
  }),
});
