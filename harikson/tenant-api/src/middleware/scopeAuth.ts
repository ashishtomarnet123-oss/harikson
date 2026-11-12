import { Request, Response, NextFunction } from 'express';
import { Logger } from '../observability/logger.js';

export const VALID_SCOPES = [
  'chat:read',
  'chat:write',
  'documents:read',
  'documents:write',
  'workflows:read',
  'workflows:write',
  'agents:read',
  'agents:write',
  'images:read',
  'images:write',
  'notifications:read',
  'notifications:write',
  'user:read',
  'user:write',
  'billing:read',
  'admin:*',
] as const;

export type Scope = typeof VALID_SCOPES[number] | (string & {});

/**
 * Express middleware factory to enforce scope-based authorization for API keys.
 * Standard user JWT sessions automatically possess full user privileges within their tenant.
 * API keys MUST possess at least one matching scope, a domain wildcard (e.g. 'workflows:*'),
 * or a global administrative wildcard ('admin:*' / '*').
 */
export function requireScopes(...requiredScopes: Scope[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    // Fail-closed: unauthenticated callers cannot bypass scope checks
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized: Authentication required',
        code: 'UNAUTHENTICATED',
      });

    }

    // Standard session JWT logins have full user authorization
    if (!user.isDeveloperKey) {
      return next();
    }

    const keyScopes: string[] = Array.isArray(user.scopes)
      ? user.scopes
      : ['chat:read', 'chat:write', 'documents:read', 'documents:write'];

    // Check if key has global wildcard ('admin:*' or '*')
    const hasGlobalWildcard = keyScopes.includes('*') || keyScopes.includes('admin:*');

    // Check if key has matching exact scope, domain wildcard (e.g. 'chat:*' matches 'chat:read'),
    // or established compatibility aliases (e.g. 'chat:read' granting 'agents:read')
    const hasRequiredScope = requiredScopes.some((reqScope) => {
      if (keyScopes.includes(reqScope)) return true;
      const domain = reqScope.split(':')[0];
      if (domain && keyScopes.includes(`${domain}:*`)) return true;

      // Compatibility aliases
      if (reqScope === 'agents:read' && (keyScopes.includes('chat:read') || keyScopes.includes('chat:*'))) return true;
      if (reqScope === 'agents:write' && (keyScopes.includes('chat:write') || keyScopes.includes('chat:*'))) return true;
      if (reqScope === 'images:read' && (keyScopes.includes('chat:read') || keyScopes.includes('chat:*'))) return true;
      if (reqScope === 'images:write' && (keyScopes.includes('chat:write') || keyScopes.includes('chat:*'))) return true;
      if (reqScope === 'notifications:read' && (keyScopes.includes('user:read') || keyScopes.includes('user:*'))) return true;
      if (reqScope === 'notifications:write' && (keyScopes.includes('user:write') || keyScopes.includes('user:*'))) return true;

      return false;
    });

    if (!hasGlobalWildcard && !hasRequiredScope) {
      Logger.warn(
        `🚨 [SCOPE SECURITY ALERT] API Key ${user.apiKeyId || 'unknown'} attempted unauthorized operation [${req.method} ${req.originalUrl || req.url}] requiring scopes: [${requiredScopes.join(', ')}]. Key Scopes: [${keyScopes.join(', ')}]`
      );

      return res.status(403).json({
        error: 'Forbidden: Insufficient API key scopes',
        code: 'INSUFFICIENT_SCOPES',
        requiredScopes,
        grantedScopes: keyScopes,
        message: `This API key requires one of the following scopes: ${requiredScopes.join(', ')}`,
      });
    }

    // Log authorized scope usage
    Logger.info(
      `[SCOPE TRACKING] API Key ${user.apiKeyId} authorized for [${req.method} ${req.path}] with scopes: [${keyScopes.join(', ')}]`
    );

    return next();
  };
}
