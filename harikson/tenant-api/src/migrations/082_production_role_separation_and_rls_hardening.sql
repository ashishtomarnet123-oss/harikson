-- ==============================================================================
-- Migration 082: Production Role Cutover, Least-Privilege Separation & Fail-Closed RLS
-- ==============================================================================
-- 1. Create distinct least-privilege roles for tenant-api, admin-api, and migrator
-- 2. Strip blanket public privileges and apply explicit table grants
-- 3. Restrict administrative/founder data strictly to admin role
-- 4. Enforce fail-closed RLS policies targeted specifically to xarwiz_tenant_app
-- 5. Preserve financial ledger immutability across all application identities
-- ==============================================================================

BEGIN;

-- 1. Role Provisioning
DO $$
BEGIN
  -- Tenant Application Role (tenant-api runtime)
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'xarwiz_tenant_app') THEN
    CREATE ROLE xarwiz_tenant_app WITH 
      LOGIN 
      PASSWORD 'tenant_app_secure_password_vault' 
      NOSUPERUSER 
      NOCREATEDB 
      NOCREATEROLE 
      NOREPLICATION 
      NOBYPASSRLS;
  ELSE
    ALTER ROLE xarwiz_tenant_app WITH 
      LOGIN 
      NOSUPERUSER 
      NOCREATEDB 
      NOCREATEROLE 
      NOREPLICATION 
      NOBYPASSRLS;
  END IF;

  -- Admin Application Role (admin-api runtime)
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'xarwiz_admin_app') THEN
    CREATE ROLE xarwiz_admin_app WITH 
      LOGIN 
      PASSWORD 'admin_app_secure_password_vault' 
      NOSUPERUSER 
      NOCREATEDB 
      NOCREATEROLE 
      NOREPLICATION 
      NOBYPASSRLS;
  ELSE
    ALTER ROLE xarwiz_admin_app WITH 
      LOGIN 
      NOSUPERUSER 
      NOCREATEDB 
      NOCREATEROLE 
      NOREPLICATION 
      NOBYPASSRLS;
  END IF;

  -- Controlled Migration Role (non-superuser DDL runner)
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'xarwiz_migrator') THEN
    CREATE ROLE xarwiz_migrator WITH 
      LOGIN 
      PASSWORD 'migrator_secure_password_vault' 
      NOSUPERUSER 
      NOCREATEDB 
      NOCREATEROLE 
      NOREPLICATION 
      NOBYPASSRLS;
  ELSE
    ALTER ROLE xarwiz_migrator WITH 
      LOGIN 
      NOSUPERUSER 
      NOCREATEDB 
      NOCREATEROLE 
      NOREPLICATION 
      NOBYPASSRLS;
  END IF;
END $$;

-- Database & Schema Grants
GRANT CONNECT ON DATABASE neuravolt TO xarwiz_tenant_app, xarwiz_admin_app, xarwiz_migrator;
GRANT USAGE ON SCHEMA public TO xarwiz_tenant_app, xarwiz_admin_app;
GRANT ALL PRIVILEGES ON SCHEMA public TO xarwiz_migrator;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO xarwiz_migrator;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO xarwiz_migrator;

-- Strip blanket permissions from PUBLIC
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

-- Sequence Usage
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO xarwiz_tenant_app, xarwiz_admin_app;

-- ==============================================================================
-- 2. Table Permission Boundaries
-- ==============================================================================

-- A. Reference & Public Meta Tables
GRANT SELECT ON public.tenants, public.plans, public.tax_rates, public.payment_providers, 
                public.consent_purposes, public.privacy_notices, public.email_templates 
  TO xarwiz_tenant_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants, public.plans, public.tax_rates, 
                                        public.payment_providers, public.consent_purposes, 
                                        public.privacy_notices, public.email_templates 
  TO xarwiz_admin_app;

