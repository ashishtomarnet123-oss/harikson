-- Phase 4: Add RLS to remaining tenant_id tables, fix archived_users, add missing indexes

-- ── RLS for tables with tenant_id that lack it ──────────────────────────

-- users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON users;
CREATE POLICY tenant_isolation_policy ON users
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- workflows
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON workflows;
CREATE POLICY tenant_isolation_policy ON workflows
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- workflow_executions
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON workflow_executions;
CREATE POLICY tenant_isolation_policy ON workflow_executions
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- knowledge_bases
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON knowledge_bases;
CREATE POLICY tenant_isolation_policy ON knowledge_bases
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- integrations
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON integrations;
CREATE POLICY tenant_isolation_policy ON integrations
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- backups
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON backups;
CREATE POLICY tenant_isolation_policy ON backups
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- playground_sessions (admin_id-based, but has tenant-scoped queries)
-- Note: playground_sessions may not have tenant_id in all deployments; skip if column missing
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'playground_sessions' AND column_name = 'tenant_id'
  ) THEN
    EXECUTE 'ALTER TABLE playground_sessions ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE playground_sessions FORCE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS tenant_isolation_policy ON playground_sessions';
    EXECUTE 'CREATE POLICY tenant_isolation_policy ON playground_sessions FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant'', true), '''')::uuid)';
  END IF;
END $$;

-- ── Fix archived_users: add primary key ─────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class r ON c.conrelid = r.oid
    WHERE r.relname = 'archived_users' AND c.contype = 'p'
  ) THEN
    -- Add PK on id column if it exists, otherwise add id column first
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'archived_users' AND column_name = 'id'
    ) THEN
      EXECUTE 'ALTER TABLE archived_users ADD PRIMARY KEY (id)';
    ELSE
      EXECUTE 'ALTER TABLE archived_users ADD COLUMN id UUID PRIMARY KEY DEFAULT uuid_generate_v4()';
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_archived_users_email ON archived_users (email);
CREATE INDEX IF NOT EXISTS idx_archived_users_tenant_id ON archived_users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_archived_users_archived_at ON archived_users (archived_at);

-- ── Missing indexes on high-traffic columns ─────────────────────────────

CREATE INDEX IF NOT EXISTS idx_agents_tenant_id ON agents (tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications (tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflows_tenant_id ON workflows (tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_tenant_id ON workflow_executions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_tenant_id ON knowledge_bases (tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_tenant_id ON integrations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_backups_tenant_id ON backups (tenant_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_legal_holds_tenant_id ON legal_holds (tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_id ON email_logs (tenant_id) WHERE tenant_id IS NOT NULL;
