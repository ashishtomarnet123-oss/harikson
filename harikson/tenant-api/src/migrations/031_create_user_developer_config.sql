-- Migration 029: Real persistence for the Developer Settings tab
-- (webhook URL / signing secret / API version / CORS origins / debug flags),
-- which previously only faked a save with setTimeout and never touched the DB.

CREATE TABLE IF NOT EXISTS user_developer_configs (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    webhook_url TEXT,
    webhook_signing_secret VARCHAR(255),
    api_version VARCHAR(20) NOT NULL DEFAULT 'v1',
    cors_origins TEXT NOT NULL DEFAULT '*',
    verbose_logs BOOLEAN NOT NULL DEFAULT true,
    sandbox_mode BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