-- B. Public Lead / Intake Tables
GRANT INSERT ON public.contact_submissions, public.career_applications TO xarwiz_tenant_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_submissions, public.career_applications TO xarwiz_admin_app;

-- C. Strict Administrative Tables (Completely REVOKED from tenant-api)
REVOKE ALL ON public.admin_audit_log, public.founder_dashboard_state, 
              public.founder_dashboard_access_log, public.founder_hypotheses, 
              public.founder_narrative_mentions, public.founder_opportunities, 
              public.founder_threats, public.infrastructure_costs, 
              public.system_metrics, public.backup_verification, public.migrations_meta,
              public.smtp_configs
  FROM xarwiz_tenant_app;

GRANT SELECT, INSERT, UPDATE ON public.founder_dashboard_state, 
                                public.founder_dashboard_access_log, public.founder_hypotheses, 
                                public.founder_narrative_mentions, public.founder_opportunities, 
                                public.founder_threats, public.infrastructure_costs, 
                                public.system_metrics, public.backup_verification, public.migrations_meta,
                                public.smtp_configs
  TO xarwiz_admin_app;

-- Immutable Admin Audit Log: Append-only (REVOKE UPDATE and DELETE)
GRANT SELECT, INSERT ON public.admin_audit_log TO xarwiz_admin_app;
REVOKE UPDATE, DELETE ON public.admin_audit_log FROM xarwiz_admin_app;

