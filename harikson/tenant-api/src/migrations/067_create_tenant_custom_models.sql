-- Migration 067: Create tenant_custom_models table for custom models feature
-- Governed by plans.features.custom_models (Enterprise tier entitlement)

CREATE TABLE IF NOT EXISTS tenant_custom_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    model_identifier VARCHAR(255) NOT NULL,
    base_model VARCHAR(100) NOT NULL DEFAULT 'qwen3-8b',
    provider VARCHAR(50) NOT NULL DEFAULT 'custom',
    endpoint_url TEXT,
    encrypted_api_key TEXT,
    api_key_masked VARCHAR(50),
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_custom_model_identifier UNIQUE (tenant_id, model_identifier)
);

CREATE INDEX IF NOT EXISTS idx_tenant_custom_models_tenant ON tenant_custom_models(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_custom_models_identifier ON tenant_custom_models(model_identifier);
