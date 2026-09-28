import { Router } from 'express';
import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { pool, executeTenantQuery } from '../db/pool.js';
import logger from '../utils/logger.js';

const router = Router();

// ──────────────────────────────────────────────────────────────
// Token helpers
// ──────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure, URL-safe 48-byte token.
 * Base64url encoding keeps the token safe for URLs without encoding.
 */
function generateShareToken(): string {
  return randomBytes(48).toString('base64url');
}

/**
 * Hash the raw token with SHA-256 before storage.
 * The database only ever stores the hash, never the raw token.
 */
function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

// ──────────────────────────────────────────────────────────────
// Auth middleware — required for share creation and management
// ──────────────────────────────────────────────────────────────

function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization || '';
  const cookieToken = req.cookies?.hk_access_token;
  let token = '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (cookieToken) {
    token = cookieToken;
  }
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ──────────────────────────────────────────────────────────────
// Rate limiting for public endpoint (in-memory sliding window)
// Simple but effective for single-process deployment.
// Replace with Redis-backed limiter for multi-instance setups.
// ──────────────────────────────────────────────────────────────

const publicRateMap = new Map<string, { count: number; windowStart: number }>();
const PUBLIC_RATE_LIMIT = 30;       // max requests
const PUBLIC_RATE_WINDOW_MS = 60_000; // per 60 seconds per IP

function checkPublicRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = publicRateMap.get(ip);
  if (!entry || now - entry.windowStart > PUBLIC_RATE_WINDOW_MS) {
    publicRateMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  entry.count++;
  if (entry.count > PUBLIC_RATE_LIMIT) return false;
  return true;
}

// Cleanup stale entries periodically to prevent unbounded memory growth
setInterval(() => {
  const cutoff = Date.now() - PUBLIC_RATE_WINDOW_MS * 2;
  for (const [ip, entry] of publicRateMap.entries()) {
    if (entry.windowStart < cutoff) publicRateMap.delete(ip);
  }
}, 120_000);

// ──────────────────────────────────────────────────────────────
// PUBLIC ENDPOINT: GET /api/public/shares/:token
// No authentication required. Rate-limited.
// Returns ONLY safe public data from the share snapshot.
// ──────────────────────────────────────────────────────────────

router.get('/shares/:token', async (req: any, res) => {
  const ip = (req.ip || req.connection?.remoteAddress || 'unknown').toString();

  // Rate limiting
  if (!checkPublicRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const { token } = req.params;

  // Basic sanity — tokens are base64url, 64 chars from 48 random bytes
  if (!token || typeof token !== 'string' || token.length < 30 || token.length > 100) {
    return res.status(404).json({ error: 'Share not found or no longer available.' });
  }

  const tokenHash = hashToken(token);

  try {
    // Single query: validate token, check active/expiry/revocation in one shot.
    // Note: NO tenant context set here — this is a public endpoint. The share
    // record itself is the authorization boundary (no cross-tenant leak possible
    // because we look up ONLY by token hash, not by conversation_id or tenant_id).
    const result = await pool.query(
      `SELECT
         cs.id,
         cs.title_snapshot,
         cs.conversation_snapshot,
         cs.created_at,
         cs.expires_at,
         cs.revoked_at,
         cs.is_active
       FROM conversation_shares cs
       WHERE cs.share_token_hash = $1`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      // Generic message — do not differentiate between invalid/revoked/expired
      // to prevent enumeration attacks.
      return res.status(404).json({ error: 'Share not found or no longer available.' });
    }

    const share = result.rows[0];

    // Check revocation
    if (!share.is_active || share.revoked_at) {
      return res.status(404).json({ error: 'Share not found or no longer available.' });
    }

    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(404).json({ error: 'Share not found or no longer available.' });
    }

    // Update analytics (fire-and-forget, don't block response)
    pool.query(
      `UPDATE conversation_shares
       SET access_count = access_count + 1, last_accessed_at = NOW()
       WHERE id = $1`,
      [share.id]
    ).catch((e: any) => logger.warn('Failed to update share access_count:', e));

    // Return ONLY safe public data — no user IDs, tenant IDs, internal IDs,
    // model names, API keys, system prompts, or private metadata.
    return res.json({
      title: share.title_snapshot || 'Shared Conversation',
      messages: share.conversation_snapshot,
      createdAt: share.created_at,
    });
  } catch (err) {
    logger.error('Public share lookup error:', err);
    return res.status(500).json({ error: 'Failed to load shared conversation.' });
  }
});

// ──────────────────────────────────────────────────────────────
// AUTHENTICATED ENDPOINTS: require auth + tenant context
// ──────────────────────────────────────────────────────────────

// GET /api/conversations/:conversationId/share — get current share status
router.get('/conversations/:conversationId/share', requireAuth, async (req: any, res) => {
  const { conversationId } = req.params;
  const userId = req.user.userId;

  if (!UUID_RE.test(conversationId)) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }

  try {
    // Verify the conversation belongs to the user within this tenant
    const convCheck = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `SELECT id FROM conversations
         WHERE id = $1 AND tenant_id = $2 AND user_id = $3 AND deleted_at IS NULL`,
        [conversationId, req.tenant.id, userId]
      )
    );
    if (convCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    // Find active share
    const shareRes = await pool.query(
      `SELECT id, is_active, expires_at, created_at, access_count, last_accessed_at, revoked_at
       FROM conversation_shares
       WHERE conversation_id = $1 AND owner_user_id = $2 AND tenant_id = $3 AND is_active = TRUE
       ORDER BY created_at DESC
       LIMIT 1`,
      [conversationId, userId, req.tenant.id]
    );

    if (shareRes.rows.length === 0) {
      return res.json({ shared: false });
    }

    const share = shareRes.rows[0];

    return res.json({
      shared: true,
      shareId: share.id,
      // Raw token is not stored — we cannot return it here.
      // The share URL is returned only at creation time.
      expiresAt: share.expires_at,
      createdAt: share.created_at,
      accessCount: share.access_count,
      lastAccessedAt: share.last_accessed_at,
    });
  } catch (err) {
    logger.error('Share status error:', err);
    return res.status(500).json({ error: 'Failed to get share status.' });
  }
});

