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
