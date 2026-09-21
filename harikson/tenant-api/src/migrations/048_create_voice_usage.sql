-- Migration 048: Create voice_usage table
CREATE TABLE IF NOT EXISTS voice_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES voice_sessions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stt_chars INT DEFAULT 0,
    tts_chars INT DEFAULT 0,
    llm_tokens INT DEFAULT 0,
    ttfa_ms INT, -- Time to first audio in ms
    browser VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_usage_tenant ON voice_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_voice_usage_session ON voice_usage(session_id);
CREATE INDEX IF NOT EXISTS idx_voice_usage_created_at ON voice_usage(created_at);

ALTER TABLE voice_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_usage FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_policy ON voice_usage;
CREATE POLICY tenant_isolation_policy ON voice_usage
    FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
