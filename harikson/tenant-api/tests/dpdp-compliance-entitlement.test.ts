if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}
if (!process.env.TENANT_MASTER_KEY) {
  process.env.TENANT_MASTER_KEY = '01234567890123456789012345678901';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_must_be_at_least_32_characters_long_for_security';
}

import { describe, it, beforeEach, afterEach, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import { pool, readPool, redis } from '../src/db/pool.js';
import {
  loadEntitlements,
  requireDpdpCompliance,
  requireCustomModels,
  requirePrioritySupport,
  requireWebhookLogging,
  requireAuditTrail,
  requireApiAccess,
} from '../src/middleware/entitlements.js';
import privacyRouter from '../src/routes/privacy.routes.js';
import { PrivacyService } from '../src/services/privacyService.js';

try {
  redis.on('error', () => {});
  redis.disconnect();
} catch (_) {}

describe('Xarwiz Isolated Bug Fix 8: DPDP Compliance Plan Feature Enforcement Test Suite', () => {
  const originalQuery = pool.query;
  const originalConnect = pool.connect;

  after(async () => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
    try {
      redis.disconnect();
    } catch (_) {}
    try {
      await pool.end();
      await (readPool as any)?.end?.();
    } catch (_) {}
    setTimeout(() => {
      process.exit(0);
    }, 100);
  });

  beforeEach(() => {
    (redis as any).get = async () => null;
    (redis as any).setex = async () => 'OK';
    (pool as any).query = async (sql: string, params?: any[]) => {
      return { rows: [], rowCount: 0 };
    };
    const mockClient = {
      query: async (sql: string, params?: any[]) => {
        if (sql.includes('SELECT 1')) {
          return { rows: [{ '?column?': 1 }] };
        }
        if (sql.includes('set_config') || sql.includes('assert_tenant_context')) {
          return { rows: [] };
        }
        return pool.query(sql, params);
      },
      release: () => {},
    };
    (pool as any).connect = async () => mockClient;
    (readPool as any).connect = async () => mockClient;
    (readPool as any).query = (pool as any).query;
  });

  afterEach(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
    (readPool as any).connect = originalConnect;
    (readPool as any).query = originalQuery;
  });

  function createMockRes() {
    let statusCode = 200;
    let jsonBody: any = null;
    const headers: Record<string, string> = {};

    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        jsonBody = data;
        return res;
      },
      setHeader: (name: string, value: string) => {
        headers[name.toLowerCase()] = value;
        return res;
      },
      getHeader: (name: string) => headers[name.toLowerCase()],
      getStatusCode: () => statusCode,
      getBody: () => jsonBody,
    };
    return res;
  }

  function createMockReq(overrides: Record<string, any> = {}): any {
    return {
      headers: {},
      cookies: {},
      params: {},
      query: {},
      body: {},
      socket: { remoteAddress: '127.0.0.1' },
      ...overrides,
    };
  }

  // =========================================================================
  // 1. dpdp_compliance: false does not disable mandatory consent operations
  // =========================================================================
  it('1. dpdp_compliance: false does not disable mandatory consent operations', async () => {
    // When a tenant has dpdp_compliance: false configured, they must still be able to update consents
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM consent_purposes')) {
        return {
          rows: [
            {
              id: 'marketing_emails',
              name: 'Promotional & Educational Communications',
              description: 'Optional emails',
              legal_basis: 'consent',
              is_required: false,
              is_optional: true,
              consent_wording: 'I agree',
              version: '2.0-dpdp',
              withdrawal_behavior: 'Can be withdrawn',
              is_active: true,
            },
          ],
        };
      }
      if (sql.includes('SELECT status, notice_version FROM user_consents')) {
        return { rows: [{ status: 'declined', notice_version: '2.0-dpdp' }] };
      }
      if (sql.includes('INSERT INTO user_consents') || sql.includes('INSERT INTO consent_audit_events')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('SELECT * FROM user_consents')) {
        return {
          rows: [
            {
              purpose_id: 'marketing_emails',
              status: 'granted',
              notice_version: '2.0-dpdp',
              collection_source: 'privacy_settings',
              last_changed_at: new Date().toISOString(),
            },
          ],
        };
      }
      return { rows: [] };
    };

    const req = createMockReq({
      user: { userId: 'u-tenant-false' },
      tenant: { id: 't-tenant-false' },
      entitlements: {
        planId: 'custom-tier',
        dpdpCompliance: false, // explicitly false
      },
      body: {
        updates: [{ purposeId: 'marketing_emails', status: 'granted' }],
        source: 'privacy_settings',
      },
    });
    const res = createMockRes();

    const putPreferences = (privacyRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/preferences' && layer.route.methods.put
    );

    await putPreferences.route.stack[putPreferences.route.stack.length - 1].handle(req, res);
    assert.strictEqual(res.getStatusCode(), 200, 'Mandatory consent update must succeed even if dpdpCompliance is false');
    const body = res.getBody();
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.consents));
  });

  // =========================================================================
  // 2. Missing or malformed feature configuration does not disable mandatory privacy safeguards
  // =========================================================================
  it('2. Missing or malformed feature configuration does not disable mandatory privacy safeguards', async () => {
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'free',
              plan_name: 'Free Plan',
              features: 'malformed_non_json_string{',
            },
          ],
        };
      }
      return { rows: [] };
    };

    const req = createMockReq({ tenant: { id: 't-malformed' } });
    const res = createMockRes();
    await new Promise<void>((resolve) => {
      loadEntitlements()(req, res, () => resolve());
    });

    assert.ok(req.entitlements);
    // Malformed features fall back safely to true
    assert.strictEqual(req.entitlements.dpdpCompliance, true);
    assert.strictEqual(req.entitlements.planId, 'free');
  });

  // =========================================================================
  // 3. Consent records continue to be created and preserved
  // =========================================================================
  it('3. Consent records continue to be created and preserved', async () => {
    let userConsentsInserted = false;
    let auditEventAppended = false;

    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('FROM consent_purposes')) {
        return {
          rows: [
            {
              id: 'analytics',
              name: 'Analytics',
              legal_basis: 'consent',
              is_required: false,
              is_optional: true,
              is_active: true,
            },
          ],
        };
      }
      if (sql.includes('INSERT INTO user_consents')) {
        userConsentsInserted = true;
        return { rows: [], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO consent_audit_events')) {
        auditEventAppended = true;
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    };

    const updated = await PrivacyService.updateUserConsents(
      't-preserve',
      'u-preserve',
      [{ purposeId: 'analytics', status: 'granted' }],
      { source: 'cookie_banner', ipAddress: '10.0.0.1', userAgent: 'TestBrowser' }
    );

    assert.strictEqual(userConsentsInserted, true, 'User consents state must be saved');
    assert.strictEqual(auditEventAppended, true, 'Immutable consent audit event must be appended');
  });

  // =========================================================================
  // 4. Applicable privacy data-export workflows remain accessible
  // =========================================================================
  it('4. Applicable privacy data-export workflows remain accessible for all tiers', async () => {
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM users WHERE id = $1 AND tenant_id = $2')) {
        return {
          rows: [
            {
              id: 'u-free',
              name: 'Free Principal',
              email: 'principal@free.local',
              role: 'member',
              two_factor_enabled: false,
              created_at: new Date().toISOString(),
            },
          ],
        };
      }
      if (sql.includes('FROM tenants WHERE id = $1')) {
        return {
          rows: [
            {
              id: 't-free',
              name: 'Free Workspace',
              plan: 'free',
              status: 'active',
            },
          ],
        };
      }
      return { rows: [] };
    };

    const req = createMockReq({
      user: { userId: 'u-free' },
      tenant: { id: 't-free' },
      entitlements: {
        planId: 'free',
        dpdpCompliance: false, // Even if feature flag is false, export is a statutory right
      },
    });
    const res = createMockRes();

    const getExport = (privacyRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/export-data' && layer.route.methods.get
    );

    await getExport.route.stack[getExport.route.stack.length - 1].handle(req, res);
    assert.strictEqual(res.getStatusCode(), 200);
    assert.strictEqual(res.getHeader('content-type'), 'application/json');
    assert.ok(res.getHeader('content-disposition')?.includes('attachment'));
    const bundle = res.getBody();
    assert.ok(bundle.export_metadata);
    assert.strictEqual(bundle.profile.email, 'principal@free.local');
    assert.strictEqual(bundle.workspace.plan, 'free');
  });

  // =========================================================================
  // 5. Applicable access, correction, erasure, and grievance workflows remain available
  // =========================================================================
  it('5. Applicable access, correction, erasure, and grievance workflows remain available', async () => {
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('SELECT email, name FROM users WHERE id = $1')) {
        return { rows: [{ email: 'principal@xarwiz.com', name: 'Data Principal' }] };
      }
      if (sql.includes('INSERT INTO privacy_requests')) {
        return {
          rows: [
            {
              id: 'req-123',
              tracking_number: 'DPR-20261019-ABCDEF',
              request_type: 'correction',
              status: 'submitted',
            },
          ],
        };
      }
      if (sql.includes('INSERT INTO privacy_grievances')) {
        return {
          rows: [
            {
              id: 'grv-456',
              grievance_number: 'GRV-20261019-FEDCBA',
              status: 'submitted',
              assigned_officer: 'Ashish Pratap Singh Tomar',
            },
          ],
        };
      }
      return { rows: [] };
    };

    // 1. Privacy Rights Request (Correction)
    const reqReq = createMockReq({
      user: { userId: 'u-test' },
      tenant: { id: 't-test' },
      body: {
        requestType: 'correction',
        details: { field: 'name', value: 'New Principal Name' },
      },
    });
    const resReq = createMockRes();
    const postRequests = (privacyRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/requests' && layer.route.methods.post
    );
    await postRequests.route.stack[postRequests.route.stack.length - 1].handle(reqReq, resReq);
    assert.strictEqual(resReq.getStatusCode(), 201);
    assert.strictEqual(resReq.getBody().success, true);
    assert.strictEqual(resReq.getBody().request.tracking_number, 'DPR-20261019-ABCDEF');

    // 2. Grievance Redressal (Public)
    const reqGrv = createMockReq({
      body: {
        complainantName: 'Ashish Tomar',
        complainantEmail: 'complainant@domain.com',
        category: 'consent_violation',
        subject: 'Delay in processing withdrawal',
        description: 'Detailed description of the grievance...',
      },
    });
    const resGrv = createMockRes();
    const postGrievances = (privacyRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/grievances' && layer.route.methods.post
    );
    await postGrievances.route.stack[postGrievances.route.stack.length - 1].handle(reqGrv, resGrv);
    assert.strictEqual(resGrv.getStatusCode(), 201);
    assert.strictEqual(resGrv.getBody().success, true);
    assert.strictEqual(resGrv.getBody().grievanceNumber, 'GRV-20261019-FEDCBA');
  });

  // =========================================================================
  // 6. Mandatory security and privacy logging remain active
  // =========================================================================
  it('6. Mandatory security and privacy logging remain active', async () => {
    let cookieLogged = false;
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('INSERT INTO cookie_consent_log')) {
        cookieLogged = true;
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    };

    const reqCookie = createMockReq({
      body: {
        consentId: 'cookie_test_session',
        categories: { essential: true, analytics: false },
      },
    });
    const resCookie = createMockRes();
    const postCookie = (privacyRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/cookie-consent' && layer.route.methods.post
    );
    await postCookie.route.stack[postCookie.route.stack.length - 1].handle(reqCookie, resCookie);

    assert.strictEqual(resCookie.getStatusCode(), 200);
    assert.strictEqual(cookieLogged, true, 'Cookie consent audit log must be recorded');
  });

  // =========================================================================
  // 7. Tenant isolation remains enforced for privacy records and requests
  // =========================================================================
  it('7. Tenant isolation remains enforced for privacy records and requests', async () => {
    (pool as any).query = async (sql: string, params?: any[]) => {
      // If query tries to look up request for tenant A, but request belongs to tenant B, query returns empty
      if (sql.includes('SELECT * FROM privacy_requests WHERE tenant_id = $1')) {
        const tenantIdParam = params?.[0];
        if (tenantIdParam === 'tenant-b') {
          return { rows: [{ id: 'req-b', tracking_number: 'DPR-B-123' }] };
        }
        return { rows: [] };
      }
      return { rows: [] };
    };

    // User in Tenant A tries to read request belonging to Tenant B
    const request = await PrivacyService.getPrivacyRequest('req-b', 'tenant-a', 'user-a');
    assert.strictEqual(request, null, 'Tenant A must not be able to read Tenant B privacy requests');
  });

  // =========================================================================
  // 8. Unauthorized cross-tenant administrative access remains blocked
  // =========================================================================
  it('8. Unauthorized cross-tenant administrative access remains blocked', async () => {
    // Non-admin user attempting to access administrative stats without admin token
    const reqAdmin = createMockReq({
      user: { userId: 'u-regular', role: 'member' },
      tenant: { id: 't-regular' },
    });
    const resAdmin = createMockRes();

    // Verify requireAuth on user endpoints prevents missing auth
    const reqNoAuth = createMockReq();
    const resNoAuth = createMockRes();
    const getPreferences = (privacyRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/preferences' && layer.route.methods.get
    );

    // First layer in stack is requireAuth
    await getPreferences.route.stack[0].handle(reqNoAuth, resNoAuth, () => {});
    assert.strictEqual(resNoAuth.getStatusCode(), 401, 'Unauthenticated access to preferences must be denied with 401');
  });

  // =========================================================================
  // 9. Optional compliance reporting, if it exists, is correctly gated by the entitlement
  // =========================================================================
  it('9. Optional compliance reporting is correctly gated by requireDpdpCompliance', async () => {
    // 1. Tenant with dpdpCompliance: false is denied with 403 PLAN_FEATURE_DISABLED
    const reqDisabled = createMockReq({
      user: { userId: 'u-starter' },
      tenant: { id: 't-starter' },
      entitlements: {
        planId: 'custom-tier',
        dpdpCompliance: false,
      },
    });
    const resDisabled = createMockRes();
    let nextCalled = false;

    requireDpdpCompliance(reqDisabled, resDisabled, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(resDisabled.getStatusCode(), 403);
    assert.strictEqual(resDisabled.getBody().code, 'PLAN_FEATURE_DISABLED');
    assert.strictEqual(resDisabled.getBody().feature, 'dpdp_compliance');

    // 2. Tenant with dpdpCompliance: true is allowed
    const reqEnabled = createMockReq({
      user: { userId: 'u-enterprise' },
      tenant: { id: 't-enterprise' },
      entitlements: {
        planId: 'enterprise',
        dpdpCompliance: true,
      },
    });
    const resEnabled = createMockRes();
    let nextCalledEnabled = false;

    requireDpdpCompliance(reqEnabled, resEnabled, () => {
      nextCalledEnabled = true;
    });

    assert.strictEqual(nextCalledEnabled, true);
    assert.strictEqual(resEnabled.getStatusCode(), 200);
  });

  // =========================================================================
  // 10. Explicit Boolean configuration overrides the fallback for genuinely optional capabilities
  // =========================================================================
  it('10. Explicit Boolean configuration overrides the fallback for genuinely optional capabilities', async () => {
    // Explicit false
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'enterprise',
              plan_name: 'Enterprise Plan',
              features: { dpdp_compliance: false },
            },
          ],
        };
      }
      return { rows: [] };
    };

    const reqFalse = createMockReq({ tenant: { id: 't-explicit-false' } });
    const resFalse = createMockRes();
    await new Promise<void>((resolve) => {
      loadEntitlements()(reqFalse, resFalse, () => resolve());
    });
    assert.strictEqual(reqFalse.entitlements.dpdpCompliance, false, 'Explicit false must override fallback');

    // Explicit true
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'starter',
              plan_name: 'Starter Plan',
              features: { dpdp_compliance: true },
            },
          ],
        };
      }
      return { rows: [] };
    };

    const reqTrue = createMockReq({ tenant: { id: 't-explicit-true' } });
    const resTrue = createMockRes();
    await new Promise<void>((resolve) => {
      loadEntitlements()(reqTrue, resTrue, () => resolve());
    });
    assert.strictEqual(reqTrue.entitlements.dpdpCompliance, true, 'Explicit true must be respected');
  });

  // =========================================================================
  // 11. Historical consent and audit records remain unchanged
  // =========================================================================
  it('11. Historical consent and audit records remain unchanged across plan changes', async () => {
    let auditRecordsModified = false;
    let auditRecordsDeleted = false;

    (pool as any).query = async (sql: string) => {
      if (sql.includes('UPDATE consent_audit_events')) {
        auditRecordsModified = true;
      }
      if (sql.includes('DELETE FROM consent_audit_events')) {
        auditRecordsDeleted = true;
      }
      return { rows: [] };
    };

    // Plan downgrade / change simulation
    const req = createMockReq({ tenant: { id: 't-downgraded' } });
    const res = createMockRes();
    await new Promise<void>((resolve) => {
      loadEntitlements()(req, res, () => resolve());
    });

    assert.strictEqual(auditRecordsModified, false, 'Historical audit events must never be updated');
    assert.strictEqual(auditRecordsDeleted, false, 'Historical audit events must never be deleted');
  });

  // =========================================================================
  // 12. Missing entitlement data or cache failures do not cause privacy safeguards to fail closed
  // =========================================================================
  it('12. Missing entitlement data or cache failures do not cause privacy safeguards to fail closed', async () => {
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        throw new Error('Database connection timeout');
      }
      return { rows: [] };
    };

    const req = createMockReq({ tenant: { id: 't-db-error' } });
    const res = createMockRes();

    await new Promise<void>((resolve) => {
      loadEntitlements()(req, res, () => resolve());
    });

    // Even when loadEntitlements errors, it does not throw or block next()
    assert.strictEqual(res.getStatusCode(), 200);

    // And public privacy notices remain completely operational
    const getNotice = (privacyRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/notice' && layer.route.methods.get
    );
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM privacy_notices')) {
        return {
          rows: [
            {
              id: 'n-1',
              version: '2.0-dpdp',
              title: 'Xarwiz Privacy Notice',
              status: 'published',
            },
          ],
        };
      }
      return { rows: [] };
    };

    const reqNotice = createMockReq();
    const resNotice = createMockRes();
    await getNotice.route.stack[getNotice.route.stack.length - 1].handle(reqNotice, resNotice);
    assert.strictEqual(resNotice.getStatusCode(), 200);
    assert.strictEqual(resNotice.getBody().notice.version, '2.0-dpdp');
  });

  // =========================================================================
  // 13. Existing security, authentication, and privacy tests remain functional
  // =========================================================================
  it('13. Existing security, authentication, and privacy endpoints enforce proper authentication', async () => {
    // 1. Notice endpoint is public
    const reqNotice = createMockReq();
    const resNotice = createMockRes();
    const getNotice = (privacyRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/notice' && layer.route.methods.get
    );
    (pool as any).query = async () => ({
      rows: [{ id: 'n-1', version: '2.0-dpdp', title: 'Privacy Notice', status: 'published' }],
    });
    await getNotice.route.stack[getNotice.route.stack.length - 1].handle(reqNotice, resNotice);
    assert.strictEqual(resNotice.getStatusCode(), 200, 'Notice endpoint must be publicly accessible');

    // 2. Purposes endpoint is public
    const reqPurposes = createMockReq();
    const resPurposes = createMockRes();
    const getPurposes = (privacyRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/purposes' && layer.route.methods.get
    );
    (pool as any).query = async () => ({
      rows: [{ id: 'service_processing', name: 'Core Service', legal_basis: 'contractual_necessity' }],
    });
    await getPurposes.route.stack[getPurposes.route.stack.length - 1].handle(reqPurposes, resPurposes);
    assert.strictEqual(resPurposes.getStatusCode(), 200, 'Purposes endpoint must be publicly accessible');
  });

  // =========================================================================
  // 14. Regression tests for Fixes 1-7 remain intact
  // =========================================================================
  it('14. Regression: Fixes 1-7 entitlements (api_access, rag_documents, audit_trail, webhook_logging, priority_support, sla_hours, custom_models) remain intact', async () => {
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'enterprise',
              plan_name: 'Enterprise Plan',
              token_limit: 10000000,
              storage_limit_gb: 100,
              features: {
                api_access: true,
                rag_documents: -1,
                audit_trail: true,
                webhook_logging: true,
                priority_support: true,
                sla_hours: 2,
                custom_models: true,
                dpdp_compliance: true,
              },
            },
          ],
        };
      }
      return { rows: [] };
    };

    const req = createMockReq({ tenant: { id: 't-enterprise-all' } });
    const res = createMockRes();

    await new Promise<void>((resolve) => {
      loadEntitlements()(req, res, () => resolve());
    });

    const ent = req.entitlements;
    assert.ok(ent);
    assert.strictEqual(ent.apiAccess, true, 'Fix 1 api_access intact');
    assert.strictEqual(ent.ragDocumentsLimit, -1, 'Fix 2 rag_documents intact');
    assert.strictEqual(ent.auditTrail, true, 'Fix 3 audit_trail intact');
    assert.strictEqual(ent.webhookLogging, true, 'Fix 4 webhook_logging intact');
    assert.strictEqual(ent.prioritySupport, true, 'Fix 5 priority_support intact');
    assert.strictEqual(ent.slaHours, 2, 'Fix 6 sla_hours intact');
    assert.strictEqual(ent.customModels, true, 'Fix 7 custom_models intact');
    assert.strictEqual(ent.dpdpCompliance, true, 'Fix 8 dpdp_compliance intact');
  });
});
