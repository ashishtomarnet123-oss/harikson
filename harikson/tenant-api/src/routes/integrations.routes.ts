import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import logger from '../utils/logger.js';
import {
  isGoogleOAuthConfigured,
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  getGoogleProfile,
  revokeGoogleToken,
  listDriveFiles,
} from '../services/googleDriveService.js';
import {
  saveConnectionTokens,
  enqueueGoogleDriveSync,
  getValidAccessToken,
} from '../services/googleDriveSyncService.js';
import { decryptDocumentContent } from '../services/documentEncryptionService.js';
import {
  verifyGitHubToken,
  listUserRepositories,
  syncGitHubRepository,
} from '../services/githubService.js';
import {
  verifyNotionToken,
  searchNotionPages,
  syncNotionPages,
} from '../services/notionService.js';
import {
  verifySlackToken,
  listSlackChannels,
  syncSlackChannel,
} from '../services/slackService.js';
import {
  verifyFigmaToken,
  inspectFigmaFile,
  syncFigmaFile,
} from '../services/figmaService.js';

const router = Router();

// Same auth pattern as user.routes.ts — this router isn't mounted behind any
// shared auth middleware in index.ts, so each user-facing router owns it.
router.use((req: any, _res, next) => {
  if (!req.user) {
    const authHeader = req.headers.authorization || '';
    const cookieToken = req.cookies?.hk_access_token;
    let token = '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }
    if (token) {
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        req.user = decoded;
      } catch (err) {}
    }
  }
  next();
});

async function resolveTenantId(req: any): Promise<string | null> {
  const userRes = await pool.query('SELECT tenant_id FROM users WHERE id = $1', [req.user.userId]).catch(() => ({ rows: [] }));
  return userRes.rows[0]?.tenant_id || req.tenant?.id || null;
}

async function getGoogleConnection(tenantId: string, userId: string) {
  const res = await pool.query(
    `SELECT * FROM integration_connections WHERE tenant_id = $1 AND user_id = $2 AND provider_id = 'google_drive'`,
    [tenantId, userId]
  );
  return res.rows[0] || null;
}

async function saveGenericConnection(
  tenantId: string,
  userId: string,
  providerId: string,
  profile: { id: string; name: string; email?: string | null; avatarUrl?: string },
  token: string,
  settings: any = {}
) {
  const connRes = await pool.query(
    `INSERT INTO integration_connections
       (tenant_id, user_id, provider_id, status, connected_by, connected_at, provider_account_id, provider_email, provider_name, provider_picture_url, settings)
     VALUES ($1, $2, $3, 'connected', $4, NOW(), $5, $6, $7, $8, $9)
     ON CONFLICT (tenant_id, user_id, provider_id) DO UPDATE SET
       status = 'connected', connected_at = NOW(), disconnected_at = NULL,
       provider_account_id = EXCLUDED.provider_account_id,
       provider_email = EXCLUDED.provider_email,
       provider_name = EXCLUDED.provider_name,
       provider_picture_url = EXCLUDED.provider_picture_url,
       settings = EXCLUDED.settings,
       last_error = NULL, error_count = 0, updated_at = NOW()
     RETURNING id`,
    [tenantId, userId, providerId, userId, profile.id, profile.email || null, profile.name, profile.avatarUrl || null, JSON.stringify(settings)]
  );
  const connectionId = connRes.rows[0].id;
  await saveConnectionTokens(connectionId, token, null, new Date(Date.now() + 365 * 86400000));
  return connectionId;
}

async function getGenericConnectionToken(tenantId: string, userId: string, providerId: string): Promise<{ token: string; conn: any } | null> {
  const res = await pool.query(
    `SELECT * FROM integration_connections WHERE tenant_id = $1 AND user_id = $2 AND provider_id = $3 AND status = 'connected'`,
    [tenantId, userId, providerId]
  );
  const conn = res.rows[0];
  if (!conn || !conn.access_token_encrypted) return null;
  const token = decryptDocumentContent(
    `${conn.id}:access`,
    conn.access_token_encrypted,
    conn.access_token_iv,
    conn.access_token_tag,
    conn.token_key_id || 'v1'
  );
  return { token, conn };
}

