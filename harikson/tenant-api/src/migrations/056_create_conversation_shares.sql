-- Migration 056: Create conversation_shares table for public conversation sharing
-- Design principles:
--   • Raw share token is NEVER stored — only a SHA-256 hash (share_token_hash)
--   • conversation_snapshot stores only public user/assistant messages at share time (immutable snapshot)
--   • tenant_id is stored and enforced for tenant isolation
--   • Public share API resolves by hash; never by conversation_id or user_id directly
--   • Revocation sets revoked_at and is_active=false — old tokens permanently rejected
--   • RLS is intentionally NOT applied here because the public share endpoint
--     runs without a tenant context (no JWT). The route handler enforces all
--     authorization checks explicitly.

CREATE TABLE IF NOT EXISTS conversation_shares (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id      UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    owner_user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- SHA-256 hex hash of the raw public token (never store raw token)
    share_token_hash     VARCHAR(64) UNIQUE NOT NULL,

    -- Immutable snapshot of user/assistant messages captured at share time.
    -- Stored as JSONB array: [{role, content, created_at}, ...] — no system
    -- prompts, tool calls, or private metadata.
    conversation_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Title captured at share time (private conversation title may change later)
    title_snapshot       VARCHAR(500) NOT NULL DEFAULT '',

    -- Lifecycle
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at           TIMESTAMPTZ,            -- NULL means never expires
    revoked_at           TIMESTAMPTZ,            -- Set when owner revokes
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Analytics (non-PII)
    access_count         INTEGER NOT NULL DEFAULT 0,
    last_accessed_at     TIMESTAMPTZ
);

-- Efficient token lookup (public endpoint hashes incoming token and looks this up)
CREATE INDEX IF NOT EXISTS idx_conv_shares_token_hash
    ON conversation_shares (share_token_hash);

-- Owner management queries (show existing share for a conversation)
CREATE INDEX IF NOT EXISTS idx_conv_shares_conv_owner
    ON conversation_shares (conversation_id, owner_user_id, is_active);

-- Tenant-scoped admin queries
CREATE INDEX IF NOT EXISTS idx_conv_shares_tenant
    ON conversation_shares (tenant_id);
