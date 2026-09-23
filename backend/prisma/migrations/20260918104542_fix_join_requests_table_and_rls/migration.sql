-- Final correction for join_requests: the table has been created under
-- the wrong (hyphenated) name twice now due to schema.prisma itself
-- drifting from the intended model (@@map was "join-requests", email/
-- firstName/lastName were nullable). schema.prisma has now been fixed to
-- match — this migration brings the actual database in line with it, and
-- (re-)enables RLS, which was silently dropped when the previous
-- reset_prisma_migrations migration DROP TABLE'd the correctly-named
-- table out from under its policy.

ALTER TABLE "join-requests" RENAME TO "join_requests";
ALTER TABLE "join_requests" RENAME CONSTRAINT "join-requests_pkey" TO "join_requests_pkey";
ALTER TABLE "join_requests" RENAME CONSTRAINT "join-requests_organizationId_fkey" TO "join_requests_organizationId_fkey";
ALTER TABLE "join_requests" RENAME CONSTRAINT "join-requests_eventId_fkey" TO "join_requests_eventId_fkey";
ALTER INDEX "join-requests_organizationId_status_idx" RENAME TO "join_requests_organizationId_status_idx";

ALTER TABLE "join_requests" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "join_requests" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "join_requests" ALTER COLUMN "lastName" SET NOT NULL;

ALTER TABLE "join_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "join_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_join_requests ON "join_requests"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);