const LIVE_PROVIDERS = ['google_drive', 'github', 'vscode', 'slack', 'notion', 'figma'];
const KNOWN_PROVIDERS = ['google_drive', 'github', 'vscode', 'slack', 'notion', 'figma'];

// GET /api/integrations — list every provider's connection status for the Connected Apps page.
router.get('/', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const connRes = await pool.query(
      `SELECT provider_id, status, provider_email, provider_name, provider_picture_url, last_sync_at, connected_at, files_indexed_count, last_error
       FROM integration_connections WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, req.user.userId]
    );
    const byProvider = new Map(connRes.rows.map((r: any) => [r.provider_id, r]));

    let vscodeKeyPrefix: string | null = null;
    const vscodeKeyRes = await pool.query(
      `SELECT key_prefix FROM tenant_api_keys WHERE tenant_id = $1 AND user_id = $2 AND status = 'active' AND scopes = $3::jsonb ORDER BY created_at DESC LIMIT 1`,
      [tenantId, req.user.userId, JSON.stringify(['ide'])]
    ).catch(() => ({ rows: [] }));
    vscodeKeyPrefix = vscodeKeyRes.rows[0]?.key_prefix || null;

    const integrations = KNOWN_PROVIDERS.map((providerId) => {
      if (!LIVE_PROVIDERS.includes(providerId)) {
        return { providerId, status: 'coming_soon' };
      }
      const conn = byProvider.get(providerId);
      if (!conn) return { providerId, status: 'disconnected' };
      return {
        providerId,
        status: conn.status,
        email: conn.provider_email,
        name: conn.provider_name,
        picture: conn.provider_picture_url,
        lastSyncAt: conn.last_sync_at,
        connectedAt: conn.connected_at,
        filesIndexed: conn.files_indexed_count,
        keyPrefix: providerId === 'vscode' ? vscodeKeyPrefix : undefined,
        error: conn.last_error,
      };
    });

    res.json({ integrations });
  } catch (err: any) {
    logger.error('List integrations error:', err);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

// POST /api/integrations/waitlist — track user interest in upcoming integrations (GitHub, Slack, Notion, etc.)
router.post('/waitlist', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { providerId } = req.body || {};
  if (!providerId || !KNOWN_PROVIDERS.includes(providerId)) {
    return res.status(400).json({ error: 'Invalid provider' });
  }
  logger.info(`User ${req.user.userId} joined waitlist for ${providerId}`);
  return res.json({ success: true, message: `You're on the early access list for this integration.` });
});

// GET /api/integrations/google/auth — starts the OAuth flow, returns the consent URL for the frontend to redirect to.
router.get('/google/auth', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!isGoogleOAuthConfigured()) {
    return res.status(503).json({
      configured: false,
      error: 'Google Workspace integration requires Google Cloud OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) configured on the server.',
    });
  }

  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const stateNonce = crypto.randomBytes(24).toString('hex');
    const redirectAfter = typeof req.query.redirect === 'string' ? req.query.redirect : '/chat';

    await pool.query(
      `INSERT INTO oauth_states (state_nonce, tenant_id, provider_id, user_id, redirect_after)
       VALUES ($1, $2, 'google_drive', $3, $4)`,
      [stateNonce, tenantId, req.user.userId, redirectAfter]
    );

    const authUrl = getGoogleAuthUrl(stateNonce);
    res.json({ authUrl });
  } catch (err: any) {
    logger.error('Google auth URL generation failed:', err);
    res.status(500).json({ error: 'Failed to start Google connection' });
  }
});

