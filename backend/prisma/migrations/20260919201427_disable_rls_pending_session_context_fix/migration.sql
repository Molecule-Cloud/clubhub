-- This is an empty migration.-- Temporarily disables FORCE ROW LEVEL SECURITY across all tenant-scoped
-- tables. RLS was enabled (20260816194601_enable_row_level_security)
-- assuming every authenticated request would set app.current_org_id via
-- Postgres's session-level GUC — but tenantContextMiddleware only ever
-- sets AsyncLocalStorage context for the Prisma extension (application-
-- layer scoping), never the Postgres session variable RLS checks. Since
-- these tables use FORCE ROW LEVEL SECURITY, an unset session variable
-- means every ordinary read silently returns zero rows — not an error,
-- just invisible data — for every query that doesn't go through the
-- narrow withTenantRLS() helper.
--
-- This does NOT remove tenant isolation: the Prisma Client Extension in
-- lib/prisma.ts continues to filter every query by organizationId at the
-- application layer, exactly as it has for the whole life of this project
-- so far. This migration removes a second, currently-misconfigured safety
-- net, not the actual isolation mechanism.
--
-- Re-enable once tenantContextMiddleware (or the Prisma extension itself)
-- is updated to also set app.current_org_id via set_config on every
-- request, not just inside the small set of functions currently using
-- withTenantRLS() directly.

ALTER TABLE "memberships" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "invitations" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_categories" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "receipts" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "events" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "announcements" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "join_requests" DISABLE ROW LEVEL SECURITY;