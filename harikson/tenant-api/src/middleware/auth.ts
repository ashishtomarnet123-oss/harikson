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
  authType?: 'internal' | 'api_key' | 'session';
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
        authType: 'internal',
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
        `SELECT k.id, k.tenant_id, k.user_id, k.scopes, k.status, t.id as resolved_tenant_id, t.slug as tenant_slug, t.plan as tenant_plan, t.status as tenant_status, p.features as plan_features
         FROM tenant_api_keys k
         JOIN tenants t ON t.id = k.tenant_id
         LEFT JOIN plans p ON LOWER(t.plan) = LOWER(p.id)
         WHERE k.key_hash = $1 AND k.status = 'active'`,
        [keyHash]
      )
      .then((keyRes) => {
        if (keyRes.rows.length === 0) {
          return res.status(401).json({ error: 'Unauthorized: Invalid or revoked API key' });
        }

        const key = keyRes.rows[0];

        if (key.tenant_status === 'suspended') {
          return res.status(403).json({
            error: 'Account or workspace suspended. Please contact administrator.',
            code: 'ACCOUNT_SUSPENDED',
          });
        }

        // Resolve api_access entitlement for the tenant's effective plan
        let featuresObj: Record<string, any> = {};
        if (typeof key.plan_features === 'string') {
          try {
            featuresObj = JSON.parse(key.plan_features);
          } catch (_) {
            featuresObj = {};
          }
        } else if (key.plan_features && typeof key.plan_features === 'object' && !Array.isArray(key.plan_features)) {
          featuresObj = key.plan_features;
        }

        const planId = (key.tenant_plan || 'free').toLowerCase();
        let apiAccess = false;
        if (typeof featuresObj.api_access === 'boolean') {
          apiAccess = featuresObj.api_access;
        } else {
          // Documented safe policy: Starter, Professional, Enterprise default to true; Free defaults to false.
          apiAccess = ['starter', 'professional', 'enterprise'].includes(planId);
        }

        if (!apiAccess) {
          return res.status(403).json({
            error: 'API access is not enabled for your subscription plan. Please upgrade your plan to use API keys.',
            code: 'PLAN_FEATURE_DISABLED',
            feature: 'api_access',
            plan: planId,
          });
        }

        (req as any).user = {
          id: key.user_id,
          userId: key.user_id,
          role: 'developer',
          tenantId: key.tenant_id,
          isDeveloperKey: true,
          scopes: key.scopes,
          apiKeyId: key.id,
          authType: 'api_key',
        };

        (req as any).tenant = {
          id: key.resolved_tenant_id,
          slug: key.tenant_slug,
          plan: key.tenant_plan || 'free',
          status: key.tenant_status || 'active',
        };

        (req as any).entitlements = {
          planId,
          planName: key.tenant_plan || 'Plan',
          tokenLimit: -1,
          storageLimitGb: -1,
          imageLimitMonthly: 10,
          features: featuresObj,
          apiAccess: true,
          isTrial: false,
          trialEndsAt: null,
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

    // A scoped temporary token for mandatory password change CANNOT access normal protected routes
    if (decoded.purpose === 'force_password_change' || decoded.type === 'temp_change_password') {
      return res.status(403).json({
        error: 'Password change required before access. Please complete password change.',
        code: 'FORCE_PASSWORD_CHANGE_REQUIRED',
        mustChangePassword: true,
      });
    }

    (req as any).user = {
      ...decoded,
      authType: 'session',
      isDeveloperKey: false,
    };

    // Ensure tenant context aligns with authenticated user
    const tenantContext = (req as any).tenant;
    if (tenantContext && decoded.tenantId && tenantContext.id !== decoded.tenantId) {
      return res.status(403).json({ error: 'Forbidden: Access to requested tenant denied' });
    }

    // Strict account approval verification: only active users or platform admins are permitted
    const isPlatformAdmin = ['admin', 'superadmin', 'founder'].includes(decoded.role);
    if (!isPlatformAdmin && decoded.userId) {
      pool
        .query('SELECT status, deleted_at FROM users WHERE id = $1', [decoded.userId])
        .then((userStatusRes) => {
          if (userStatusRes.rows.length === 0 || userStatusRes.rows[0].deleted_at) {
            return res.status(401).json({ error: 'Unauthorized: User account not found or deleted' });
          }
          const currentStatus = (userStatusRes.rows[0].status || 'pending').toLowerCase().trim();
          if (currentStatus !== 'active') {
            return res.status(403).json({
              error: currentStatus === 'suspended' ? 'Account suspended' : 'Account pending administrator approval',
              code: currentStatus === 'suspended' ? 'ACCOUNT_SUSPENDED' : 'ACCOUNT_PENDING_APPROVAL',
              pendingApproval: currentStatus !== 'suspended',
            });
          }
          return next();
        })
        .catch((dbErr) => {
          logger.error('Failed to verify user status in requireAuth:', dbErr);
          return res.status(500).json({ error: 'Authentication service error' });
        });
      return;
    }

    return next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}
