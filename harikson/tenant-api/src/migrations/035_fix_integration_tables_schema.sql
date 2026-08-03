-- Migration 035: reconcile schema drift across all three tables the new
-- Google Drive integration writes to. Confirmed directly against production
-- via \d — some earlier, since-deleted code (the old initIntegrationTables()
-- dead code once in admin-api/src/routers/integrations.js — see that file's
-- own comment describing this exact class of drift for oauth_states)
-- actually created oauth_states, integration_connections, and
-- integration_sync_jobs with different column sets before migration 023
-- ever ran, and `CREATE TABLE IF NOT EXISTS` silently no-op'd against all
-- three instead of applying the intended schema — the same class of bug
-- already found and fixed this session for knowledge_documents and
-- payment_webhooks. Every write from tenant-api's integrations.routes.ts /
-- googleDriveSyncService.ts has been failing outright.

-- ── oauth_states ──
-- Real: id, tenant_id, provider_id, state (unique), redirect_uri,
-- expires_at (not null, no default), created_at, user_id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'oauth_states' AND column_name = 'state'
  ) THEN
    ALTER TABLE oauth_states RENAME COLUMN state TO state_nonce;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'oauth_states' AND column_name = 'redirect_uri'
  ) THEN
    ALTER TABLE oauth_states RENAME COLUMN redirect_uri TO redirect_after;
  END IF;
END $$;

ALTER TABLE oauth_states ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '5 minutes');

-- ── integration_connections ──
-- Real table has no connected_by/disconnected_at columns at all, and still
-- carries the old unique_tenant_provider UNIQUE(tenant_id, provider_id)
-- constraint alongside the new (tenant_id, user_id, provider_id) one
-- migration 034 added — the old one is strictly narrower and would reject a
-- second user in the same tenant connecting the same provider, breaking the
-- whole point of this being a per-user connection. Migration 034's DROP
-- CONSTRAINT IF EXISTS guessed the wrong (auto-generated) name, so it
-- silently no-op'd instead of removing it.
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS connected_by TEXT;
ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMPTZ;
ALTER TABLE integration_connections DROP CONSTRAINT IF EXISTS unique_tenant_provider;

-- ── integration_sync_jobs ──
-- Real table only has: id, tenant_id, connection_id, provider_id, status
-- (default 'running'), started_at, completed_at, error_message, progress
-- (jsonb), created_at, updated_at — missing every column the sync job
-- creation/progress-tracking queries actually use.
ALTER TABLE integration_sync_jobs ADD COLUMN IF NOT EXISTS job_type VARCHAR(50) DEFAULT 'full_sync';
ALTER TABLE integration_sync_jobs ADD COLUMN IF NOT EXISTS triggered_by VARCHAR(50) DEFAULT 'user';
ALTER TABLE integration_sync_jobs ADD COLUMN IF NOT EXISTS total_items INT DEFAULT 0;
ALTER TABLE integration_sync_jobs ADD COLUMN IF NOT EXISTS processed_items INT DEFAULT 0;
ALTER TABLE integration_sync_jobs ADD COLUMN IF NOT EXISTS failed_items INT DEFAULT 0;
ALTER TABLE integration_sync_jobs ADD COLUMN IF NOT EXISTS progress_detail TEXT;
ALTER TABLE integration_sync_jobs ALTER COLUMN status SET DEFAULT 'queued';
