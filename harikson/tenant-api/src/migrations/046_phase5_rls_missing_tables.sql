-- Phase 5: Add RLS to remaining tenant-scoped tables that were missed

-- email_logs
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON email_logs;
CREATE POLICY tenant_isolation_policy ON email_logs
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- legal_holds
ALTER TABLE legal_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_holds FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON legal_holds;
CREATE POLICY tenant_isolation_policy ON legal_holds
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- legal_hold_audit_logs
ALTER TABLE legal_hold_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_hold_audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON legal_hold_audit_logs;
CREATE POLICY tenant_isolation_policy ON legal_hold_audit_logs
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- integration_synced_files
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integration_synced_files') THEN
    EXECUTE 'ALTER TABLE integration_synced_files ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE integration_synced_files FORCE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS tenant_isolation_policy ON integration_synced_files';
    EXECUTE 'CREATE POLICY tenant_isolation_policy ON integration_synced_files FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant'', true), '''')::uuid)';
  END IF;
END $$;

-- refresh_tokens (tenant_id is nullable, so allow NULL tenant_id rows for superadmin)
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON refresh_tokens;
CREATE POLICY tenant_isolation_policy ON refresh_tokens
    FOR ALL
    USING (
      tenant_id IS NULL
      OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );

-- user_prompt_presets
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_prompt_presets') THEN
    EXECUTE 'ALTER TABLE user_prompt_presets ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE user_prompt_presets FORCE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS tenant_isolation_policy ON user_prompt_presets';
    EXECUTE 'CREATE POLICY tenant_isolation_policy ON user_prompt_presets FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant'', true), '''')::uuid)';
  END IF;
END $$;

-- widget_analytics
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'widget_analytics') THEN
    EXECUTE 'ALTER TABLE widget_analytics ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE widget_analytics FORCE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS tenant_isolation_policy ON widget_analytics';
    EXECUTE 'CREATE POLICY tenant_isolation_policy ON widget_analytics FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant'', true), '''')::uuid)';
  END IF;
END $$;

-- Fix knowledge_documents RLS policy to use safe current_setting pattern
DROP POLICY IF EXISTS tenant_isolation_policy ON knowledge_documents;
CREATE POLICY tenant_isolation_policy ON knowledge_documents
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- Also fix messages, conversations, agents if they have the unsafe pattern
DO $$ BEGIN
  -- messages
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND qual LIKE '%current_setting(''app.current_tenant'')%') THEN
    EXECUTE 'DROP POLICY IF EXISTS tenant_isolation_policy ON messages';
    EXECUTE 'CREATE POLICY tenant_isolation_policy ON messages FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant'', true), '''')::uuid)';
  END IF;
  -- conversations
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND qual LIKE '%current_setting(''app.current_tenant'')%') THEN
    EXECUTE 'DROP POLICY IF EXISTS tenant_isolation_policy ON conversations';
    EXECUTE 'CREATE POLICY tenant_isolation_policy ON conversations FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant'', true), '''')::uuid)';
  END IF;
  -- agents
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agents' AND qual LIKE '%current_setting(''app.current_tenant'')%') THEN
    EXECUTE 'DROP POLICY IF EXISTS tenant_isolation_policy ON agents';
    EXECUTE 'CREATE POLICY tenant_isolation_policy ON agents FOR ALL USING (tenant_id = NULLIF(current_setting(''app.current_tenant'', true), '''')::uuid)';
  END IF;
END $$;
