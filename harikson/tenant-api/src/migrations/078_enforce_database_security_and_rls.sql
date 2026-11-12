-- =========================================================================
-- Migration 078: Complete Database Security, RLS Hardening & Multi-Tenant Isolation
--
-- Closes Phase 3 Database Audit Findings:
-- 1. Adds tenant_id to user-owned and entity tables lacking explicit tenant isolation.
-- 2. Backfills tenant_id from parent users records to preserve existing customer data.
-- 3. Enables and FORCES Row Level Security (RLS) across all 18 unshielded tables
--    plus administrative/platform credential tables.
-- 4. Establishes fail-closed RLS policies utilizing current_setting('app.current_tenant', true).
-- 5. Preserves public submission paths (contact_submissions, career_applications)
--    while strictly preventing cross-tenant read/write leakage.
-- =========================================================================

BEGIN;

-- =========================================================================
-- PART 1: Schema Enhancements — Add tenant_id & Backfill from Parent Entities
-- =========================================================================

-- 1.1 user_passkeys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_passkeys' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE user_passkeys ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE user_passkeys p
SET tenant_id = u.tenant_id
FROM users u
WHERE p.user_id = u.id AND p.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_passkeys_tenant_id ON user_passkeys(tenant_id);

-- 1.2 user_developer_configs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_developer_configs' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE user_developer_configs ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE user_developer_configs d
SET tenant_id = u.tenant_id
FROM users u
WHERE d.user_id = u.id AND d.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_developer_configs_tenant_id ON user_developer_configs(tenant_id);

-- 1.3 user_profile_events
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profile_events' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE user_profile_events ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

UPDATE user_profile_events e
SET tenant_id = u.tenant_id
FROM users u
WHERE e.user_id = u.id AND e.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_profile_events_tenant_id ON user_profile_events(tenant_id);

-- 1.4 payment_webhooks
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_webhooks' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE payment_webhooks ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_webhooks_tenant_id ON payment_webhooks(tenant_id);

-- 1.5 workflow_templates
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workflow_templates' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE workflow_templates ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workflow_templates_tenant_id ON workflow_templates(tenant_id);


-- =========================================================================
-- PART 2: Enable & Force Row Level Security (RLS) on Tenant Tables
-- =========================================================================

-- 2.1 tenant_custom_models
ALTER TABLE tenant_custom_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_custom_models FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON tenant_custom_models;
CREATE POLICY tenant_isolation_policy ON tenant_custom_models
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- 2.2 support_tickets
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON support_tickets;
CREATE POLICY tenant_isolation_policy ON support_tickets
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- 2.3 privacy_grievances
ALTER TABLE privacy_grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_grievances FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON privacy_grievances;
CREATE POLICY tenant_isolation_policy ON privacy_grievances
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- 2.4 user_passkeys
ALTER TABLE user_passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_passkeys FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON user_passkeys;
CREATE POLICY tenant_isolation_policy ON user_passkeys
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- 2.5 user_developer_configs
ALTER TABLE user_developer_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_developer_configs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON user_developer_configs;
CREATE POLICY tenant_isolation_policy ON user_developer_configs
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- 2.6 user_profile_events
ALTER TABLE user_profile_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON user_profile_events;
CREATE POLICY tenant_isolation_policy ON user_profile_events
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- 2.7 cookie_consent_log
ALTER TABLE cookie_consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookie_consent_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON cookie_consent_log;
CREATE POLICY tenant_isolation_policy ON cookie_consent_log
    FOR ALL
    USING (
        tenant_id IS NULL 
        OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        tenant_id IS NULL 
        OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );

-- 2.8 conversation_shares (Public resolution allowed when inactive/expired context is empty; tenant-scoped otherwise)
ALTER TABLE conversation_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_shares FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON conversation_shares;
CREATE POLICY tenant_isolation_policy ON conversation_shares
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
        OR (
            NULLIF(current_setting('app.current_tenant', true), '') IS NULL 
            AND is_active = true 
            AND (expires_at IS NULL OR expires_at > NOW())
        )
    )
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- 2.9 payment_webhooks (Background worker ingestion when context is NULL; tenant isolation when context is set)
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON payment_webhooks;
CREATE POLICY tenant_isolation_policy ON payment_webhooks
    FOR ALL
    USING (
        NULLIF(current_setting('app.current_tenant', true), '') IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        NULLIF(current_setting('app.current_tenant', true), '') IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    );

