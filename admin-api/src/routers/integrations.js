import logger from '../utils/logger.js';
/**
 * Integration Center Router
 * Handles all /admin/integrations/* and /admin/webhooks/* endpoints
 * Part of the Harikson Admin API
 */

import express from 'express';
import crypto from 'crypto';

const router = express.Router();

const PROVIDERS = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Connect repositories for code-aware AI assistance',
    icon: '🐙',
    oauth_type: 'oauth2',
    docs_url: 'https://github.com/settings/tokens',
    external_url: 'https://github.com/settings/applications',
    capabilities: ['knowledge_base', 'code_search', 'pr_summary'],
    auth_url: 'https://github.com/login/oauth/authorize',
    token_url: 'https://github.com/login/oauth/access_token',
    revoke_url: 'https://api.github.com/applications/{client_id}/token',
    default_scopes: ['contents:read', 'metadata:read', 'pull_requests:read'],
    webhook_support: true,
    plan_required: 'free',
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'Sync documents and files to Knowledge Bases',
    icon: '📁',
    oauth_type: 'oauth2',
    docs_url: 'https://console.cloud.google.com',
    external_url: 'https://drive.google.com',
    capabilities: ['knowledge_base', 'document_sync'],
    auth_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    token_url: 'https://oauth2.googleapis.com/token',
    revoke_url: 'https://oauth2.googleapis.com/revoke',
    default_scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    webhook_support: true,
    plan_required: 'free',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send AI summaries and alerts to Slack channels',
    icon: '💬',
    oauth_type: 'oauth2',
    docs_url: 'https://api.slack.com/apps',
    external_url: 'https://slack.com/intl/en-in/workspace-signin',
    capabilities: ['notifications', 'ai_bot', 'alerts'],
    auth_url: 'https://slack.com/oauth/v2/authorize',
    token_url: 'https://slack.com/api/oauth.v2.access',
    revoke_url: 'https://slack.com/api/auth.revoke',
    default_scopes: ['channels:read', 'chat:write', 'users:read'],
    webhook_support: true,
    plan_required: 'free',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Import Notion pages as Knowledge Base documents',
    icon: '📝',
    oauth_type: 'oauth2',
    docs_url: 'https://www.notion.so/my-integrations',
    external_url: 'https://www.notion.so',
    capabilities: ['knowledge_base', 'document_sync'],
    auth_url: 'https://api.notion.com/v1/oauth/authorize',
    token_url: 'https://api.notion.com/v1/oauth/token',
    revoke_url: null,
    default_scopes: ['read_content', 'read_user_info'],
    webhook_support: false,
    plan_required: 'pro',
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Deploy AI bots to Discord servers',
    icon: '🎮',
    oauth_type: 'bot_token',
    docs_url: 'https://discord.com/developers/applications',
    external_url: 'https://discord.com/developers/applications',
    capabilities: ['ai_bot', 'notifications'],
    auth_url: 'https://discord.com/api/oauth2/authorize',
    token_url: 'https://discord.com/api/oauth2/token',
    revoke_url: 'https://discord.com/api/oauth2/token/revoke',
    default_scopes: ['bot', 'applications.commands'],
    webhook_support: false,
    plan_required: 'pro',
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Query external databases with natural language',
    icon: '🐘',
    oauth_type: 'credentials',
    docs_url: 'https://www.postgresql.org/docs/',
    external_url: null,
    capabilities: ['nl_query', 'data_analysis'],
    default_scopes: [],
    webhook_support: false,
    plan_required: 'pro',
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Summarize and triage project issues with AI',
    icon: '📋',
    oauth_type: 'oauth2',
    docs_url: 'https://id.atlassian.com/manage-profile/security/api-tokens',
    external_url: 'https://www.atlassian.com/software/jira',
    capabilities: ['knowledge_base', 'issue_triage', 'ai_summary'],
    auth_url: 'https://auth.atlassian.com/authorize',
    token_url: 'https://auth.atlassian.com/oauth/token',
    revoke_url: null,
    default_scopes: ['read:jira-user', 'read:jira-work', 'offline_access'],
    webhook_support: true,
    plan_required: 'enterprise',
  },
  {
    id: 'confluence',
    name: 'Confluence',
    description: 'Index team wikis into Knowledge Bases',
    icon: '📚',
    oauth_type: 'oauth2',
    docs_url: 'https://id.atlassian.com/manage-profile/security/api-tokens',
    external_url: 'https://www.atlassian.com/software/confluence',
    capabilities: ['knowledge_base', 'document_sync'],
    auth_url: 'https://auth.atlassian.com/authorize',
    token_url: 'https://auth.atlassian.com/oauth/token',
    revoke_url: null,
    default_scopes: [
      'read:confluence-content.all',
      'read:confluence-space.summary',
    ],
    webhook_support: false,
    plan_required: 'enterprise',
  },
];

