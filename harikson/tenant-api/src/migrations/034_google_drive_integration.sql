-- Migration 034: real Google Workspace & Drive integration support.
--
-- integration_connections (from migration 023) already has status/settings/
-- last_sync_at tracking, but nothing to actually store an OAuth token — it
-- was designed for admin-api's simulated connect flow, which never stored a
-- real token at all (only an 8-char hint). This adds real encrypted token
-- storage (same AES-256-GCM pattern as knowledge_documents) plus the
-- connected account's profile fields the frontend needs to display.
--
-- Also switches uniqueness from (tenant_id, provider_id) to
-- (tenant_id, user_id, provider_id): this integration is a per-user
-- connection (each user connects their own personal Google account), not a
-- single tenant-wide credential like a payment provider.

ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS provider_account_id TEXT;
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS provider_email TEXT;
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS provider_name TEXT;
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS provider_picture_url TEXT;
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT;
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS access_token_iv TEXT;
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS access_token_tag TEXT;
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT;
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS refresh_token_iv TEXT;
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS refresh_token_tag TEXT;
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS token_key_id VARCHAR(32) DEFAULT 'v1';
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS files_indexed_count INT NOT NULL DEFAULT 0;

ALTER TABLE integration_connections DROP CONSTRAINT IF EXISTS integration_connections_tenant_id_provider_id_key;
ALTER TABLE integration_connections ADD CONSTRAINT integration_connections_tenant_user_provider_key UNIQUE (tenant_id, user_id, provider_id);

CREATE INDEX IF NOT EXISTS idx_integration_connections_user_id ON integration_connections(user_id);

-- oauth_states (migration 023) didn't track which user started the flow —
-- fine for a Stripe/Razorpay-style tenant-wide connection, but this
-- integration is per-user, and the callback request is a plain browser GET
-- from Google with no Authorization header, so the user has to be resolvable
-- from the state row itself rather than assumed from request context.
ALTER TABLE oauth_states ADD COLUMN IF NOT EXISTS user_id UUID;

-- Tracks every individual Drive file synced into the RAG knowledge base per
-- connection, so incremental sync can detect changed/deleted files and skip
-- files whose modified_time hasn't changed since last sync.
CREATE TABLE IF NOT EXISTS integration_synced_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    knowledge_document_id UUID REFERENCES knowledge_documents(id) ON DELETE SET NULL,
    external_file_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT DEFAULT 0,
    web_view_link TEXT,
    owner_email TEXT,
    modified_time TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (connection_id, external_file_id)
);

CREATE INDEX IF NOT EXISTS idx_integration_synced_files_connection ON integration_synced_files(connection_id);