// GET /api/integrations/google/callback — Google redirects the browser here after consent.
// Same-origin relative redirects back to the app are intentional: xarwiz.com
// serves both the frontend and (via Next.js's own rewrite) this API on one
// origin, so a bare path resolves correctly regardless of domain.
router.get('/google/callback', async (req: any, res) => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    return res.redirect(`/chat?settings=connections&google_error=${encodeURIComponent(String(oauthError))}`);
  }
  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    return res.redirect('/chat?settings=connections&google_error=missing_code_or_state');
  }

  try {
    const stateRes = await pool.query(
      `SELECT tenant_id, user_id, redirect_after FROM oauth_states
       WHERE state_nonce = $1 AND provider_id = 'google_drive' AND expires_at > NOW()`,
      [state]
    );
    if (stateRes.rows.length === 0) {
      logger.warn('Google OAuth callback with invalid/expired state parameter');
      return res.redirect('/chat?settings=connections&google_error=invalid_state');
    }
    const { tenant_id: tenantId, user_id: userId, redirect_after: redirectAfter } = stateRes.rows[0];
    // One-time use — prevents replay of the same state/code pair.
    await pool.query(`DELETE FROM oauth_states WHERE state_nonce = $1`, [state]);

    const tokens = await exchangeCodeForTokens(code);
    const profile = await getGoogleProfile(tokens.accessToken);

    const connRes = await pool.query(
      `INSERT INTO integration_connections
         (tenant_id, user_id, provider_id, status, connected_by, connected_at, provider_account_id, provider_email, provider_name, provider_picture_url, settings)
       VALUES ($1, $2, 'google_drive', 'connected', $3, NOW(), $4, $5, $6, $7, '{}'::jsonb)
       ON CONFLICT (tenant_id, user_id, provider_id) DO UPDATE SET
         status = 'connected', connected_at = NOW(), disconnected_at = NULL,
         provider_account_id = EXCLUDED.provider_account_id, provider_email = EXCLUDED.provider_email,
         provider_name = EXCLUDED.provider_name, provider_picture_url = EXCLUDED.provider_picture_url,
         last_error = NULL, error_count = 0, updated_at = NOW()
       RETURNING id`,
      [tenantId, userId, userId, profile.id, profile.email, profile.name, profile.picture]
    );
    const connectionId = connRes.rows[0].id;

    await saveConnectionTokens(connectionId, tokens.accessToken, tokens.refreshToken, tokens.expiresAt);

    logger.info(`Google Drive connected: tenant=${tenantId} user=${userId} account=${profile.email}`);
    return res.redirect(`${redirectAfter || '/chat'}?settings=connections&google=connected`);
  } catch (err: any) {
    logger.error('Google OAuth callback failed:', err);
    return res.redirect('/chat?settings=connections&google_error=callback_failed');
  }
});

// POST /api/integrations/google/disconnect
router.post('/google/disconnect', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const conn = await getGoogleConnection(tenantId, req.user.userId);
    if (!conn) return res.json({ success: true });

    try {
      const accessToken = await getValidAccessToken(conn.id);
      await revokeGoogleToken(accessToken);
    } catch (revokeErr: any) {
      // Best-effort — the token may already be expired/revoked on Google's
      // side, which shouldn't block the user from disconnecting locally.
      logger.warn('Google token revoke failed during disconnect:', revokeErr.message);
    }

    await pool.query(
      `UPDATE integration_connections
       SET status = 'disconnected', disconnected_at = NOW(),
           access_token_encrypted = NULL, access_token_iv = NULL, access_token_tag = NULL,
           refresh_token_encrypted = NULL, refresh_token_iv = NULL, refresh_token_tag = NULL,
           token_expires_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [conn.id]
    );

    res.json({ success: true });
  } catch (err: any) {
    logger.error('Google disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect Google Drive' });
  }
});

// GET /api/integrations/google/status — connection state + latest sync job progress, for polling.
router.get('/google/status', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const conn = await getGoogleConnection(tenantId, req.user.userId);
    if (!conn) return res.json({ status: 'disconnected' });

    const jobRes = await pool.query(
      `SELECT status, total_items, processed_items, failed_items, error_message, started_at, completed_at
       FROM integration_sync_jobs WHERE connection_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [conn.id]
    );
    const latestJob = jobRes.rows[0] || null;

    res.json({
      status: conn.status,
      email: conn.provider_email,
      name: conn.provider_name,
      picture: conn.provider_picture_url,
      lastSyncAt: conn.last_sync_at,
      filesIndexed: conn.files_indexed_count,
      error: conn.last_error,
      currentJob: latestJob
        ? {
            status: latestJob.status,
            totalItems: latestJob.total_items,
            processedItems: latestJob.processed_items,
            failedItems: latestJob.failed_items,
            error: latestJob.error_message,
          }
        : null,
    });
  } catch (err: any) {
    logger.error('Google status error:', err);
    res.status(500).json({ error: 'Failed to fetch connection status' });
  }
});