// ─────────────────────────────────────────────────────────────────────
// DB Table Initialization (called from admin.js initDB)
// ─────────────────────────────────────────────────────────────────────
async function initIntegrationTables(pool) {
  // Extended integration connections table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS integration_connections (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id         UUID REFERENCES tenants(id) ON DELETE CASCADE,
      provider_id       TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'disconnected'
                        CHECK (status IN ('disconnected','connecting','connected','syncing','error')),
      connected_by      TEXT,
      connected_at      TIMESTAMPTZ,
      disconnected_at   TIMESTAMPTZ,
      last_sync_at      TIMESTAMPTZ,
      last_error        TEXT,
      error_type        TEXT,
      error_count       INT DEFAULT 0,
      settings          JSONB DEFAULT '{}',
      created_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at        TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(tenant_id, provider_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS oauth_states (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      state_nonce   TEXT NOT NULL UNIQUE,
      tenant_id     UUID,
      provider_id   TEXT NOT NULL,
      redirect_after TEXT,
      expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS integration_sync_jobs (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      connection_id         UUID REFERENCES integration_connections(id) ON DELETE CASCADE,
      tenant_id             UUID,
      provider_id           TEXT NOT NULL,
      job_type              TEXT DEFAULT 'full_sync',
      status                TEXT NOT NULL DEFAULT 'queued'
                            CHECK (status IN ('queued','running','completed','failed','cancelled')),
      triggered_by          TEXT DEFAULT 'user',
      total_items           INT DEFAULT 0,
      processed_items       INT DEFAULT 0,
      failed_items          INT DEFAULT 0,
      progress_detail       TEXT,
      error_message         TEXT,
      started_at            TIMESTAMPTZ,
      completed_at          TIMESTAMPTZ,
      created_at            TIMESTAMPTZ DEFAULT NOW(),
      updated_at            TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_id       TEXT NOT NULL,
      event_id          TEXT,
      event_type        TEXT NOT NULL,
      signature_valid   BOOLEAN DEFAULT false,
      raw_payload       JSONB,
      tenant_id         UUID,
      idempotency_key   TEXT UNIQUE,
      processed         BOOLEAN DEFAULT false,
      processing_error  TEXT,
      received_at       TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS integration_activity_logs (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id       UUID,
      provider_id     TEXT NOT NULL,
      level           TEXT NOT NULL DEFAULT 'info'
                      CHECK (level IN ('info','warn','error','success')),
      message         TEXT NOT NULL,
      metadata        JSONB DEFAULT '{}',
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Indexes for performance
  await pool
    .query(
      `CREATE INDEX IF NOT EXISTS idx_integration_connections_tenant ON integration_connections(tenant_id)`
    )
    .catch(() => {});
  await pool
    .query(
      `CREATE INDEX IF NOT EXISTS idx_integration_connections_status ON integration_connections(tenant_id, status)`
    )
    .catch(() => {});
  await pool
    .query(
      `CREATE INDEX IF NOT EXISTS idx_sync_jobs_connection ON integration_sync_jobs(connection_id)`
    )
    .catch(() => {});
  await pool
    .query(
      `CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON integration_sync_jobs(status)`
    )
    .catch(() => {});
  await pool
    .query(
      `CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_provider ON integration_activity_logs(tenant_id, provider_id)`
    )
    .catch(() => {});

  logger.info('[Integration Center] Tables initialized.');
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────
function getTenantId(req) {
  // In this stack the admin token is global; use a sentinel tenant_id for admin context
  return req.tenantId || '00000000-0000-0000-0000-000000000000';
}

async function logActivity(
  pool,
  tenantId,
  providerId,
  level,
  message,
  metadata = {}
) {
  try {
    await pool.query(
      `INSERT INTO integration_activity_logs (tenant_id, provider_id, level, message, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, providerId, level, message, JSON.stringify(metadata)]
    );
  } catch (e) {
    logger.error('[Integration Activity Log Error]', e.message);
  }
}

async function getConnection(pool, tenantId, providerId) {
  const r = await pool.query(
    `SELECT * FROM integration_connections WHERE tenant_id = $1 AND provider_id = $2`,
    [tenantId, providerId]
  );
  return r.rows[0] || null;
}

function buildProviderResponse(provider, connection) {
  return {
    ...provider,
    connection: connection
      ? {
          id: connection.id,
          status: connection.status,
          connected_at: connection.connected_at,
          disconnected_at: connection.disconnected_at,
          last_sync_at: connection.last_sync_at,
          last_error: connection.last_error,
          error_type: connection.error_type,
          error_count: connection.error_count,
          settings: connection.settings || {},
        }
      : {
          id: null,
          status: 'disconnected',
          connected_at: null,
          disconnected_at: null,
          last_sync_at: null,
          last_error: null,
          error_type: null,
          error_count: 0,
          settings: {},
        },
  };
}

// In-memory sync job runner (simulates real sync with progress)
const activeSyncJobs = new Map();

function simulateSyncJob(pool, jobId, tenantId, providerId, connectionId) {
  const totalItems = Math.floor(Math.random() * 200) + 50; // 50–250 items
  let processed = 0;

  const interval = setInterval(async () => {
    const increment = Math.floor(Math.random() * 15) + 5;
    processed = Math.min(processed + increment, totalItems);
    const isDone = processed >= totalItems;

    try {
      await pool.query(
        `UPDATE integration_sync_jobs
         SET processed_items=$1, status=$2, progress_detail=$3, updated_at=NOW(),
             completed_at = CASE WHEN $2='completed' THEN NOW() ELSE NULL END
         WHERE id=$4`,
        [
          processed,
          isDone ? 'completed' : 'running',
          `Processing item ${processed} of ${totalItems}`,
          jobId,
        ]
      );

      if (isDone) {
        clearInterval(interval);
        activeSyncJobs.delete(jobId);

        // Update connection last_sync_at + status back to connected
        await pool.query(
          `UPDATE integration_connections SET status='connected', last_sync_at=NOW(), updated_at=NOW()
           WHERE id=$1`,
          [connectionId]
        );

        await logActivity(
          pool,
          tenantId,
          providerId,
          'success',
          `Sync completed: ${totalItems} items indexed`,
          { items_synced: totalItems, duration_ms: totalItems * 150 }
        );
      }
    } catch (e) {
      clearInterval(interval);
      activeSyncJobs.delete(jobId);
    }
  }, 1200); // tick every 1.2s

  activeSyncJobs.set(jobId, interval);
}

// ─────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────

/**
 * GET /admin/integrations/providers
 * Returns all 8 providers with per-tenant connection status
 */
router.get('/providers', async (req, res) => {
  const pool = req.pool;
  const tenantId = getTenantId(req);

  try {
    const { rows: connections } = await pool.query(
      `SELECT * FROM integration_connections WHERE tenant_id = $1`,
      [tenantId]
    );

    const connectionMap = {};
    for (const c of connections) connectionMap[c.provider_id] = c;

    const providers = PROVIDERS.map((p) =>
      buildProviderResponse(p, connectionMap[p.id] || null)
    );

    res.json({ success: true, data: providers });
  } catch (e) {
    logger.error('[GET /integrations/providers]', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /admin/integrations/status
 * Summary counts for the 4 stat cards
 */
router.get('/status', async (req, res) => {
  const pool = req.pool;
  const tenantId = getTenantId(req);

  try {
    const { rows } = await pool.query(
      `SELECT status, COUNT(*)::int AS count
       FROM integration_connections
       WHERE tenant_id = $1
       GROUP BY status`,
      [tenantId]
    );

    const byStatus = {
      disconnected: 0,
      connecting: 0,
      connected: 0,
      syncing: 0,
      error: 0,
    };
    for (const r of rows) byStatus[r.status] = r.count;

    const connected = byStatus.connected + byStatus.syncing;
    const errors = byStatus.error;
    const total = PROVIDERS.length;
    const available = total - connected;

    res.json({
      success: true,
      data: { total, connected, available, errors, by_status: byStatus },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /admin/integrations/:provider/connect
 * Initiates connection. For OAuth providers: returns auth URL or simulates if no creds.
 * For credential providers (postgres): expects body with credentials.
 */
router.post('/:provider/connect', async (req, res) => {
  const pool = req.pool;
  const tenantId = getTenantId(req);
  const { provider } = req.params;
  const providerConfig = PROVIDERS.find((p) => p.id === provider);

  if (!providerConfig) {
    return res.status(404).json({ success: false, error: 'Unknown provider' });
  }

  try {
    // Check if already connected
    const existing = await getConnection(pool, tenantId, provider);
    if (existing && existing.status === 'connected') {
      return res
        .status(409)
        .json({ success: false, error: 'Integration already connected' });
    }

    if (providerConfig.oauth_type === 'credentials') {
      // PostgreSQL: validate credentials in body
      const { host, port, database, username, password } = req.body;
      if (!host || !database || !username || !password) {
        return res.status(400).json({
          success: false,
          error: 'host, database, username, password are required',
        });
      }

      // Store (in production: encrypt password)
      const settings = {
        host,
        port: port || 5432,
        database,
        username,
        password_hint: `${password[0]}***`,
      };

      if (existing) {
        await pool.query(
          `UPDATE integration_connections
           SET status='connected', connected_at=NOW(), settings=$1, last_error=NULL,
               error_type=NULL, error_count=0, updated_at=NOW()
           WHERE id=$2`,
          [JSON.stringify(settings), existing.id]
        );
      } else {
        await pool.query(
          `INSERT INTO integration_connections
           (tenant_id, provider_id, status, connected_at, settings)
           VALUES ($1, $2, 'connected', NOW(), $3)`,
          [tenantId, provider, JSON.stringify(settings)]
        );
      }

      await logActivity(
        pool,
        tenantId,
        provider,
        'success',
        'PostgreSQL database connected',
        { host, database }
      );
      return res.json({
        success: true,
        status: 'connected',
        message: 'Database connected successfully',
      });
    }

    // OAuth providers: check if env credentials exist
    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
    const redirectUri =
      process.env[`${provider.toUpperCase()}_REDIRECT_URI`] ||
      `${process.env.ADMIN_PANEL_URL || 'http://localhost:4000'}/admin/integrations/${provider}/callback`;

    if (clientId && providerConfig.auth_url) {
      // Real OAuth flow
      const stateNonce = crypto.randomBytes(32).toString('hex');
      await pool.query(
        `INSERT INTO oauth_states (state_nonce, tenant_id, provider_id, redirect_after)
         VALUES ($1, $2, $3, $4)`,
        [stateNonce, tenantId, provider, req.body.redirect_after || null]
      );

      const scopes = providerConfig.default_scopes.join(' ');
      let authUrl = `${providerConfig.auth_url}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${stateNonce}&response_type=code`;

      if (provider === 'google_drive') {
        authUrl += '&access_type=offline&prompt=consent';
      }

      // Set status to connecting
      if (existing) {
        await pool.query(
          `UPDATE integration_connections SET status='connecting', updated_at=NOW() WHERE id=$1`,
          [existing.id]
        );
      } else {
        await pool.query(
          `INSERT INTO integration_connections (tenant_id, provider_id, status)
           VALUES ($1, $2, 'connecting')`,
          [tenantId, provider]
        );
      }

      return res.json({
        success: true,
        status: 'connecting',
        authorization_url: authUrl,
        expires_in: 300,
      });
    }

    // Simulated connect (no credentials configured — demo mode)
    if (existing) {
      await pool.query(
        `UPDATE integration_connections
         SET status='connected', connected_at=NOW(), last_error=NULL,
             error_type=NULL, error_count=0, updated_at=NOW()
         WHERE id=$1`,
        [existing.id]
      );
    } else {
      await pool.query(
        `INSERT INTO integration_connections (tenant_id, provider_id, status, connected_at)
         VALUES ($1, $2, 'connected', NOW())`,
        [tenantId, provider]
      );
    }

    await logActivity(
      pool,
      tenantId,
      provider,
      'success',
      `${providerConfig.name} connected successfully (demo mode)`
    );
    return res.json({
      success: true,
      status: 'connected',
      message: `${providerConfig.name} connected`,
    });
  } catch (e) {
    logger.error(`[POST /integrations/${provider}/connect]`, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /admin/integrations/:provider/callback
 * OAuth callback handler (called by OAuth provider after user grants access)
 */
router.get('/:provider/callback', async (req, res) => {
  const pool = req.pool;
  const { provider } = req.params;
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    return res.redirect(
      `/admin/integrations?provider=${provider}&status=error&reason=${oauthError}`
    );
  }

  if (!code || !state) {
    return res.redirect(
      `/admin/integrations?provider=${provider}&status=error&reason=missing_params`
    );
  }

  try {
    const { rows } = await pool.query(
      `SELECT * FROM oauth_states WHERE state_nonce = $1 AND expires_at > NOW()`,
      [state]
    );

    if (!rows.length) {
      return res.redirect(
        `/admin/integrations?provider=${provider}&status=error&reason=invalid_state`
      );
    }

    const oauthState = rows[0];
    // Consume state
    await pool.query(`DELETE FROM oauth_states WHERE id = $1`, [oauthState.id]);

    const providerConfig = PROVIDERS.find((p) => p.id === provider);
    const clientId = process.env[`${provider.toUpperCase()}_CLIENT_ID`];
    const clientSecret = process.env[`${provider.toUpperCase()}_CLIENT_SECRET`];
    const redirectUri =
      process.env[`${provider.toUpperCase()}_REDIRECT_URI`] ||
      `${process.env.ADMIN_PANEL_URL || 'http://localhost:4000'}/admin/integrations/${provider}/callback`;

    if (clientId && clientSecret && providerConfig.token_url) {
      // Exchange code for token
      const tokenResp = await fetch(providerConfig.token_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (tokenResp.ok) {
        const tokenData = await tokenResp.json();
        const expiresAt = tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : new Date(Date.now() + 3600 * 1000).toISOString();

        // Store token hash (in production: full AES-256-GCM encryption)
        const tokenHint = tokenData.access_token
          ? `${tokenData.access_token.substring(0, 8)}...`
          : 'received';

        await pool.query(
          `INSERT INTO integration_connections
            (tenant_id, provider_id, status, connected_at, settings)
           VALUES ($1, $2, 'connected', NOW(), $3)
           ON CONFLICT (tenant_id, provider_id) DO UPDATE
           SET status='connected', connected_at=NOW(), last_error=NULL,
               error_count=0, settings=$3, updated_at=NOW()`,
          [
            oauthState.tenant_id,
            provider,
            JSON.stringify({
              token_hint: tokenHint,
              expires_at: expiresAt,
              scope: tokenData.scope,
            }),
          ]
        );

        await logActivity(
          pool,
          oauthState.tenant_id,
          provider,
          'success',
          `OAuth successful — ${providerConfig.name} connected`
        );
      } else {
        await pool.query(
          `UPDATE integration_connections SET status='error', last_error='Token exchange failed', error_type='auth_failed'
           WHERE tenant_id=$1 AND provider_id=$2`,
          [oauthState.tenant_id, provider]
        );
        return res.redirect(
          `/admin/integrations?provider=${provider}&status=error&reason=token_exchange_failed`
        );
      }
    } else {
      // Simulated (demo mode)
      await pool.query(
        `INSERT INTO integration_connections (tenant_id, provider_id, status, connected_at)
         VALUES ($1, $2, 'connected', NOW())
         ON CONFLICT (tenant_id, provider_id) DO UPDATE
         SET status='connected', connected_at=NOW(), updated_at=NOW()`,
        [oauthState.tenant_id, provider]
      );
    }

    const redirectAfter =
      oauthState.redirect_after ||
      `/admin/integrations?provider=${provider}&status=connected`;
    return res.redirect(redirectAfter);
  } catch (e) {
    logger.error(`[GET /integrations/${provider}/callback]`, e);
    return res.redirect(
      `/admin/integrations?provider=${provider}&status=error&reason=server_error`
    );
  }
});

/**
 * POST /admin/integrations/:provider/disconnect
 * Disconnect an integration (revoke token simulation + cleanup)
 */
router.post('/:provider/disconnect', async (req, res) => {
  const pool = req.pool;
  const tenantId = getTenantId(req);
  const { provider } = req.params;

  try {
    const connection = await getConnection(pool, tenantId, provider);
    if (!connection) {
      return res
        .status(404)
        .json({ success: false, error: 'Integration not connected' });
    }

    // Cancel any running sync jobs
    await pool.query(
      `UPDATE integration_sync_jobs SET status='cancelled', updated_at=NOW()
       WHERE connection_id=$1 AND status IN ('queued','running')`,
      [connection.id]
    );

    // Cancel in-memory job if running
    for (const [jobId, interval] of activeSyncJobs.entries()) {
      // best-effort; production would check jobId → connectionId mapping
      clearInterval(interval);
    }

    await pool.query(
      `UPDATE integration_connections
       SET status='disconnected', disconnected_at=NOW(), connected_at=NULL,
           settings='{}', last_error=NULL, error_type=NULL, error_count=0, updated_at=NOW()
       WHERE id=$1`,
      [connection.id]
    );

    await logActivity(
      pool,
      tenantId,
      provider,
      'info',
      `${PROVIDERS.find((p) => p.id === provider)?.name || provider} disconnected`,
      {}
    );

    res.json({
      success: true,
      message:
        'Integration disconnected. Data will be purged in 30 days per data retention policy.',
      disconnected_at: new Date().toISOString(),
    });
  } catch (e) {
    logger.error(`[POST /integrations/${provider}/disconnect]`, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /admin/integrations/:provider/sync
 * Trigger a manual sync job
 */
router.post('/:provider/sync', async (req, res) => {
  const pool = req.pool;
  const tenantId = getTenantId(req);
  const { provider } = req.params;

  try {
    const connection = await getConnection(pool, tenantId, provider);
    if (!connection || connection.status === 'disconnected') {
      return res
        .status(400)
        .json({ success: false, error: 'Integration not connected' });
    }

    if (connection.status === 'syncing') {
      return res
        .status(409)
        .json({ success: false, error: 'Sync already in progress' });
    }

    const totalItems = Math.floor(Math.random() * 200) + 50;

    const { rows } = await pool.query(
      `INSERT INTO integration_sync_jobs
         (connection_id, tenant_id, provider_id, job_type, status, total_items, started_at)
       VALUES ($1, $2, $3, $4, 'running', $5, NOW())
       RETURNING id`,
      [
        connection.id,
        tenantId,
        provider,
        req.body.sync_type || 'full_sync',
        totalItems,
      ]
    );

    const jobId = rows[0].id;

    await pool.query(
      `UPDATE integration_connections SET status='syncing', updated_at=NOW() WHERE id=$1`,
      [connection.id]
    );

    await logActivity(
      pool,
      tenantId,
      provider,
      'info',
      `Sync started (${totalItems} items queued)`,
      { job_id: jobId }
    );

    // Start simulated sync
    simulateSyncJob(pool, jobId, tenantId, provider, connection.id);

    res.status(202).json({
      success: true,
      job_id: jobId,
      status: 'running',
      total_items: totalItems,
      poll_url: `/admin/integrations/${provider}/sync/${jobId}`,
    });
  } catch (e) {
    logger.error(`[POST /integrations/${provider}/sync]`, e);
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /admin/integrations/:provider/sync/:jobId
 * Sync job progress (polled by frontend every 2s during sync)
 */
router.get('/:provider/sync/:jobId', async (req, res) => {
  const pool = req.pool;
  const { jobId } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM integration_sync_jobs WHERE id = $1`,
      [jobId]
    );

    if (!rows.length)
      return res.status(404).json({ success: false, error: 'Job not found' });

    const job = rows[0];
    const percentage =
      job.total_items > 0
        ? Math.round((job.processed_items / job.total_items) * 100)
        : 0;

    res.json({
      success: true,
      data: {
        job_id: job.id,
        status: job.status,
        provider_id: job.provider_id,
        progress: {
          total_items: job.total_items,
          processed_items: job.processed_items,
          failed_items: job.failed_items,
          percentage,
          current_detail: job.progress_detail,
        },
        started_at: job.started_at,
        completed_at: job.completed_at,
        error_message: job.error_message,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * PATCH /admin/integrations/:provider/settings
 * Update per-integration settings
 */
router.patch('/:provider/settings', async (req, res) => {
  const pool = req.pool;
  const tenantId = getTenantId(req);
  const { provider } = req.params;

  try {
    const connection = await getConnection(pool, tenantId, provider);
    if (!connection) {
      return res
        .status(404)
        .json({ success: false, error: 'Integration not found' });
    }

    const currentSettings = connection.settings || {};
    const newSettings = { ...currentSettings, ...req.body };

    await pool.query(
      `UPDATE integration_connections SET settings=$1, updated_at=NOW() WHERE id=$2`,
      [JSON.stringify(newSettings), connection.id]
    );

    await logActivity(
      pool,
      tenantId,
      provider,
      'info',
      'Integration settings updated',
      { keys: Object.keys(req.body) }
    );

    res.json({ success: true, settings: newSettings });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * GET /admin/integrations/:provider/logs
 * Recent activity logs for card detail view
 */
router.get('/:provider/logs', async (req, res) => {
  const pool = req.pool;
  const tenantId = getTenantId(req);
  const { provider } = req.params;
  const limit = Math.min(parseInt(req.query.limit || '20'), 100);

  try {
    const { rows } = await pool.query(
      `SELECT id, level, message, metadata, created_at
       FROM integration_activity_logs
       WHERE tenant_id=$1 AND provider_id=$2
       ORDER BY created_at DESC
       LIMIT $3`,
      [tenantId, provider, limit]
    );

    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /admin/webhooks/:provider
 * Receive inbound webhooks from providers
 * Validates signature, stores event, queues for processing
 */
router.post('/webhooks/:provider', async (req, res) => {
  const pool = req.pool;
  const { provider } = req.params;

  // Respond immediately to avoid provider timeout
  res.status(200).json({ received: true });

  // Validate signature (provider-specific)
  let signatureValid = false;
  const payload = JSON.stringify(req.body);

  try {
    const webhookSecret =
      process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`];
    if (webhookSecret) {
      if (provider === 'github') {
        const sig = req.headers['x-hub-signature-256'];
        if (sig) {
          const expected = `sha256=${crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex')}`;
          signatureValid = crypto.timingSafeEqual(
            Buffer.from(sig),
            Buffer.from(expected)
          );
        }
      } else if (provider === 'slack') {
        const sig = req.headers['x-slack-signature'];
        const ts = req.headers['x-slack-request-timestamp'];
        if (sig && ts && Math.abs(Date.now() / 1000 - parseInt(ts)) <= 300) {
          const baseString = `v0:${ts}:${payload}`;
          const expected = `v0=${crypto.createHmac('sha256', webhookSecret).update(baseString).digest('hex')}`;
          signatureValid = crypto.timingSafeEqual(
            Buffer.from(sig),
            Buffer.from(expected)
          );
        }
      } else {
        signatureValid = true; // Other providers: accept if secret not configured
      }
    } else {
      signatureValid = true; // No secret configured: accept (dev mode)
    }

    const eventId =
      req.headers['x-github-delivery'] ||
      req.headers['x-event-id'] ||
      crypto.randomUUID();
    const eventType =
      req.headers['x-github-event'] ||
      req.headers['x-event-type'] ||
      req.body?.type ||
      'unknown';
    const idempotencyKey = `${provider}:${eventId}`;

    await pool.query(
      `INSERT INTO webhook_events
         (provider_id, event_id, event_type, signature_valid, raw_payload, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [provider, eventId, eventType, signatureValid, req.body, idempotencyKey]
    );

    logger.info(
      `[Webhook] ${provider} ${eventType} received (valid: ${signatureValid})`
    );
  } catch (e) {
    logger.error(`[Webhook Error - ${provider}]`, e.message);
  }
});

// ─────────────────────────────────────────────────────────────────────
// Background Cleanup Worker (runs in-process)
// ─────────────────────────────────────────────────────────────────────
function startIntegrationWorkers(pool) {
  // Purge expired OAuth states every 5 minutes
  setInterval(
    async () => {
      try {
        const r = await pool.query(
          `DELETE FROM oauth_states WHERE expires_at < NOW()`
        );
        if (r.rowCount > 0)
          logger.info(`[Worker] Purged ${r.rowCount} expired OAuth states`);
      } catch (e) {
        logger.error('[Worker: OAuth state cleanup]', e.message);
      }
    },
    5 * 60 * 1000
  );

  // Auto-recover stuck syncing jobs (jobs stuck > 15 min)
  setInterval(
    async () => {
      try {
        const { rows } = await pool.query(
          `SELECT id, connection_id FROM integration_sync_jobs
         WHERE status='running' AND started_at < NOW() - INTERVAL '15 minutes'`
        );
        for (const job of rows) {
          await pool.query(
            `UPDATE integration_sync_jobs SET status='failed', error_message='Timed out after 15 minutes', updated_at=NOW() WHERE id=$1`,
            [job.id]
          );
          await pool.query(
            `UPDATE integration_connections SET status='error', last_error='Sync timed out', error_type='sync_timeout', updated_at=NOW() WHERE id=$1`,
            [job.connection_id]
          );
        }
        if (rows.length > 0)
          logger.info(`[Worker] Recovered ${rows.length} stuck sync jobs`);
      } catch (e) {
        logger.error('[Worker: stuck sync recovery]', e.message);
      }
    },
    5 * 60 * 1000
  );

  logger.info('[Integration Center] Background workers started.');
}

export { router, initIntegrationTables, startIntegrationWorkers, PROVIDERS };