// POST /api/conversations/:conversationId/share — create share (revokes prior)
router.post('/conversations/:conversationId/share', requireAuth, async (req: any, res) => {
  const { conversationId } = req.params;
  const { expiresIn } = req.body; // optional: '1d' | '7d' | '30d' | null
  const userId = req.user.userId;

  if (!UUID_RE.test(conversationId)) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }

  try {
    // 1. Verify ownership + tenant
    const convRes = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `SELECT c.id, c.title FROM conversations c
         WHERE c.id = $1 AND c.tenant_id = $2 AND c.user_id = $3 AND c.deleted_at IS NULL`,
        [conversationId, req.tenant.id, userId]
      )
    );
    if (convRes.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }
    const conversation = convRes.rows[0];

    // 2. Revoke any existing active share (ensures single active share per conversation)
    await pool.query(
      `UPDATE conversation_shares
       SET is_active = FALSE, revoked_at = NOW(), updated_at = NOW()
       WHERE conversation_id = $1 AND owner_user_id = $2 AND tenant_id = $3 AND is_active = TRUE`,
      [conversationId, userId, req.tenant.id]
    );

    // 3. Capture immutable snapshot — only user and assistant messages,
    //    ordered by creation time. System prompts, tool calls, and any
    //    messages with sender not in ('user', 'assistant') are excluded.
    const msgsRes = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `SELECT sender AS role, content, created_at
         FROM messages
         WHERE conversation_id = $1
           AND tenant_id = $2
           AND sender IN ('user', 'assistant')
         ORDER BY created_at ASC`,
        [conversationId, req.tenant.id]
      )
    );

    const snapshot = msgsRes.rows.map((m: any) => ({
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    }));

    // 4. Compute expiry
    let expiresAt: Date | null = null;
    if (expiresIn === '1d') {
      expiresAt = new Date(Date.now() + 86400_000);
    } else if (expiresIn === '7d') {
      expiresAt = new Date(Date.now() + 7 * 86400_000);
    } else if (expiresIn === '30d') {
      expiresAt = new Date(Date.now() + 30 * 86400_000);
    }

    // 5. Generate secure token — stored only as hash
    const rawToken = generateShareToken();
    const tokenHash = hashToken(rawToken);

    // 6. Insert share record
    await pool.query(
      `INSERT INTO conversation_shares
         (tenant_id, conversation_id, owner_user_id, share_token_hash,
          conversation_snapshot, title_snapshot, is_active, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7)`,
      [
        req.tenant.id,
        conversationId,
        userId,
        tokenHash,
        JSON.stringify(snapshot),
        conversation.title || 'Shared Conversation',
        expiresAt,
      ]
    );

    // 7. Audit log (safe — no raw token logged)
    logger.info(
      { conversationId, userId, tenantId: req.tenant.id, tokenHashPrefix: tokenHash.substring(0, 8) },
      '[SHARE] Conversation share created'
    );

    const baseUrl = process.env.APP_URL || 'https://xarwiz.com';
    const shareUrl = `${baseUrl}/share/${rawToken}`;

    // Raw token returned ONCE — caller must copy it. Not recoverable after this.
    return res.json({
      shareUrl,
      expiresAt,
      messageCount: snapshot.length,
    });
  } catch (err) {
    logger.error('Share creation error:', err);
    return res.status(500).json({ error: 'Failed to create share link.' });
  }
});

// POST /api/conversations/:conversationId/share/revoke — revoke active share
router.post('/conversations/:conversationId/share/revoke', requireAuth, async (req: any, res) => {
  const { conversationId } = req.params;
  const userId = req.user.userId;

  if (!UUID_RE.test(conversationId)) {
    return res.status(404).json({ error: 'Conversation not found.' });
  }

  try {
    // Verify ownership
    const convCheck = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `SELECT id FROM conversations
         WHERE id = $1 AND tenant_id = $2 AND user_id = $3 AND deleted_at IS NULL`,
        [conversationId, req.tenant.id, userId]
      )
    );
    if (convCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    const revokeRes = await pool.query(
      `UPDATE conversation_shares
       SET is_active = FALSE, revoked_at = NOW(), updated_at = NOW()
       WHERE conversation_id = $1 AND owner_user_id = $2 AND tenant_id = $3 AND is_active = TRUE
       RETURNING id`,
      [conversationId, userId, req.tenant.id]
    );

    logger.info(
      { conversationId, userId, tenantId: req.tenant.id, revokedCount: revokeRes.rowCount },
      '[SHARE] Conversation share revoked'
    );

    return res.json({ success: true, revokedCount: revokeRes.rowCount });
  } catch (err) {
    logger.error('Share revocation error:', err);
    return res.status(500).json({ error: 'Failed to revoke share link.' });
  }
});

export default router;
