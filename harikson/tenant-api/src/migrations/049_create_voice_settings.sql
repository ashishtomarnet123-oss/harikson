-- Migration 049: Create voice_settings table
CREATE TABLE IF NOT EXISTS voice_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    language VARCHAR(16) DEFAULT 'en-US',
    voice_name VARCHAR(128),
    rate NUMERIC(3,2) DEFAULT 1.05,
    pitch NUMERIC(3,2) DEFAULT 1.00,
    vad_threshold INT DEFAULT -42,
    echo_gate_enabled BOOLEAN DEFAULT TRUE,
    push_to_talk BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_settings_user ON voice_settings(user_id);

ALTER TABLE voice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_settings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON voice_settings;
CREATE POLICY tenant_isolation_policy ON voice_settings
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
