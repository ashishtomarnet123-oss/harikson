-- ==============================================================================
-- DEPRECATED: Table creations in this file are deprecated.
-- The Prisma schema (backend/prisma/schema.prisma) is the single source of truth.
-- SQL migrations are generated via "prisma migrate dev" and deployed on startup.
-- This file now only handles PostgreSQL extensions, custom procedures, and policies.
-- ==============================================================================
-- MIGRATION: Update RLS Policies & Tenant context validation

-- 1. Create assert_tenant_context() function
CREATE OR REPLACE FUNCTION assert_tenant_context()
RETURNS VOID AS $$
DECLARE
    val TEXT := current_setting('app.current_tenant', true);
BEGIN
    IF val IS NULL OR val = '' THEN
        RAISE EXCEPTION 'Tenant context (app.current_tenant) is not set. Query aborted to prevent cross-tenant data leakage.';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Update get_tenant_context for backwards compatibility
CREATE OR REPLACE FUNCTION get_tenant_context()
RETURNS UUID AS $$
DECLARE
    val TEXT;
BEGIN
    val := current_setting('app.current_tenant', true);
    IF val IS NULL OR val = '' THEN
        RAISE EXCEPTION 'Database tenant context is not set. Access Denied.';
    END IF;
    RETURN val::uuid;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Force Enable Row-Level Security on targeted tables
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;

ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases FORCE ROW LEVEL SECURITY;

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows FORCE ROW LEVEL SECURITY;

-- 3. Recreate policies to use the new pattern
-- tenants
DROP POLICY IF EXISTS tenant_isolation_policy ON tenants;

-- users
DROP POLICY IF EXISTS tenant_isolation_policy ON users;
CREATE POLICY tenant_isolation_policy ON users
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid AND deleted_at IS NULL)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid AND deleted_at IS NULL);

-- conversations
DROP POLICY IF EXISTS tenant_isolation_policy ON conversations;
CREATE POLICY tenant_isolation_policy ON conversations
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid AND deleted_at IS NULL)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid AND deleted_at IS NULL);

-- messages
DROP POLICY IF EXISTS tenant_isolation_policy ON messages;
CREATE POLICY tenant_isolation_policy ON messages
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid AND deleted_at IS NULL)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid AND deleted_at IS NULL);

-- knowledge_bases
DROP POLICY IF EXISTS tenant_isolation_policy ON knowledge_bases;
CREATE POLICY tenant_isolation_policy ON knowledge_bases
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- workflows
DROP POLICY IF EXISTS tenant_isolation_policy ON workflows;
CREATE POLICY tenant_isolation_policy ON workflows
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Recreate plans, subscriptions and invoices tables with correct schema
DROP POLICY IF EXISTS tenant_isolation_policy ON subscriptions;
DROP POLICY IF EXISTS tenant_isolation_policy ON invoices;

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_subscription;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_subscription_id_fkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS fk_invoices_tenant;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_tenant_id_fkey;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS fk_subscriptions_tenant;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tenant_id_fkey;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS fk_subscriptions_plan;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_fkey;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS unique_provider_subscription_id;

-- Plans Table IF NOT EXISTS
CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(50) NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    billing VARCHAR(50) NOT NULL DEFAULT 'monthly',
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_recommended BOOLEAN NOT NULL DEFAULT false,
    token_limit INTEGER NOT NULL DEFAULT -1,
    tenant_limit INTEGER NOT NULL DEFAULT -1,
    agent_limit INTEGER NOT NULL DEFAULT -1,
    model_access TEXT[] NOT NULL DEFAULT '{}',
    features JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions Table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('stripe', 'razorpay')),
    provider_subscription_id VARCHAR(255) NOT NULL,
    plan_id VARCHAR(50) NOT NULL REFERENCES plans(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'past_due', 'cancelled', 'unpaid', 'paused')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    amount DECIMAL,
    currency VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_provider_subscription UNIQUE (provider, provider_subscription_id)
);

-- Invoices Table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL,
    provider_invoice_id VARCHAR(255) NOT NULL,
    amount DECIMAL,
    currency VARCHAR(50),
    status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void')),
    paid_at TIMESTAMPTZ,
    invoice_url TEXT,
    pdf_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_provider_invoice UNIQUE (provider, provider_invoice_id)
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON subscriptions(provider, provider_subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY tenant_isolation_policy ON subscriptions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_policy ON invoices
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Recreate reusable trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure updated_at columns exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE knowledge_bases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Re-create update triggers on all required tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workflows_updated_at ON workflows;
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_knowledge_bases_updated_at ON knowledge_bases;
CREATE TRIGGER update_knowledge_bases_updated_at BEFORE UPDATE ON knowledge_bases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add retention policy comment
COMMENT ON TABLE invoices IS 'Retention Policy: invoices kept for 7 years (tax compliance)';

-- Migration: add tenant_id columns to missing tables
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE vector_collections ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE backups ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE playground_sessions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Populate tenant_id data from parent objects
UPDATE knowledge_documents kd SET tenant_id = kb.tenant_id FROM knowledge_bases kb WHERE kd.knowledge_base_id = kb.id AND kd.tenant_id IS NULL;
UPDATE workflow_executions we SET tenant_id = w.tenant_id FROM workflows w WHERE we.workflow_id = w.id AND we.tenant_id IS NULL;
UPDATE notifications n SET tenant_id = u.tenant_id FROM users u WHERE n.user_id = u.id AND n.tenant_id IS NULL;
UPDATE playground_sessions ps SET tenant_id = u.tenant_id FROM users u WHERE ps.admin_id = u.id AND ps.tenant_id IS NULL;

-- Enable RLS and setup policies
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON agents;
CREATE POLICY tenant_isolation_policy ON agents
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON knowledge_documents;
CREATE POLICY tenant_isolation_policy ON knowledge_documents
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE ai_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_activity FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON ai_activity;
CREATE POLICY tenant_isolation_policy ON ai_activity
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON workflow_executions;
CREATE POLICY tenant_isolation_policy ON workflow_executions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON notifications;
CREATE POLICY tenant_isolation_policy ON notifications
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON integrations;
CREATE POLICY tenant_isolation_policy ON integrations
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE vector_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE vector_collections FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON vector_collections;
CREATE POLICY tenant_isolation_policy ON vector_collections
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE backups FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON backups;
CREATE POLICY tenant_isolation_policy ON backups
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

ALTER TABLE playground_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE playground_sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON playground_sessions;
CREATE POLICY tenant_isolation_policy ON playground_sessions
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Migration: Add Performance Indexes
CREATE INDEX IF NOT EXISTS idx_workflows_tenant ON workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_tenant ON knowledge_bases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_kb ON knowledge_documents(knowledge_base_id);
CREATE INDEX IF NOT EXISTS idx_ai_activity_tenant_created ON ai_activity(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vector_collections_tenant ON vector_collections(tenant_id);

-- Migration: Add 2FA columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[] DEFAULT '{}';

-- Migration: Enable workflows RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON workflows;
CREATE POLICY tenant_isolation_policy ON workflows
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Migration: Add avatar_url column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
