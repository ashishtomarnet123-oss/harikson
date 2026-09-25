-- Migration 053: Workflow V2 Schema & Versioned DAG Architecture
-- Implements workflow_versions, workflow_node_executions, workflow_credentials, and workflow_templates
-- with full PostgreSQL Row Level Security (RLS) and multi-tenant isolation.

-- 1. Upgrade workflows table with version pointer and execution settings
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS current_version INT DEFAULT 1;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS published_version_id UUID;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS active_version_id UUID;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"timeoutMs": 300000, "maxConcurrency": 10, "failurePolicy": "stop"}'::jsonb;

-- 2. Create workflow_versions table
CREATE TABLE IF NOT EXISTS workflow_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    version INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, validated, published, active, paused, archived
    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL DEFAULT '{"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}}'::jsonb,
    settings JSONB DEFAULT '{"timeoutMs": 300000, "maxConcurrency": 10, "failurePolicy": "stop"}'::jsonb,
    changelog TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_workflow_version UNIQUE (workflow_id, version)
);

-- Enable RLS on workflow_versions
ALTER TABLE workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_versions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON workflow_versions;
CREATE POLICY tenant_isolation_policy ON workflow_versions
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

CREATE INDEX IF NOT EXISTS idx_workflow_versions_wf_ver ON workflow_versions(workflow_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_versions_tenant_status ON workflow_versions(tenant_id, status);

-- Add foreign key constraint back to workflows if not exists
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_workflows_published_version' AND table_name = 'workflows'
    ) THEN
        ALTER TABLE workflows 
        ADD CONSTRAINT fk_workflows_published_version 
        FOREIGN KEY (published_version_id) REFERENCES workflow_versions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Upgrade workflow_executions table with version tracking and idempotency
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS workflow_version_id UUID REFERENCES workflow_versions(id) ON DELETE SET NULL;
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS current_node_id VARCHAR(100);
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS context_data JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_workflow_executions_version ON workflow_executions(workflow_version_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_idempotency ON workflow_executions(tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 4. Create workflow_node_executions table (Durable Execution Checkpoints)
CREATE TABLE IF NOT EXISTS workflow_node_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    workflow_version_id UUID REFERENCES workflow_versions(id) ON DELETE SET NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    node_id VARCHAR(100) NOT NULL,
    node_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, queued, running, success, failed, skipped, waiting, canceled
    input JSONB,
    output JSONB,
    error JSONB,
    retry_count INT DEFAULT 0,
    duration_ms INT DEFAULT 0,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_node_execution_attempt UNIQUE (execution_id, node_id)
);

-- Enable RLS on workflow_node_executions
ALTER TABLE workflow_node_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_node_executions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON workflow_node_executions;
CREATE POLICY tenant_isolation_policy ON workflow_node_executions
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

CREATE INDEX IF NOT EXISTS idx_node_executions_exec_node ON workflow_node_executions(execution_id, node_id);
CREATE INDEX IF NOT EXISTS idx_node_executions_tenant_status ON workflow_node_executions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_node_executions_wf ON workflow_node_executions(workflow_id, started_at DESC);

-- 5. Create workflow_credentials table (Encrypted Credential Storage)
CREATE TABLE IF NOT EXISTS workflow_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- api_key, bearer_token, basic_auth, oauth2, smtp, openai, anthropic, slack, discord, postgres
    encrypted_data TEXT NOT NULL, -- AES-256-GCM encrypted payload with IV and auth tag
    metadata JSONB DEFAULT '{}'::jsonb, -- Masked preview, expiry, domain restrictions
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on workflow_credentials
ALTER TABLE workflow_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_credentials FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON workflow_credentials;
CREATE POLICY tenant_isolation_policy ON workflow_credentials
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

CREATE INDEX IF NOT EXISTS idx_workflow_credentials_tenant_type ON workflow_credentials(tenant_id, type);

-- 6. Create workflow_templates table
CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'General', -- AI, Support, Sales, Marketing, DevOps, Productivity
    definition JSONB NOT NULL,
    required_credentials JSONB DEFAULT '[]'::jsonb,
    required_integrations JSONB DEFAULT '[]'::jsonb,
    thumbnail_url TEXT,
    author VARCHAR(100) DEFAULT 'Xarwiz Official',
    is_public BOOLEAN DEFAULT true,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_category ON workflow_templates(category, is_public);

-- 7. Seed initial workflow_versions for any existing workflows that have definitions
DO $$
DECLARE
    wf_record RECORD;
    v_def JSONB;
BEGIN
    FOR wf_record IN SELECT id, tenant_id, name, description, definition, steps FROM workflows LOOP
        -- Check if version 1 already exists
        IF NOT EXISTS (SELECT 1 FROM workflow_versions WHERE workflow_id = wf_record.id AND version = 1) THEN
            -- Determine definition: if definition is valid graph use it, otherwise convert steps
            IF wf_record.definition IS NOT NULL AND (wf_record.definition->'nodes') IS NOT NULL THEN
                v_def := wf_record.definition;
            ELSE
                v_def := jsonb_build_object(
                    'nodes', COALESCE(wf_record.steps, '[]'::jsonb),
                    'edges', '[]'::jsonb,
                    'viewport', jsonb_build_object('x', 0, 'y', 0, 'zoom', 1)
                );
            END IF;

            INSERT INTO workflow_versions (
                workflow_id, tenant_id, version, status, name, description, definition
            ) VALUES (
                wf_record.id, wf_record.tenant_id, 1, 'published', wf_record.name, wf_record.description, v_def
            );

            -- Point workflow to published version 1
            UPDATE workflows 
            SET current_version = 1,
                published_version_id = (SELECT id FROM workflow_versions WHERE workflow_id = wf_record.id AND version = 1),
                active_version_id = (SELECT id FROM workflow_versions WHERE workflow_id = wf_record.id AND version = 1)
            WHERE id = wf_record.id;
        END IF;
    END LOOP;
END $$;
