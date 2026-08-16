import { PrismaClient, Prisma } from "@prisma/client";
import { TENANT_SCOPED_MODELS } from "../constants/tenantModels";
import { tryGetRequestContext } from "./requestContext";
import { isProd } from "./env";

const basePrisma = new PrismaClient({
  log: isProd ? ["error", "warn"] : ["error", "warn", "query"],
});

// Operations that read/filter rows — these get a `where.organizationId` merged in.
const FILTER_OPERATIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
]);

// Operations that write new rows — these get `organizationId` merged into `data`.
const WRITE_OPERATIONS = new Set(["create", "createMany"]);

/**
 * Tenant-scoping extension.
 *
 * For every operation against a model listed in TENANT_SCOPED_MODELS, this
 * automatically injects the current request's organizationId — into `where`
 * for reads/updates/deletes, into `data` for creates. Engineers writing
 * `prisma.payment.findMany()` inside a request get correct isolation without
 * remembering to filter manually.
 *
 * `findUnique` is deliberately NOT auto-scoped here (Prisma requires unique
 * fields only in its where clause) — call sites using findUnique on a
 * tenant-scoped model MUST verify organizationId on the result themselves,
 * or use findFirst instead. This is enforced via code review + the lint
 * rule described in docs/API.md (Phase 2 backend module work).
 */
export const prisma = basePrisma.$extends({
  name: "tenant-scoping",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!TENANT_SCOPED_MODELS.has(model)) {
          return query(args);
        }

        const ctx = tryGetRequestContext();
      

        // Pre-auth contexts (no organizationId yet) legitimately query
        // tenant-scoped models sometimes — e.g. during org onboarding, we
        // create the first Membership within the same transaction that
        // creates the Organization. In that case the caller is expected to
        // pass organizationId explicitly in args, and we don't override it.
        if (!ctx?.organizationId) {
          return query(args);
        }

        const scopedArgs = { ...(args as Record<string, unknown>) };

        if (WRITE_OPERATIONS.has(operation)) {
          if (operation === "create") {
            scopedArgs.data = { ...(scopedArgs.data as object), organizationId: ctx.organizationId };
          } else if (operation === "createMany") {
            const data = scopedArgs.data as object[];
            scopedArgs.data = data.map((row) => ({ ...row, organizationId: ctx.organizationId }));
          }
        } else if (FILTER_OPERATIONS.has(operation)) {
          scopedArgs.where = { ...(scopedArgs.where as object), organizationId: ctx.organizationId };
        }

        return query(scopedArgs as never);
      },
    },
  },
});

export type TenantScopedPrisma = typeof prisma;
export { Prisma };


/**
 * Tenant-scoped models require `organizationId` in Prisma's generated
 * create-input types, because Prisma's type generator only reads the
 * schema — it has no idea the extension above injects organizationId
 * automatically at runtime.
 *
 * This helper is the ONE place in the codebase where we tell TypeScript
 * "trust the extension for this one field." Every other required field
 * on the model is still fully type-checked as normal — we are not
 * turning off type safety, we're correcting one known false positive.
 *
 * Usage:
 *   await prisma.auditLog.create({
 *     data: scopedCreateData<Prisma.AuditLogUncheckedCreateInput>({
 *       userId: ctx.userId,
 *       action: "member.role_changed",
 *       // organizationId intentionally omitted — the extension adds it
 *     }),
 *   });
 */
export function scopedCreateData<T extends { organizationId: string }>(
  data: Omit<T, "organizationId">
): T {
  return data as T;
}
