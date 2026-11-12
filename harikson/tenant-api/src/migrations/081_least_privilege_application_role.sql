-- ==============================================================================
-- Migration 081: Least-Privilege Application Role & Financial Ledger Immutability
-- ==============================================================================
-- 1. Create dedicated unprivileged application role (NOSUPERUSER, NOBYPASSRLS)
-- 2. Grant runtime operational privileges (SELECT, INSERT, UPDATE on tenant tables)
-- 3. Revoke UPDATE and DELETE on immutable financial ledger and audit log
-- ==============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'xarwiz_app') THEN
    CREATE ROLE xarwiz_app WITH 
      LOGIN 
      PASSWORD 'xarwiz_app_secure_password_2026' 
      NOSUPERUSER 
      NOCREATEDB 
      NOCREATEROLE 
      NOREPLICATION 
      NOBYPASSRLS;
  ELSE
    ALTER ROLE xarwiz_app WITH 
      LOGIN 
      NOSUPERUSER 
      NOCREATEDB 
      NOCREATEROLE 
      NOREPLICATION 
      NOBYPASSRLS;
  END IF;
END $$;

-- Database and schema access
GRANT CONNECT ON DATABASE neuravolt TO xarwiz_app;
GRANT USAGE ON SCHEMA public TO xarwiz_app;

-- Table operations
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO xarwiz_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO xarwiz_app;

-- Enforce financial and audit immutability: deny UPDATE and DELETE
REVOKE UPDATE, DELETE ON credit_ledger FROM xarwiz_app;
REVOKE UPDATE, DELETE ON admin_audit_log FROM xarwiz_app;
REVOKE UPDATE, DELETE ON legal_hold_audit_logs FROM xarwiz_app;

-- Default privileges for future migrations created by postgres / neuravolt owner
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO xarwiz_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO xarwiz_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE UPDATE, DELETE ON TABLES FROM xarwiz_app;

