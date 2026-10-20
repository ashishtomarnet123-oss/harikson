import { Request, Response, NextFunction } from 'express';
import { executeCachedQuery } from '../db/pool.js';
import logger from '../utils/logger.js';

export interface PlanEntitlements {
  planId: string;
  planName: string;
  tokenLimit: number;
  storageLimitGb: number;
  imageLimitMonthly: number;
  features: Record<string, any>;
  apiAccess: boolean;
  ragDocumentsLimit: number;
  auditTrail: boolean;
  webhookLogging: boolean;
  prioritySupport: boolean;
  slaHours: number | null;
  customModels: boolean;
  dpdpCompliance: boolean;
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
        `SELECT p.id as plan_id, p.name as plan_name, p.token_limit, p.storage_limit_gb, COALESCE(p.image_limit_monthly, 10) as image_limit_monthly, p.features
         FROM tenants t
         LEFT JOIN plans p ON (LOWER(t.plan) = LOWER(p.id) OR (LOWER(t.plan) = 'pro' AND LOWER(p.id) = 'professional'))
         WHERE t.id = $1`,
        [tenant.id],
        60,
        tenant.id
      );

      const row = result.rows?.[0];
      if (row) {
        let featuresObj: Record<string, any> = {};
        if (typeof row.features === 'string') {
          try {
            featuresObj = JSON.parse(row.features);
          } catch (_) {
            featuresObj = {};
          }
        } else if (row.features && typeof row.features === 'object' && !Array.isArray(row.features)) {
          featuresObj = row.features;
        }

        const rawPlanId = (row.plan_id || 'free').toLowerCase();
        const planId = rawPlanId === 'pro' ? 'professional' : rawPlanId;
        let apiAccess = false;
        if (typeof featuresObj.api_access === 'boolean') {
          apiAccess = featuresObj.api_access;
        } else {
          // Documented safe policy: Starter, Professional, Enterprise default to true; Free defaults to false.
          apiAccess = ['starter', 'professional', 'enterprise'].includes(planId);
        }

        let ragDocumentsLimit = 10;
        if (typeof featuresObj.rag_documents === 'number') {
          ragDocumentsLimit = featuresObj.rag_documents;
        } else if (typeof featuresObj.rag_documents === 'string' && !isNaN(Number(featuresObj.rag_documents))) {
          ragDocumentsLimit = Number(featuresObj.rag_documents);
        } else {
          if (planId === 'enterprise') ragDocumentsLimit = -1;
          else if (planId === 'professional') ragDocumentsLimit = 50000;
          else if (planId === 'starter') ragDocumentsLimit = 500;
          else ragDocumentsLimit = 10;
        }

        let auditTrail = false;
        if (typeof featuresObj.audit_trail === 'boolean') {
          auditTrail = featuresObj.audit_trail;
        } else {
          // Documented safe policy: Professional and Enterprise default to true; Free and Starter default to false.
          auditTrail = ['professional', 'enterprise'].includes(planId);
        }

        let webhookLogging = false;
        if (typeof featuresObj.webhook_logging === 'boolean') {
          webhookLogging = featuresObj.webhook_logging;
        } else {
          // Documented safe policy: Professional and Enterprise default to true; Free and Starter default to false.
          webhookLogging = ['professional', 'enterprise'].includes(planId);
        }

        let prioritySupport = false;
        if (typeof featuresObj.priority_support === 'boolean') {
          prioritySupport = featuresObj.priority_support;
        } else {
          // Documented safe policy: Professional and Enterprise default to true; Free and Starter default to false.
          prioritySupport = ['professional', 'enterprise'].includes(planId);
        }

        let slaHours: number | null = null;
        if (typeof featuresObj.sla_hours === 'number' && Number.isFinite(featuresObj.sla_hours)) {
          if (featuresObj.sla_hours === 0) {
            slaHours = null; // Explicit 0 represents no contractual SLA guarantee
          } else if (featuresObj.sla_hours > 0) {
            slaHours = Math.round(featuresObj.sla_hours);
          } else {
            // Negative value is invalid -> fallback to documented plan-tier default
            if (planId === 'enterprise') slaHours = 2;
            else if (planId === 'professional') slaHours = 12;
            else if (planId === 'starter') slaHours = 72;
            else slaHours = null;
          }
        } else if (
          typeof featuresObj.sla_hours === 'string' &&
          featuresObj.sla_hours.trim() !== '' &&
          !isNaN(Number(featuresObj.sla_hours))
        ) {
          const num = Number(featuresObj.sla_hours);
          if (num === 0) {
            slaHours = null;
          } else if (num > 0) {
            slaHours = Math.round(num);
          } else {
            if (planId === 'enterprise') slaHours = 2;
            else if (planId === 'professional') slaHours = 12;
            else if (planId === 'starter') slaHours = 72;
            else slaHours = null;
          }
        } else {
          // Documented safe policy: Enterprise = 2, Professional = 12, Starter = 72, Free = null (no contractual SLA).
          if (planId === 'enterprise') slaHours = 2;
          else if (planId === 'professional') slaHours = 12;
          else if (planId === 'starter') slaHours = 72;
          else slaHours = null;
        }

        let customModels = false;
        if (typeof featuresObj.custom_models === 'boolean') {
          customModels = featuresObj.custom_models;
        } else {
          // Documented safe policy: Enterprise defaults to true; Free, Starter, Professional default to false.
          customModels = planId === 'enterprise';
        }

        let dpdpCompliance = true;
        if (typeof featuresObj.dpdp_compliance === 'boolean') {
          dpdpCompliance = featuresObj.dpdp_compliance;
        } else {
          // Documented safe policy: DPDP compliance baseline protections apply universally across all plans (free, starter, professional, enterprise).
          // In plan definitions (admin-panel/app/admin/tenants/page.tsx), dpdp_compliance defaults to true across all tiers.
          dpdpCompliance = true;
        }

        req.entitlements = {
          planId: row.plan_id || 'free',
          planName: row.plan_name || 'Free Plan',
          tokenLimit: row.token_limit ?? -1,
          storageLimitGb: row.storage_limit_gb ?? -1,
          imageLimitMonthly: row.image_limit_monthly ?? 10,
          features: featuresObj,
          apiAccess,
          ragDocumentsLimit,
          auditTrail,
          webhookLogging,
          prioritySupport,
          slaHours,
          customModels,
          dpdpCompliance,
          isTrial: false,
          trialEndsAt: null,
        };
      } else {
        req.entitlements = {
          planId: 'free',
          planName: 'Free Plan',
          tokenLimit: -1,
          storageLimitGb: -1,
          imageLimitMonthly: 10,
          features: {},
          apiAccess: false,
          ragDocumentsLimit: 10,
          auditTrail: false,
          webhookLogging: false,
          prioritySupport: false,
          slaHours: null,
          customModels: false,
          dpdpCompliance: true,
          isTrial: false,
          trialEndsAt: null,
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

/**
 * Middleware to enforce the api_access plan feature entitlement.
 * Rejects requests from tenants whose effective plan does not have api_access enabled.
 */
export function requireApiAccess(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const tenant = (req as any).tenant;

  // Unauthenticated requests continue to follow the existing authentication behavior (401)
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  // Internal service bypass
  if (user.isInternal) {
    return next();
  }

  const checkEntitlement = () => {
    if (req.entitlements?.apiAccess) {
      return next();
    }

    return res.status(403).json({
      error: 'API access is not enabled for your subscription plan. Please upgrade your plan to access the API.',
      code: 'PLAN_FEATURE_DISABLED',
      feature: 'api_access',
      plan: req.entitlements?.planId || 'free',
    });
  };

  if (!req.entitlements && tenant?.id) {
    loadEntitlements()(req, res, () => {
      checkEntitlement();
    });
  } else {
    checkEntitlement();
  }
}

/**
 * Middleware to enforce the audit_trail plan feature entitlement.
 * Rejects requests from tenants whose effective plan does not have audit_trail enabled.
 */
export function requireAuditTrail(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const tenantId =
    (req as any).tenant?.id ||
    (req as any).tenantId ||
    user?.tenantId ||
    (req.headers['x-tenant-id'] as string);

  // Unauthenticated requests continue to follow existing authentication behavior (401)
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  // Internal service bypass
  if (user.isInternal) {
    return next();
  }

  const checkEntitlement = () => {
    if (req.entitlements?.auditTrail) {
      return next();
    }

    return res.status(403).json({
      error: 'Audit trail is not enabled for your subscription plan. Please upgrade your plan to access audit history.',
      code: 'PLAN_FEATURE_DISABLED',
      feature: 'audit_trail',
      plan: req.entitlements?.planId || 'free',
      currentPlan: req.entitlements?.planId || 'free',
    });
  };

  if (!req.entitlements && tenantId) {
    loadEntitlements()(req, res, () => {
      checkEntitlement();
    });
  } else {
    checkEntitlement();
  }
}

/**
 * Middleware to enforce the webhook_logging plan feature entitlement.
 * Rejects customer-facing requests from tenants whose effective plan does not have webhook_logging enabled.
 */
export function requireWebhookLogging(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const tenantId =
    (req as any).tenant?.id ||
    (req as any).tenantId ||
    user?.tenantId ||
    user?.tenant_id ||
    (req.headers['x-tenant-id'] as string);

  // Unauthenticated requests continue to follow existing authentication behavior (401)
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  // Internal service bypass
  if (user.isInternal) {
    return next();
  }

  const checkEntitlement = () => {
    if (req.entitlements?.webhookLogging) {
      return next();
    }

    return res.status(403).json({
      error: 'Webhook logging is not enabled for your subscription plan. Please upgrade your plan to access webhook delivery history and logs.',
      code: 'PLAN_FEATURE_DISABLED',
      feature: 'webhook_logging',
      plan: req.entitlements?.planId || 'free',
      currentPlan: req.entitlements?.planId || 'free',
    });
  };

  if (!req.entitlements && tenantId) {
    if (!(req as any).tenant) {
      (req as any).tenant = { id: tenantId };
    }
    loadEntitlements()(req, res, () => {
      checkEntitlement();
    });
  } else {
    checkEntitlement();
  }
}

/**
 * Middleware to enforce the priority_support plan feature entitlement.
 * Rejects requests for priority-only support operations from tenants whose effective plan does not have priority_support enabled.
 */
export function requirePrioritySupport(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const tenantId =
    (req as any).tenant?.id ||
    (req as any).tenantId ||
    user?.tenantId ||
    user?.tenant_id ||
    (req.headers['x-tenant-id'] as string);

  // Unauthenticated requests continue to follow existing authentication behavior (401)
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  // Internal service bypass
  if (user.isInternal) {
    return next();
  }

  const checkEntitlement = () => {
    if (req.entitlements?.prioritySupport) {
      return next();
    }

    return res.status(403).json({
      error: 'Priority support is not enabled for your subscription plan. Please upgrade your plan to access priority support handling.',
      code: 'PLAN_FEATURE_DISABLED',
      feature: 'priority_support',
      plan: req.entitlements?.planId || 'free',
      currentPlan: req.entitlements?.planId || 'free',
    });
  };

  if (!req.entitlements && tenantId) {
    if (!(req as any).tenant) {
      (req as any).tenant = { id: tenantId };
    }
    loadEntitlements()(req, res, () => {
      checkEntitlement();
    });
  } else {
    checkEntitlement();
  }
}

/**
 * Middleware to enforce RAG document limits upfront on document upload routes.
 */
export function requireDocumentQuota(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const tenantId =
    (req as any).tenant?.id ||
    (req as any).tenantId ||
    (req as any).user?.tenantId ||
    (req.headers['x-tenant-id'] as string);

  if (user?.isInternal) {
    return next();
  }

  if (!tenantId) {
    return next();
  }

  import('../services/documentQuotaService.js')
    .then(({ DocumentQuotaService }) => DocumentQuotaService.checkQuota(tenantId))
    .then((result) => {
      if (!result.allowed) {
        return res.status(403).json({
          error: `RAG document limit reached (${result.currentUsage}/${result.limit}) for your ${result.plan} plan. Please upgrade your plan or delete existing documents to upload more.`,
          code: 'PLAN_LIMIT_EXCEEDED',
          feature: 'rag_documents',
          limitReached: true,
          currentUsage: result.currentUsage,
          limit: result.limit,
          plan: result.plan,
        });
      }
      return next();
    })
    .catch((err) => {
      logger.warn('Document quota check failed, allowing request:', err);
      return next();
    });
}

/**
 * Standard Platform Models available to all subscription tiers without requiring the custom_models entitlement.
 */
export const PLATFORM_DEFAULT_MODELS: readonly string[] = [
  'harikson-plus',
  'harikson-max',
  'harikson-pro',
  'harikson-mini',
  'harikson-8b',
  'harikson-plus-8b',
  'general',
  'qwen3-coder',
  'qwen3-8b',
  'qwen3-14b',
  'qwen3-32b',
  'qwen2.5:3b',
  'qwen2.5-coder-7b',
  'qwen2.5-coder-14b',
  'qwen2.5-coder-32b',
  'gpt-4o',
  'llama3.2',
  'xarwiz-3b',
];

/**
 * Checks if a given model identifier is a standard platform default model.
 */
export function isPlatformDefaultModel(modelName?: string | null): boolean {
  if (!modelName) return true;
  const norm = modelName.trim().toLowerCase();
  return PLATFORM_DEFAULT_MODELS.some((m) => m.toLowerCase() === norm);
}

/**
 * Checks if a given model identifier represents a custom model format.
 */
export function isCustomModelIdentifier(modelName?: string | null): boolean {
  if (!modelName) return false;
  const norm = modelName.trim().toLowerCase();
  if (isPlatformDefaultModel(norm)) return false;
  return (
    norm.startsWith('custom-') ||
    norm.startsWith('custom_') ||
    norm.startsWith('custom:') ||
    norm.startsWith('ft:') ||
    norm.startsWith('fine-tuned-') ||
    norm.includes('fine-tune') ||
    norm.includes('adapter') ||
    norm === 'custom'
  );
}

/**
 * Middleware to enforce the custom_models plan feature entitlement.
 * Rejects requests for custom model configuration or custom-model selection from tenants whose effective plan does not have custom_models enabled.
 */
export function requireCustomModels(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const tenantId =
    (req as any).tenant?.id ||
    (req as any).tenantId ||
    user?.tenantId ||
    user?.tenant_id ||
    (req.headers['x-tenant-id'] as string);

  // Unauthenticated requests continue to follow existing authentication behavior (401)
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  // Internal service bypass
  if (user.isInternal) {
    return next();
  }

  const checkEntitlement = () => {
    if (req.entitlements?.customModels) {
      return next();
    }

    return res.status(403).json({
      error: 'Custom models are not enabled for your subscription plan. Please upgrade to Enterprise to use custom models.',
      code: 'PLAN_FEATURE_DISABLED',
      feature: 'custom_models',
      plan: req.entitlements?.planId || 'free',
      currentPlan: req.entitlements?.planId || 'free',
    });
  };

  if (!req.entitlements && tenantId) {
    if (!(req as any).tenant) {
      (req as any).tenant = { id: tenantId };
    }
    loadEntitlements()(req, res, () => {
      checkEntitlement();
    });
  } else {
    checkEntitlement();
  }
}

/**
 * Middleware to enforce the optional dpdp_compliance plan feature entitlement on genuinely optional commercial compliance capabilities.
 *
 * CRITICAL SAFETY PRINCIPLE:
 * This middleware MUST NEVER be applied to mandatory statutory baseline privacy protections,
 * including privacy notices, user consent preference viewing/updating, data principal rights requests,
 * personal data exports, account erasure workflows, grievance redressal, or security audit logs.
 * Those baseline protections are legally and operationally universal across all subscription tiers.
 *
 * This middleware is strictly reserved for optional commercial compliance extensions (such as enterprise
 * auditor portals or third-party compliance evidence exports) if configured.
 */
export function requireDpdpCompliance(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  const tenantId =
    (req as any).tenant?.id ||
    (req as any).tenantId ||
    user?.tenantId ||
    user?.tenant_id ||
    (req.headers['x-tenant-id'] as string);

  // Unauthenticated requests continue to follow existing authentication behavior (401)
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  // Internal service bypass
  if (user.isInternal) {
    return next();
  }

  const checkEntitlement = () => {
    if (req.entitlements?.dpdpCompliance) {
      return next();
    }

    return res.status(403).json({
      error: 'Enhanced DPDP compliance reporting is not enabled for your subscription plan. Please upgrade your plan to access commercial compliance features.',
      code: 'PLAN_FEATURE_DISABLED',
      feature: 'dpdp_compliance',
      plan: req.entitlements?.planId || 'free',
      currentPlan: req.entitlements?.planId || 'free',
    });
  };

  if (!req.entitlements && tenantId) {
    if (!(req as any).tenant) {
      (req as any).tenant = { id: tenantId };
    }
    loadEntitlements()(req, res, () => {
      checkEntitlement();
    });
  } else {
    checkEntitlement();
  }
}


