import { Request, Response, NextFunction } from 'express';
import { executeCachedQuery } from '../db/pool.js';
import logger from '../utils/logger.js';

export interface PlanEntitlements {
  planId: string;
  planName: string;
  tokenLimit: number;
  storageLimitGb: number;
  features: string[];
  isTrial: boolean;
  trialEndsAt: Date | null;
}

declare global {
  namespace Express {
    interface Request {
      entitlements?: PlanEntitlements;
    }
  }
}

export function loadEntitlements() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const tenant = (req as any).tenant;
    if (!tenant?.id) return next();

    try {
      const result: any = await executeCachedQuery(
        `SELECT p.id as plan_id, p.name as plan_name, p.token_limit, p.storage_limit_gb, p.features,
                t.is_trial, t.trial_ends_at
         FROM tenants t
         LEFT JOIN plans p ON LOWER(t.plan) = LOWER(p.id)
         WHERE t.id = $1`,
        [tenant.id],
        60,
        tenant.id
      );

      const row = result.rows?.[0];
      if (row) {
        req.entitlements = {
          planId: row.plan_id || 'free',
          planName: row.plan_name || 'Free Plan',
          tokenLimit: row.token_limit ?? -1,
          storageLimitGb: row.storage_limit_gb ?? -1,
          features: Array.isArray(row.features) ? row.features : [],
          isTrial: row.is_trial || false,
          trialEndsAt: row.trial_ends_at || null,
        };
      }
    } catch (err) {
      logger.warn('Failed to load plan entitlements:', err);
    }

    next();
  };
}

export function requirePlan(...allowedPlans: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const planId = req.entitlements?.planId || 'free';
    if (allowedPlans.includes(planId)) return next();
    return res.status(403).json({
      error: `This feature requires one of: ${allowedPlans.join(', ')}. Your current plan: ${planId}.`,
    });
  };
}
