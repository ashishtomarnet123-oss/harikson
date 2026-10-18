import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import logger from '../utils/logger.js';

export interface AuthenticatedUser {
  id: string;
  userId?: string;
  email?: string;
  role?: string;
  tenantId?: string;
  isDeveloperKey?: boolean;
  isInternal?: boolean;
  scopes?: string[];
  apiKeyId?: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const cookieToken = (req as any).cookies?.hk_access_token;
  const internalSecret = req.headers['x-internal-secret'] as string | undefined;

  if (
    internalSecret &&
    process.env.INTERNAL_API_SECRET &&
    process.env.INTERNAL_API_SECRET.length >= 32
  ) {
    const providedBuf = Buffer.from(internalSecret);
    const configuredBuf = Buffer.from(process.env.INTERNAL_API_SECRET);
    const isSecretValid =
      providedBuf.length === configuredBuf.length &&
      crypto.timingSafeEqual(providedBuf, configuredBuf);

    if (isSecretValid) {
      (req as any).user = {
        id: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000001',
        role: 'internal_service',
        isInternal: true,
      };
      return next();
    }
  }

  // 2. Developer API Key Authentication (Bearer hk_live_...)
  if (authHeader.startsWith('Bearer hk_live_')) {
    const rawKey = authHeader.substring(7).trim();
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    pool
      .query(
        `SELECT k.id, k.tenant_id, k.user_id, k.scopes, k.status, t.id as resolved_tenant_id, t.slug as tenant_slug
         FROM tenant_api_keys k
         JOIN tenants t ON t.id = k.tenant_id
         WHERE k.key_hash = $1 AND k.status = 'active'`,
        [keyHash]
      )
      .then((keyRes) => {
        if (keyRes.rows.length === 0) {
          return res.status(401).json({ error: 'Unauthorized: Invalid or revoked API key' });
        }

        const key = keyRes.rows[0];
        (req as any).user = {
          id: key.user_id,
          userId: key.user_id,
          role: 'developer',
          tenantId: key.tenant_id,
          isDeveloperKey: true,
          scopes: key.scopes,
          apiKeyId: key.id,
        };

        (req as any).tenant = {
          id: key.resolved_tenant_id,
          slug: key.tenant_slug,
        };

        // Fire-and-forget: update last_used_at timestamp
        pool
          .query('UPDATE tenant_api_keys SET last_used_at = NOW() WHERE id = $1', [key.id])
          .catch(() => {});

        return next();
      })
      .catch((dbErr) => {
        logger.error('API key authentication query error:', dbErr);
        return res.status(500).json({ error: 'Authentication service error' });
      });

    return;
  }

  // 3. User JWT Authentication (Bearer JWT or HttpOnly cookie)
  let token = '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (cookieToken) {
    token = cookieToken.trim();
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Authentication credentials required' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    logger.error('FATAL: JWT_SECRET not configured or too short');
    return res.status(500).json({ error: 'Authentication misconfiguration' });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as any;
    (req as any).user = decoded;

    // Ensure tenant context aligns with authenticated user
    const tenantContext = (req as any).tenant;
    if (tenantContext && decoded.tenantId && tenantContext.id !== decoded.tenantId) {
      return res.status(403).json({ error: 'Forbidden: Access to requested tenant denied' });
    }

    return next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}
