ALTER TABLE "join_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "join_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_join_requests ON "join_requests"
  USING ("organizationId" = current_setting('app.current_org_id', true)::text);