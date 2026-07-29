-- Migration 030: tenant_api_keys is missing columns that user.routes.ts has
-- referenced since it was written (user_id, scopes, last_used_at, revoked_at —
-- see /api-keys and /developer/keys routes, both INSERT and SELECT). Without
-- these, every "create API key" / "list API keys" / "revoke API key" call in
-- both the user-panel Developer Settings tab and the /api-keys routes has
-- been failing at the database level with "column does not exist".

ALTER TABLE tenant_api_keys ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE tenant_api_keys ADD COLUMN IF NOT EXISTS scopes JSONB NOT NULL DEFAULT '["read"]';
ALTER TABLE tenant_api_keys ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
ALTER TABLE tenant_api_keys ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_user_id ON tenant_api_keys(user_id);