-- 2.10 workflow_templates (Public official templates readable across platform; tenant templates isolated)
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON workflow_templates;
CREATE POLICY tenant_isolation_policy ON workflow_templates
    FOR ALL
    USING (
        is_public = true
        OR tenant_id IS NULL
        OR tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
    )
    WITH CHECK (
        tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
        OR NULLIF(current_setting('app.current_tenant', true), '') IS NULL
    );


-- =========================================================================
-- PART 3: Public Ingestion / Intake Lead Tables RLS
-- =========================================================================

-- 3.1 contact_submissions
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contact_insert_policy ON contact_submissions;
CREATE POLICY contact_insert_policy ON contact_submissions
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS contact_admin_select_policy ON contact_submissions;
CREATE POLICY contact_admin_select_policy ON contact_submissions
    FOR ALL
    USING (NULLIF(current_setting('app.current_tenant', true), '') IS NULL);

-- 3.2 career_applications
ALTER TABLE career_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_applications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS career_insert_policy ON career_applications;
CREATE POLICY career_insert_policy ON career_applications
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS career_admin_select_policy ON career_applications;
CREATE POLICY career_admin_select_policy ON career_applications
    FOR ALL
    USING (NULLIF(current_setting('app.current_tenant', true), '') IS NULL);


-- =========================================================================
-- PART 4: Platform Singletons & Executive / Founder Intelligence Tables RLS
-- =========================================================================

-- 4.1 founder_dashboard_state
ALTER TABLE founder_dashboard_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_dashboard_state FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS founder_state_admin_policy ON founder_dashboard_state;
CREATE POLICY founder_state_admin_policy ON founder_dashboard_state
    FOR ALL USING (NULLIF(current_setting('app.current_tenant', true), '') IS NULL);

-- 4.2 founder_dashboard_access_log
ALTER TABLE founder_dashboard_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_dashboard_access_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS founder_log_admin_policy ON founder_dashboard_access_log;
CREATE POLICY founder_log_admin_policy ON founder_dashboard_access_log
    FOR ALL USING (NULLIF(current_setting('app.current_tenant', true), '') IS NULL);

-- 4.3 founder_hypotheses
ALTER TABLE founder_hypotheses ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_hypotheses FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS founder_hypotheses_admin_policy ON founder_hypotheses;
CREATE POLICY founder_hypotheses_admin_policy ON founder_hypotheses
    FOR ALL USING (NULLIF(current_setting('app.current_tenant', true), '') IS NULL);

-- 4.4 founder_narrative_mentions
ALTER TABLE founder_narrative_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_narrative_mentions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS founder_mentions_admin_policy ON founder_narrative_mentions;
CREATE POLICY founder_mentions_admin_policy ON founder_narrative_mentions
    FOR ALL USING (NULLIF(current_setting('app.current_tenant', true), '') IS NULL);

-- 4.5 founder_opportunities
ALTER TABLE founder_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_opportunities FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS founder_opportunities_admin_policy ON founder_opportunities;
CREATE POLICY founder_opportunities_admin_policy ON founder_opportunities
    FOR ALL USING (NULLIF(current_setting('app.current_tenant', true), '') IS NULL);

-- 4.6 founder_threats
ALTER TABLE founder_threats ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_threats FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS founder_threats_admin_policy ON founder_threats;
CREATE POLICY founder_threats_admin_policy ON founder_threats
    FOR ALL USING (NULLIF(current_setting('app.current_tenant', true), '') IS NULL);


-- =========================================================================
-- PART 5: Administrative Control Plane Tables RLS
-- =========================================================================

-- 5.1 admin_audit_log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_audit_log_policy ON admin_audit_log;
CREATE POLICY admin_audit_log_policy ON admin_audit_log
    FOR ALL USING (NULLIF(current_setting('app.current_tenant', true), '') IS NULL);

-- 5.2 smtp_configs
ALTER TABLE smtp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE smtp_configs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS smtp_configs_admin_policy ON smtp_configs;
CREATE POLICY smtp_configs_admin_policy ON smtp_configs
    FOR ALL USING (NULLIF(current_setting('app.current_tenant', true), '') IS NULL);

-- 5.3 email_templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS email_templates_admin_policy ON email_templates;
CREATE POLICY email_templates_admin_policy ON email_templates
    FOR ALL USING (NULLIF(current_setting('app.current_tenant', true), '') IS NULL);

COMMIT;

