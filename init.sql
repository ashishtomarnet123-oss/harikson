-- Harikson Multi-Tenant Database Schema Initialization
-- Enabling UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABLE CREATION
-- ==========================================

-- Tenants Table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    plan VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tenant_email UNIQUE (tenant_id, email)
);

-- Conversations Table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Messages Table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_message_role CHECK (role IN ('user', 'assistant', 'system'))
);

-- Trigger to auto-update conversations.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 2. ROW-LEVEL SECURITY (RLS) CONFIGURATION
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create RLS context getter function
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

CREATE POLICY tenant_isolation_policy ON tenants
    FOR ALL
    USING (id = get_tenant_context())
    WITH CHECK (id = get_tenant_context());

CREATE POLICY tenant_isolation_policy ON users
    FOR ALL
    USING (tenant_id = get_tenant_context())
    WITH CHECK (tenant_id = get_tenant_context());

CREATE POLICY tenant_isolation_policy ON conversations
    FOR ALL
    USING (tenant_id = get_tenant_context())
    WITH CHECK (tenant_id = get_tenant_context());

CREATE POLICY tenant_isolation_policy ON messages
    FOR ALL
    USING (tenant_id = get_tenant_context())
    WITH CHECK (tenant_id = get_tenant_context());

-- ==========================================
-- 3. UTILITY HELPER FUNCTIONS
-- ==========================================

-- Helper function to easily set session-level current tenant variable
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant', tenant_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