// GET /api/integrations/google/files — browse a Drive folder (or root) to build the file/folder picker UI.
router.get('/google/files', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const conn = await getGoogleConnection(tenantId, req.user.userId);
    if (!conn || conn.status === 'disconnected') {
      return res.status(400).json({ error: 'Google Drive is not connected' });
    }

    const accessToken = await getValidAccessToken(conn.id);
    const folderId = typeof req.query.folderId === 'string' ? req.query.folderId : undefined;
    const pageToken = typeof req.query.pageToken === 'string' ? req.query.pageToken : undefined;

    const { files, nextPageToken } = await listDriveFiles(accessToken, folderId, pageToken);
    res.json({ files, nextPageToken });
  } catch (err: any) {
    logger.error('Google Drive file listing error:', err);
    res.status(500).json({ error: err.message || 'Failed to list Drive files' });
  }
});

// POST /api/integrations/google/sync — persist the selected files/folders (if provided) and enqueue a background sync.
router.post('/google/sync', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const conn = await getGoogleConnection(tenantId, req.user.userId);
    if (!conn || conn.status === 'disconnected') {
      return res.status(400).json({ error: 'Google Drive is not connected' });
    }
    if (conn.status === 'syncing') {
      return res.status(409).json({ error: 'A sync is already in progress' });
    }

    const { selectedFileIds, selectedFolderIds } = req.body || {};
    if (Array.isArray(selectedFileIds) || Array.isArray(selectedFolderIds)) {
      await pool.query(`UPDATE integration_connections SET settings = $1, updated_at = NOW() WHERE id = $2`, [
        JSON.stringify({
          selectedFileIds: Array.isArray(selectedFileIds) ? selectedFileIds : [],
          selectedFolderIds: Array.isArray(selectedFolderIds) ? selectedFolderIds : [],
        }),
        conn.id,
      ]);
    }

    const jobId = await enqueueGoogleDriveSync(conn.id, tenantId, req.user.userId);
    res.json({ success: true, jobId });
  } catch (err: any) {
    logger.error('Google Drive sync trigger error:', err);
    res.status(500).json({ error: 'Failed to start sync' });
  }
});

// ── VS Code Extension: a personal access token scoped to IDE use, tracked as
// its own integration_connections row (separate status from the general
// Developer Settings API keys) so the Connected Apps card reflects reality. ──

// POST /api/integrations/vscode/connect — (re)issues a personal access token
// for the extension and marks the connection active. Re-connecting revokes
// any previous IDE token first, so only one is ever valid at a time.
router.post('/vscode/connect', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    await pool.query(
      `UPDATE tenant_api_keys SET status = 'revoked', revoked_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND status = 'active' AND scopes = $3::jsonb`,
      [tenantId, req.user.userId, JSON.stringify(['ide'])]
    );

    const rawKey = 'hk_live_' + crypto.randomBytes(24).toString('hex');
    const prefix = rawKey.substring(0, 12);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    await pool.query(
      `INSERT INTO tenant_api_keys (tenant_id, user_id, name, key_hash, key_prefix, scopes, status, created_at)
       VALUES ($1, $2, 'VS Code Extension', $3, $4, $5, 'active', NOW())`,
      [tenantId, req.user.userId, keyHash, prefix, JSON.stringify(['ide'])]
    );

    await pool.query(
      `INSERT INTO integration_connections (tenant_id, user_id, provider_id, status, connected_by, connected_at, settings)
       VALUES ($1, $2, 'vscode', 'connected', $3, NOW(), '{}'::jsonb)
       ON CONFLICT (tenant_id, user_id, provider_id) DO UPDATE SET
         status = 'connected', connected_by = $3, connected_at = NOW(), disconnected_at = NULL,
         last_error = NULL, error_count = 0, updated_at = NOW()`,
      [tenantId, req.user.userId, req.user.userId]
    );

    logger.info(`VS Code extension token issued: tenant=${tenantId} user=${req.user.userId}`);
    // apiKey is returned once, exactly like the Developer Settings API keys —
    // it is never retrievable again after this response.
    res.status(201).json({ apiKey: rawKey, keyPrefix: prefix });
  } catch (err: any) {
    logger.error(err, 'VS Code connect error');
    res.status(500).json({ error: 'Failed to connect VS Code extension' });
  }
});