-- D. Tenant Operational Tables (63 Tables with tenant_id)
DO $$
DECLARE
  tbl_name text;
  tenant_tables text[] := ARRAY[
    'activity_logs', 'agents', 'ai_activity', 'api_keys', 'archived_users', 'backups',
    'consent_audit_events', 'conversation_shares', 'conversation_summaries', 'conversations',
    'cookie_consent_log', 'credit_ledger', 'document_collections', 'document_embeddings',
    'email_logs', 'file_chunks', 'file_index_state', 'image_generations',
    'integration_activity_logs', 'integration_connections', 'integration_sync_jobs',
    'integration_synced_files', 'integrations', 'invoices', 'knowledge_bases',
    'knowledge_documents', 'legal_hold_audit_logs', 'legal_holds', 'memories',
    'messages', 'notifications', 'oauth_states', 'password_reset_tokens',
    'payment_webhooks', 'playground_sessions', 'privacy_grievances', 'privacy_requests',
    'refresh_tokens', 'subscriptions', 'support_tickets',
    'task_plans', 'tenant_api_keys', 'tenant_custom_models', 'tool_executions',
    'user_consents', 'user_developer_configs', 'user_passkeys', 'user_profile_events',
    'user_prompt_presets', 'user_sessions', 'users', 'vector_collections',
    'voice_sessions', 'voice_settings', 'voice_usage', 'webhook_events',
    'widget_analytics', 'workflow_credentials', 'workflow_executions',
    'workflow_node_executions', 'workflow_templates', 'workflow_versions', 'workflows'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY tenant_tables LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO xarwiz_tenant_app, xarwiz_admin_app', tbl_name);
  END LOOP;
END $$;

-- E. Financial Ledger Immutability: Revoke UPDATE and DELETE on credit_ledger from ALL app roles
REVOKE UPDATE, DELETE ON public.credit_ledger FROM xarwiz_tenant_app, xarwiz_admin_app;
REVOKE UPDATE, DELETE ON public.legal_hold_audit_logs FROM xarwiz_tenant_app, xarwiz_admin_app;

-- ==============================================================================
-- 3. Fail-Closed RLS Policy Hardening for 63 Tenant-Owned Tables
-- ==============================================================================

DO $$
DECLARE
  tbl_name text;
  standard_tenant_tables text[] := ARRAY[
    'activity_logs', 'agents', 'ai_activity', 'api_keys', 'archived_users', 'backups',
    'consent_audit_events', 'conversation_summaries', 'conversations',
    'credit_ledger', 'document_collections', 'document_embeddings',
    'email_logs', 'file_chunks', 'file_index_state', 'image_generations',
    'integration_activity_logs', 'integration_connections', 'integration_sync_jobs',
    'integration_synced_files', 'integrations', 'invoices', 'knowledge_bases',
    'knowledge_documents', 'legal_hold_audit_logs', 'legal_holds', 'memories',
    'messages', 'notifications', 'oauth_states', 'password_reset_tokens',
    'playground_sessions', 'privacy_grievances', 'privacy_requests',
    'refresh_tokens', 'subscriptions', 'support_tickets',
    'task_plans', 'tenant_api_keys', 'tenant_custom_models', 'tool_executions',
    'user_consents', 'user_developer_configs', 'user_passkeys', 'user_profile_events',
    'user_prompt_presets', 'user_sessions', 'users', 'vector_collections',
    'voice_sessions', 'voice_settings', 'voice_usage', 'webhook_events',
    'widget_analytics', 'workflow_credentials', 'workflow_executions',
    'workflow_node_executions', 'workflow_versions', 'workflows'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY standard_tenant_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON public.%I', tbl_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_tenant_app ON public.%I', tbl_name);
    EXECUTE format('DROP POLICY IF EXISTS admin_access_policy ON public.%I', tbl_name);

    -- Fail-closed RLS policy: evaluated exclusively for xarwiz_tenant_app
    EXECUTE format(
      'CREATE POLICY tenant_isolation_tenant_app ON public.%I ' ||
      'FOR ALL TO xarwiz_tenant_app ' ||
      'USING (tenant_id = NULLIF(current_setting(''app.current_tenant'', true), '''')::uuid) ' ||
      'WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant'', true), '''')::uuid)',
      tbl_name
    );

    -- Admin access policy: administrative access across tenants
    EXECUTE format(
      'CREATE POLICY admin_access_policy ON public.%I ' ||
      'FOR ALL TO xarwiz_admin_app ' ||
      'USING (true) ' ||
      'WITH CHECK (true)',
      tbl_name
    );
  END LOOP;
END $$;

-- ==============================================================================
-- 4. Specialized Policies (Shares, Public Intake, Webhooks)
-- ==============================================================================

-- 4.1 conversation_shares
DROP POLICY IF EXISTS tenant_isolation_policy ON public.conversation_shares;
DROP POLICY IF EXISTS tenant_isolation_tenant_app ON public.conversation_shares;
DROP POLICY IF EXISTS admin_access_policy ON public.conversation_shares;
CREATE POLICY tenant_isolation_tenant_app ON public.conversation_shares
  FOR ALL TO xarwiz_tenant_app
  USING (
    tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    OR (is_active = true AND (expires_at IS NULL OR expires_at > NOW()))
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
CREATE POLICY admin_access_policy ON public.conversation_shares
  FOR ALL TO xarwiz_admin_app USING (true) WITH CHECK (true);

-- 4.2 workflow_templates
DROP POLICY IF EXISTS tenant_isolation_policy ON public.workflow_templates;
DROP POLICY IF EXISTS tenant_isolation_tenant_app ON public.workflow_templates;
DROP POLICY IF EXISTS admin_access_policy ON public.workflow_templates;
CREATE POLICY tenant_isolation_tenant_app ON public.workflow_templates
  FOR ALL TO xarwiz_tenant_app
  USING (
    tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    OR is_public = true
    OR tenant_id IS NULL
  )
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
CREATE POLICY admin_access_policy ON public.workflow_templates
  FOR ALL TO xarwiz_admin_app USING (true) WITH CHECK (true);

-- 4.3 cookie_consent_log
DROP POLICY IF EXISTS tenant_isolation_policy ON public.cookie_consent_log;
DROP POLICY IF EXISTS tenant_isolation_tenant_app ON public.cookie_consent_log;
DROP POLICY IF EXISTS admin_access_policy ON public.cookie_consent_log;
CREATE POLICY tenant_isolation_tenant_app ON public.cookie_consent_log
  FOR ALL TO xarwiz_tenant_app
  USING (
    tenant_id IS NULL 
    OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    tenant_id IS NULL 
    OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );
CREATE POLICY admin_access_policy ON public.cookie_consent_log
  FOR ALL TO xarwiz_admin_app USING (true) WITH CHECK (true);

-- 4.4 payment_webhooks
DROP POLICY IF EXISTS tenant_isolation_policy ON public.payment_webhooks;
DROP POLICY IF EXISTS tenant_isolation_tenant_app ON public.payment_webhooks;
DROP POLICY IF EXISTS admin_access_policy ON public.payment_webhooks;
CREATE POLICY tenant_isolation_tenant_app ON public.payment_webhooks
  FOR ALL TO xarwiz_tenant_app
  USING (
    NULLIF(current_setting('app.current_tenant', true), '') IS NULL
    OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  )
  WITH CHECK (
    NULLIF(current_setting('app.current_tenant', true), '') IS NULL
    OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
  );
CREATE POLICY admin_access_policy ON public.payment_webhooks
  FOR ALL TO xarwiz_admin_app USING (true) WITH CHECK (true);

-- 4.5 Intake Lead Tables (contact_submissions, career_applications)
DROP POLICY IF EXISTS contact_insert_policy ON public.contact_submissions;
DROP POLICY IF EXISTS contact_admin_select_policy ON public.contact_submissions;
DROP POLICY IF EXISTS contact_admin_policy ON public.contact_submissions;
CREATE POLICY contact_insert_policy ON public.contact_submissions
  FOR INSERT TO xarwiz_tenant_app WITH CHECK (true);
CREATE POLICY contact_admin_policy ON public.contact_submissions
  FOR ALL TO xarwiz_admin_app USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS career_insert_policy ON public.career_applications;
DROP POLICY IF EXISTS career_admin_select_policy ON public.career_applications;
DROP POLICY IF EXISTS career_admin_policy ON public.career_applications;
CREATE POLICY career_insert_policy ON public.career_applications
  FOR INSERT TO xarwiz_tenant_app WITH CHECK (true);
CREATE POLICY career_admin_policy ON public.career_applications
  FOR ALL TO xarwiz_admin_app USING (true) WITH CHECK (true);

-- 4.6 Administrative Tables RLS policies (founder_*, admin_audit_log, smtp_configs, email_templates)
DO $$
DECLARE
  adm_tbl text;
  adm_tables text[] := ARRAY[
    'founder_dashboard_state', 'founder_dashboard_access_log', 'founder_hypotheses',
    'founder_narrative_mentions', 'founder_opportunities', 'founder_threats',
    'admin_audit_log', 'smtp_configs'
  ];
BEGIN
  FOREACH adm_tbl IN ARRAY adm_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_admin_policy ON public.%I', adm_tbl, adm_tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_policy ON public.%I', adm_tbl, adm_tbl);
    EXECUTE format('DROP POLICY IF EXISTS admin_access_policy ON public.%I', adm_tbl);

    EXECUTE format(
      'CREATE POLICY admin_access_policy ON public.%I ' ||
      'FOR ALL TO xarwiz_admin_app ' ||
      'USING (true) ' ||
      'WITH CHECK (true)',
      adm_tbl
    );
  END LOOP;
END $$;

-- 4.7 email_templates: readable by tenant app, managed by admin app
DROP POLICY IF EXISTS email_templates_admin_policy ON public.email_templates;
DROP POLICY IF EXISTS email_templates_tenant_policy ON public.email_templates;
DROP POLICY IF EXISTS admin_access_policy ON public.email_templates;
CREATE POLICY email_templates_tenant_policy ON public.email_templates
  FOR SELECT TO xarwiz_tenant_app USING (true);
CREATE POLICY admin_access_policy ON public.email_templates
  FOR ALL TO xarwiz_admin_app USING (true) WITH CHECK (true);

COMMIT;
