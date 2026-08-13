import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Opens a short-lived interactive transaction, sets the `app.current_org_id`
 * Postgres session variable via SET LOCAL (scoped to just this transaction),
 * and runs `fn` with a transaction client that the RLS policies in
 * migrations/20260730000000_enable_row_level_security will enforce against.
 *
 * Use this for the highest-risk mutations only — role/permission changes,
 * member removal, payment approval/refund. NOT intended as a wrapper for
 * every request; see the comment in the RLS migration file for why.
 *
 * The Prisma tenant-scoping extension (lib/prisma.ts) already filters by
 * organizationId at the application layer for everything, including calls
 * made through this helper — RLS here is a second, independent check, not
 * a replacement for it.
 */
export async function withTenantRLS<T>(
  organizationId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // SET LOCAL only accepts a literal or parameter via set_config — string
    // interpolation here is safe because organizationId is always a cuid()
    // we generated ourselves, never raw user input, but we use set_config's
    // parameterized form regardless as a matter of discipline.
    await tx.$executeRaw`SELECT set_config('app.current_org_id', ${organizationId}, true)`;
    return fn(tx);
  });
}