// POST /api/integrations/vscode/disconnect
router.post('/vscode/disconnect', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    await pool.query(
      `UPDATE tenant_api_keys SET status = 'revoked', revoked_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND status = 'active' AND scopes = $3::jsonb`,
      [tenantId, req.user.userId, JSON.stringify(['ide'])]
    );

    await pool.query(
      `UPDATE integration_connections SET status = 'disconnected', disconnected_at = NOW(), updated_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND provider_id = 'vscode'`,
      [tenantId, req.user.userId]
    );

    res.json({ success: true });
  } catch (err: any) {
    logger.error(err, 'VS Code disconnect error');
    res.status(500).json({ error: 'Failed to disconnect VS Code extension' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB REPOSITORY SYNC
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/integrations/github/connect
router.post('/github/connect', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { token } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'GitHub Personal Access Token is required' });
  }

  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const profile = await verifyGitHubToken(token);
    await saveGenericConnection(tenantId, req.user.userId, 'github', profile, token.trim(), {
      login: profile.login,
    });

    logger.info(`GitHub connected: tenant=${tenantId} user=${req.user.userId} login=${profile.login}`);
    res.json({ success: true, profile });
  } catch (err: any) {
    logger.error('GitHub connect error:', err);
    res.status(400).json({ error: err.message || 'Failed to connect GitHub account' });
  }
});

// GET /api/integrations/github/repos
router.get('/github/repos', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const tokenData = await getGenericConnectionToken(tenantId, req.user.userId, 'github');
    if (!tokenData) return res.status(400).json({ error: 'GitHub is not connected' });

    const repos = await listUserRepositories(tokenData.token);
    res.json({ repos });
  } catch (err: any) {
    logger.error('GitHub repos list error:', err);
    res.status(500).json({ error: err.message || 'Failed to list GitHub repositories' });
  }
});

// POST /api/integrations/github/sync
router.post('/github/sync', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { fullName, branch } = req.body || {};
  if (!fullName) return res.status(400).json({ error: 'Repository full name is required (e.g. owner/repo)' });

  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const tokenData = await getGenericConnectionToken(tenantId, req.user.userId, 'github');
    if (!tokenData) return res.status(400).json({ error: 'GitHub is not connected' });

    await pool.query(
      `UPDATE integration_connections SET status = 'syncing', updated_at = NOW() WHERE id = $1`,
      [tokenData.conn.id]
    );

    const result = await syncGitHubRepository(tenantId, req.user.userId, fullName, branch || 'main', tokenData.token);

    await pool.query(
      `UPDATE integration_connections
       SET status = 'connected', last_sync_at = NOW(), files_indexed_count = $1,
           settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{syncedRepo}', $2::jsonb),
           updated_at = NOW()
       WHERE id = $3`,
      [result.filesCount, JSON.stringify({ fullName, branch: branch || 'main' }), tokenData.conn.id]
    );

    res.json({ success: true, filesIndexed: result.filesCount });
  } catch (err: any) {
    logger.error('GitHub sync error:', err);
    res.status(500).json({ error: err.message || 'Failed to index GitHub repository' });
  }
});

// POST /api/integrations/github/disconnect
router.post('/github/disconnect', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    await pool.query(
      `UPDATE integration_connections
       SET status = 'disconnected', disconnected_at = NOW(),
           access_token_encrypted = NULL, access_token_iv = NULL, access_token_tag = NULL,
           updated_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND provider_id = 'github'`,
      [tenantId, req.user.userId]
    );

    res.json({ success: true });
  } catch (err: any) {
    logger.error('GitHub disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect GitHub' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTION KNOWLEDGE SYNC
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/integrations/notion/connect
router.post('/notion/connect', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { token } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Notion integration token is required' });
  }

  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const profile = await verifyNotionToken(token);
    await saveGenericConnection(tenantId, req.user.userId, 'notion', profile, token.trim(), {
      workspaceName: profile.workspaceName,
    });

    logger.info(`Notion connected: tenant=${tenantId} user=${req.user.userId} workspace=${profile.workspaceName}`);
    res.json({ success: true, profile });
  } catch (err: any) {
    logger.error('Notion connect error:', err);
    res.status(400).json({ error: err.message || 'Failed to connect Notion workspace' });
  }
});

