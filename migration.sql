-- MIGRATION: Update RLS Policies & Tenant context validation

-- 1. Create assert_tenant_context() function
CREATE OR REPLACE FUNCTION assert_tenant_context()
RETURNS VOID AS $$
DECLARE
    val TEXT;
BEGIN
    val := current_setting('app.current_tenant', true);
    IF val IS NULL OR val = '' THEN
        RAISE EXCEPTION 'Database tenant context is not set. Access Denied.';
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

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
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;

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
CREATE POLICY tenant_isolation_policy ON tenants
    FOR ALL
    USING (id = current_setting('app.current_tenant', true)::uuid AND deleted_at IS NULL)
    WITH CHECK (id = current_setting('app.current_tenant', true)::uuid AND deleted_at IS NULL);

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

DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS subscriptions;

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

-- Add update triggers
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add retention policy comment
COMMENT ON TABLE invoices IS 'Retention Policy: invoices kept for 7 years (tax compliance)';
