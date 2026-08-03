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
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_neuravolt_2026');
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

const KNOWN_PROVIDERS = ['google_drive', 'github', 'vscode', 'slack', 'notion', 'figma'];

// GET /api/integrations — list every provider's connection status for the Connected Apps page.
router.get('/', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'No tenant associated with this account' });

    const connRes = await pool.query(
      `SELECT provider_id, status, provider_email, provider_name, provider_picture_url, last_sync_at, files_indexed_count, last_error
       FROM integration_connections WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, req.user.userId]
    );
    const byProvider = new Map(connRes.rows.map((r: any) => [r.provider_id, r]));

    const integrations = KNOWN_PROVIDERS.map((providerId) => {
      if (providerId !== 'google_drive') {
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
        filesIndexed: conn.files_indexed_count,
        error: conn.last_error,
      };
    });

    res.json({ integrations });
  } catch (err: any) {
    logger.error('List integrations error:', err);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

// GET /api/integrations/google/auth — starts the OAuth flow, returns the consent URL for the frontend to redirect to.
router.get('/google/auth', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!isGoogleOAuthConfigured()) {
    return res.status(500).json({ error: 'Google integration is not configured on this server' });
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

export default router;