// GET /api/integrations/notion/pages
router.get('/notion/pages', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const tokenData = await getGenericConnectionToken(tenantId, req.user.userId, 'notion');
    if (!tokenData) return res.status(400).json({ error: 'Notion is not connected' });

    const pages = await searchNotionPages(tokenData.token);
    res.json({ pages });
  } catch (err: any) {
    logger.error('Notion pages list error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch Notion pages' });
  }
});

// POST /api/integrations/notion/sync
router.post('/notion/sync', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { pageIds } = req.body || {};
  if (!Array.isArray(pageIds) || pageIds.length === 0) {
    return res.status(400).json({ error: 'At least one page ID is required' });
  }

  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const tokenData = await getGenericConnectionToken(tenantId, req.user.userId, 'notion');
    if (!tokenData) return res.status(400).json({ error: 'Notion is not connected' });

    await pool.query(
      `UPDATE integration_connections SET status = 'syncing', updated_at = NOW() WHERE id = $1`,
      [tokenData.conn.id]
    );

    const result = await syncNotionPages(tenantId, req.user.userId, pageIds, tokenData.token);

    await pool.query(
      `UPDATE integration_connections
       SET status = 'connected', last_sync_at = NOW(), files_indexed_count = $1, updated_at = NOW()
       WHERE id = $2`,
      [result.indexedCount, tokenData.conn.id]
    );

    res.json({ success: true, indexedCount: result.indexedCount });
  } catch (err: any) {
    logger.error('Notion sync error:', err);
    res.status(500).json({ error: err.message || 'Failed to sync Notion pages' });
  }
});

// POST /api/integrations/notion/disconnect
router.post('/notion/disconnect', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    await pool.query(
      `UPDATE integration_connections
       SET status = 'disconnected', disconnected_at = NOW(),
           access_token_encrypted = NULL, access_token_iv = NULL, access_token_tag = NULL,
           updated_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND provider_id = 'notion'`,
      [tenantId, req.user.userId]
    );

    res.json({ success: true });
  } catch (err: any) {
    logger.error('Notion disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect Notion' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SLACK WORKSPACE BOT
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/integrations/slack/connect
router.post('/slack/connect', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { token } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Slack Bot User OAuth token is required (xoxb-...)' });
  }

  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const profile = await verifySlackToken(token);
    await saveGenericConnection(
      tenantId,
      req.user.userId,
      'slack',
      { id: profile.id, name: `${profile.teamName} (${profile.botName})`, email: null, avatarUrl: '' },
      token.trim(),
      { teamId: profile.teamId, teamName: profile.teamName, botUserId: profile.botUserId }
    );

    logger.info(`Slack connected: tenant=${tenantId} user=${req.user.userId} team=${profile.teamName}`);
    res.json({ success: true, profile });
  } catch (err: any) {
    logger.error('Slack connect error:', err);
    res.status(400).json({ error: err.message || 'Failed to connect Slack workspace' });
  }
});

// GET /api/integrations/slack/channels
router.get('/slack/channels', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const tokenData = await getGenericConnectionToken(tenantId, req.user.userId, 'slack');
    if (!tokenData) return res.status(400).json({ error: 'Slack is not connected' });

    const channels = await listSlackChannels(tokenData.token);
    res.json({ channels });
  } catch (err: any) {
    logger.error('Slack channels error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch Slack channels' });
  }
});

// POST /api/integrations/slack/sync
router.post('/slack/sync', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { channelId, channelName } = req.body || {};
  if (!channelId) return res.status(400).json({ error: 'Channel ID is required' });

  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const tokenData = await getGenericConnectionToken(tenantId, req.user.userId, 'slack');
    if (!tokenData) return res.status(400).json({ error: 'Slack is not connected' });

    await pool.query(
      `UPDATE integration_connections SET status = 'syncing', updated_at = NOW() WHERE id = $1`,
      [tokenData.conn.id]
    );

    const result = await syncSlackChannel(tenantId, req.user.userId, channelId, tokenData.token);

    await pool.query(
      `UPDATE integration_connections
       SET status = 'connected', last_sync_at = NOW(), files_indexed_count = files_indexed_count + $1,
           settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{syncedChannel}', $2::jsonb),
           updated_at = NOW()
       WHERE id = $3`,
      [result.messagesProcessed, JSON.stringify({ channelId, channelName }), tokenData.conn.id]
    );

    res.json({ success: true, messagesProcessed: result.messagesProcessed });
  } catch (err: any) {
    logger.error('Slack sync error:', err);
    res.status(500).json({ error: err.message || 'Failed to sync Slack channel' });
  }
});

