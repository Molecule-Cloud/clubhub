-- Creates a restricted, non-superuser application role for the test
-- database. Postgres superusers ALWAYS bypass Row-Level Security,
-- no matter what policies exist — so meaningfully testing RLS requires
-- connecting as a role that is actually capable of being blocked by it.
--
-- This runs automatically on container startup (Postgres's official
-- Docker image runs any .sql file in /docker-entrypoint-initdb.d on
-- first-time initialization — which, since our data directory is
-- tmpfs-backed and never persists, means this runs on every fresh start).
CREATE ROLE user_one WITH LOGIN PASSWORD 'password_one' NOSUPERUSER NOBYPASSRLS;

GRANT CONNECT ON DATABASE clubhub_test TO user_one;
GRANT USAGE ON SCHEMA public TO user_one;

-- Prisma migrations run as the superuser ("test") and create tables
-- AFTER this script runs. This rule means any table that role creates
-- from now on automatically grants user_one read/write access, without
-- us needing to re-grant privileges by hand after every migration.
ALTER DEFAULT PRIVILEGES FOR ROLE test IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO user_one;

ALTER DEFAULT PRIVILEGES FOR ROLE test IN SCHEMA public
  GRANT TRUNCATE ON TABLES TO user_one;