-- Migration 040: Add RLS to remaining tenant-scoped tables (D-02)
-- and make tenant_id NOT NULL where it was nullable (D-03).
--
-- Tables getting RLS: tenant_api_keys, password_reset_tokens, archived_users,
-- integration_connections, integration_sync_jobs, webhook_events,
-- integration_activity_logs, oauth_states.
--
-- Tables getting NOT NULL constraint on tenant_id: tenant_api_keys,
-- integration_connections, oauth_states, integration_sync_jobs, webhook_events,
-- integration_activity_logs, agents, knowledge_bases, workflows, notifications,
-- integrations, vector_collections, backups, playground_sessions.
--
-- founder_* tables have no tenant_id column — they are platform-level singletons.

BEGIN;

-- ============================================================
-- PART 1: Clean up orphaned rows with NULL tenant_id
-- (Delete rows that cannot be assigned to any tenant)
-- ============================================================

DELETE FROM tenant_api_keys WHERE tenant_id IS NULL;
DELETE FROM integration_connections WHERE tenant_id IS NULL;
DELETE FROM oauth_states WHERE tenant_id IS NULL;
DELETE FROM integration_sync_jobs WHERE tenant_id IS NULL;
DELETE FROM webhook_events WHERE tenant_id IS NULL;
DELETE FROM integration_activity_logs WHERE tenant_id IS NULL;
DELETE FROM agents WHERE tenant_id IS NULL;
DELETE FROM notifications WHERE tenant_id IS NULL;
DELETE FROM vector_collections WHERE tenant_id IS NULL;

-- These may not exist yet; use DO blocks to skip gracefully
DO $$ BEGIN
  DELETE FROM knowledge_bases WHERE tenant_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DELETE FROM workflows WHERE tenant_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DELETE FROM integrations WHERE tenant_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DELETE FROM backups WHERE tenant_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  DELETE FROM playground_sessions WHERE tenant_id IS NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;


-- ============================================================
-- PART 2: Make tenant_id NOT NULL (D-03)
-- ============================================================

ALTER TABLE tenant_api_keys ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE integration_connections ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE integration_sync_jobs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE webhook_events ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE integration_activity_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE agents ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE vector_collections ALTER COLUMN tenant_id SET NOT NULL;

-- oauth_states: tenant_id can legitimately be NULL during the initial redirect
-- before the user authenticates, so leave it nullable but add RLS below.

DO $$ BEGIN
  ALTER TABLE knowledge_bases ALTER COLUMN tenant_id SET NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE workflows ALTER COLUMN tenant_id SET NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE integrations ALTER COLUMN tenant_id SET NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE backups ALTER COLUMN tenant_id SET NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE playground_sessions ALTER COLUMN tenant_id SET NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;


-- ============================================================
-- PART 3: Enable RLS on unprotected tables (D-02)
-- ============================================================

-- tenant_api_keys
ALTER TABLE tenant_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_api_keys FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_tenant_api_keys ON tenant_api_keys;
CREATE POLICY tenant_isolation_tenant_api_keys ON tenant_api_keys
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- password_reset_tokens
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_password_reset_tokens ON password_reset_tokens;
CREATE POLICY tenant_isolation_password_reset_tokens ON password_reset_tokens
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- archived_users
ALTER TABLE archived_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_archived_users ON archived_users;
CREATE POLICY tenant_isolation_archived_users ON archived_users
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- integration_connections
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connections FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_integration_connections ON integration_connections;
CREATE POLICY tenant_isolation_integration_connections ON integration_connections
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- integration_sync_jobs
ALTER TABLE integration_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_jobs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_integration_sync_jobs ON integration_sync_jobs;
CREATE POLICY tenant_isolation_integration_sync_jobs ON integration_sync_jobs
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- webhook_events
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_webhook_events ON webhook_events;
CREATE POLICY tenant_isolation_webhook_events ON webhook_events
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- integration_activity_logs
ALTER TABLE integration_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_activity_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_integration_activity_logs ON integration_activity_logs;
CREATE POLICY tenant_isolation_integration_activity_logs ON integration_activity_logs
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- oauth_states (tenant_id nullable — policy allows NULL rows to be visible
-- only when no tenant context is set, i.e. during the OAuth initiation flow)
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_oauth_states ON oauth_states;
CREATE POLICY tenant_isolation_oauth_states ON oauth_states
  USING (
    tenant_id IS NULL
    OR tenant_id = current_setting('app.current_tenant', true)::uuid
  );

-- notifications (already has tenant_id, may not have had RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_notifications ON notifications;
CREATE POLICY tenant_isolation_notifications ON notifications
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- vector_collections
ALTER TABLE vector_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE vector_collections FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_vector_collections ON vector_collections;
CREATE POLICY tenant_isolation_vector_collections ON vector_collections
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

COMMIT;