// POST /api/integrations/slack/disconnect
router.post('/slack/disconnect', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    await pool.query(
      `UPDATE integration_connections
       SET status = 'disconnected', disconnected_at = NOW(),
           access_token_encrypted = NULL, access_token_iv = NULL, access_token_tag = NULL,
           updated_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND provider_id = 'slack'`,
      [tenantId, req.user.userId]
    );

    res.json({ success: true });
  } catch (err: any) {
    logger.error('Slack disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect Slack' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FIGMA DESIGN COPILOT
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/integrations/figma/connect
router.post('/figma/connect', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { token } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Figma Personal Access Token is required' });
  }

  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const profile = await verifyFigmaToken(token);
    await saveGenericConnection(
      tenantId,
      req.user.userId,
      'figma',
      { id: profile.id, name: profile.handle, email: profile.email, avatarUrl: profile.avatarUrl },
      token.trim(),
      { email: profile.email, handle: profile.handle }
    );

    logger.info(`Figma connected: tenant=${tenantId} user=${req.user.userId} handle=${profile.handle}`);
    res.json({ success: true, profile });
  } catch (err: any) {
    logger.error('Figma connect error:', err);
    res.status(400).json({ error: err.message || 'Failed to connect Figma account' });
  }
});

// POST /api/integrations/figma/inspect
router.post('/figma/inspect', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { fileUrl } = req.body || {};
  if (!fileUrl) return res.status(400).json({ error: 'Figma file URL or Key is required' });

  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const tokenData = await getGenericConnectionToken(tenantId, req.user.userId, 'figma');
    if (!tokenData) return res.status(400).json({ error: 'Figma is not connected' });

    const info = await inspectFigmaFile(tokenData.token, fileUrl);
    res.json({ fileInfo: info });
  } catch (err: any) {
    logger.error('Figma inspect error:', err);
    res.status(500).json({ error: err.message || 'Failed to inspect Figma file' });
  }
});

// POST /api/integrations/figma/sync
router.post('/figma/sync', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { fileUrl } = req.body || {};
  if (!fileUrl) return res.status(400).json({ error: 'Figma file URL or Key is required' });

  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const tokenData = await getGenericConnectionToken(tenantId, req.user.userId, 'figma');
    if (!tokenData) return res.status(400).json({ error: 'Figma is not connected' });

    await pool.query(
      `UPDATE integration_connections SET status = 'syncing', updated_at = NOW() WHERE id = $1`,
      [tokenData.conn.id]
    );

    const info = await syncFigmaFile(tenantId, req.user.userId, fileUrl, tokenData.token);

    await pool.query(
      `UPDATE integration_connections
       SET status = 'connected', last_sync_at = NOW(), files_indexed_count = files_indexed_count + $1,
           settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{syncedFile}', $2::jsonb),
           updated_at = NOW()
       WHERE id = $3`,
      [info.framesCount, JSON.stringify({ key: info.key, name: info.name }), tokenData.conn.id]
    );

    res.json({ success: true, fileInfo: info });
  } catch (err: any) {
    logger.error('Figma sync error:', err);
    res.status(500).json({ error: err.message || 'Failed to sync Figma file' });
  }
});

// POST /api/integrations/figma/disconnect
router.post('/figma/disconnect', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    await pool.query(
      `UPDATE integration_connections
       SET status = 'disconnected', disconnected_at = NOW(),
           access_token_encrypted = NULL, access_token_iv = NULL, access_token_tag = NULL,
           updated_at = NOW()
       WHERE tenant_id = $1 AND user_id = $2 AND provider_id = 'figma'`,
      [tenantId, req.user.userId]
    );

    res.json({ success: true });
  } catch (err: any) {
    logger.error('Figma disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect Figma' });
  }
});

export default router;
