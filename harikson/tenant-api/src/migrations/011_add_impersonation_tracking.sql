-- Migration 011: Add impersonation audit columns to activity_logs & ai_activity

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    action VARCHAR(255) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    action VARCHAR(255) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS impersonated_by UUID NULL;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS is_impersonation BOOLEAN DEFAULT false;

ALTER TABLE ai_activity ADD COLUMN IF NOT EXISTS impersonated_by UUID NULL;
ALTER TABLE ai_activity ADD COLUMN IF NOT EXISTS is_impersonation BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_activity_logs_impersonation ON activity_logs(is_impersonation) WHERE is_impersonation = true;
CREATE INDEX IF NOT EXISTS idx_ai_activity_impersonation ON ai_activity(is_impersonation) WHERE is_impersonation = true;
