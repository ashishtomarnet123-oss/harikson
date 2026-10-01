-- Migration 058: Multi-Tenant AI Image Generation System
-- Adds image_generations table for tracking generated visual assets,
-- multi-tenant RLS isolation, storage references, prompts, metadata,
-- and monthly image quotas in the plans table.

-- 1. Create image_generations table
CREATE TABLE IF NOT EXISTS image_generations (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
    conversation_id      UUID REFERENCES conversations(id) ON DELETE SET NULL,
    message_id           UUID REFERENCES messages(id) ON DELETE SET NULL,
    
    prompt               TEXT NOT NULL,
    revised_prompt       TEXT,
    negative_prompt      TEXT,
    
    provider             VARCHAR(64) NOT NULL,
    model                VARCHAR(128) NOT NULL,
    aspect_ratio         VARCHAR(16) DEFAULT '1:1',
    width                INTEGER NOT NULL DEFAULT 1024,
    height               INTEGER NOT NULL DEFAULT 1024,
    
    storage_path         TEXT NOT NULL,
    public_url           TEXT NOT NULL,
    thumbnail_url        TEXT,
    blur_hash            VARCHAR(64),
    
    file_size_bytes      INTEGER DEFAULT 0,
    cost_credits         INTEGER DEFAULT 1,
    generation_time_ms   INTEGER DEFAULT 0,
    
    status               VARCHAR(32) NOT NULL DEFAULT 'completed',
    error_message        TEXT,
    metadata             JSONB DEFAULT '{}'::jsonb,
    
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS policies for multi-tenant isolation
ALTER TABLE image_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_generations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_image_generations ON image_generations;
CREATE POLICY tenant_isolation_image_generations ON image_generations
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

-- Indexes for rapid lookup
CREATE INDEX IF NOT EXISTS idx_img_gen_tenant_created 
    ON image_generations(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_img_gen_user 
    ON image_generations(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_img_gen_conv 
    ON image_generations(tenant_id, conversation_id);

-- 2. Add monthly image limit to plans table
ALTER TABLE plans 
    ADD COLUMN IF NOT EXISTS image_limit_monthly INTEGER NOT NULL DEFAULT 10;

-- Update existing plans with image generation allowances
UPDATE plans SET image_limit_monthly = 10 WHERE LOWER(id) = 'free' OR LOWER(name) LIKE '%free%';
UPDATE plans SET image_limit_monthly = 50 WHERE LOWER(id) = 'starter' OR LOWER(name) LIKE '%starter%';
UPDATE plans SET image_limit_monthly = 250 WHERE LOWER(id) = 'professional' OR LOWER(name) LIKE '%pro%';
UPDATE plans SET image_limit_monthly = -1 WHERE LOWER(id) = 'enterprise' OR LOWER(name) LIKE '%enterprise%';
