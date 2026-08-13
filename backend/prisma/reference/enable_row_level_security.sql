-- ClubHub — Enable Row-Level Security on all tenant-scoped tables
--
-- This is a DEFENSE-IN-DEPTH layer, not the primary isolation mechanism.
-- Primary enforcement is the Prisma Client Extension in src/lib/prisma.ts,
-- which auto-injects organizationId on every query for every request.
--
-- RLS here protects against: a bug in application code that bypasses the
-- extension (e.g. a raw $queryRaw call), a future engineer who reaches for
-- basePrisma instead of the scoped `prisma` export, or a compromised
-- application credential being used directly against the database.
--
-- IMPORTANT — how the session variable gets set:
-- Because Railway/PgBouncer-style connection pooling means a single HTTP
-- request cannot reliably hold one dedicated connection for its whole
-- lifetime, we do NOT attempt to set `app.current_org_id` for every request
-- globally. Instead, src/lib/withTenantRLS.ts opens a short-lived, explicit
-- transaction around the highest-risk mutations (role changes, member
-- removal, payment approval) and sets the GUC just for that transaction.
-- Everything else relies on the Prisma extension alone, which is correct
-- and sufficient for the vast majority of queries.
--
-- Run via: npx prisma migrate dev (or migrate deploy in production)

-- Helper: the app's runtime DB role must NOT bypass RLS as table owner would.
-- FORCE ROW LEVEL SECURITY ensures RLS applies even to the table owner —
-- without this, RLS is silently skipped for the very connection the app uses.

ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_memberships ON "memberships"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_invitations ON "invitations"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_roles ON "roles"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_payments ON "payments"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "payment_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payment_categories" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_payment_categories ON "payment_categories"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "receipts" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_receipts ON "receipts"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_projects ON "projects"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "project_contributions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_contributions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_project_contributions ON "project_contributions"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_events ON "events"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "event_registrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_registrations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_event_registrations ON "event_registrations"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_attendance ON "attendance"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "announcements" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_announcements ON "announcements"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_audit_logs ON "audit_logs"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);

-- NOTE: current_setting(..., true) with the `true` (missing_ok) argument
-- returns NULL instead of raising an error when the GUC hasn't been set.
-- NULL = anything is never true in SQL, so a connection that never calls
-- withTenantRLS() simply sees zero rows on these tables via that policy —
-- it does NOT fall back to "see everything." Fail-closed by design.
