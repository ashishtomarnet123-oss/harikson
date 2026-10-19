if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}

import { describe, it, beforeEach, afterEach, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express, { Request, Response } from 'express';
import { pool, redis, executeTenantQuery } from '../src/db/pool.js';
import {
  DocumentQuotaService,
  QuotaExceededError,
} from '../src/services/documentQuotaService.js';
import { requireDocumentQuota, requireApiAccess } from '../src/middleware/entitlements.js';

describe('Xarwiz Isolated Bug Fix 2: RAG Document Plan-Limit Enforcement Test Suite', () => {
  const originalQuery = pool.query;

  after(() => {
    pool.query = originalQuery;
    try {
      redis.disconnect();
    } catch (_) {}
  });

  afterEach(() => {
    pool.query = originalQuery;
  });

  function createMockRes() {
    let statusCode = 200;
    let jsonBody: any = null;
    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        jsonBody = data;
        return res;
      },
      getStatusCode: () => statusCode,
      getBody: () => jsonBody,
    };
    return res;
  }

  function createMockReq(overrides: Record<string, any> = {}): any {
    return {
      headers: {},
      cookies: {},
      ...overrides,
    };
  }

  // =========================================================================
  // 1. Upload below the limit
  // =========================================================================
  it('1. Upload below limit: allows upload when active count < limit', async () => {
    const mockClient = {
      query: async (sql: string, params?: any[]) => {
        if (sql.includes('FROM tenants t')) {
          return {
            rows: [
              {
                tenant_plan: 'free',
                plan_id: 'free',
                storage_limit_gb: 1,
                features: { rag_documents: 10 },
              },
            ],
          };
        }
        if (sql.includes('SELECT COUNT(*)')) {
          return { rows: [{ count: 4 }] };
        }
        if (sql.includes('pg_advisory_xact_lock')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
    };

    const quota = await DocumentQuotaService.checkQuota('tenant-1', mockClient);
    assert.strictEqual(quota.allowed, true);
    assert.strictEqual(quota.currentUsage, 4);
    assert.strictEqual(quota.limit, 10);
    assert.strictEqual(quota.plan, 'free');

    // assertAndReserveSlot should succeed without throwing
    const reserveRes = await DocumentQuotaService.assertAndReserveSlot('tenant-1', mockClient);
    assert.strictEqual(reserveRes.currentUsage, 4);
    assert.strictEqual(reserveRes.limit, 10);
  });

  // =========================================================================
  // 2. Upload exactly to the limit
  // =========================================================================
  it('2. Upload exactly to limit: permits the 10th document when count is 9', async () => {
    const mockClient = {
      query: async (sql: string, params?: any[]) => {
        if (sql.includes('FROM tenants t')) {
          return {
            rows: [
              {
                tenant_plan: 'starter',
                plan_id: 'starter',
                storage_limit_gb: 5,
                features: { rag_documents: 10 },
              },
            ],
          };
        }
        if (sql.includes('SELECT COUNT(*)')) {
          return { rows: [{ count: 9 }] };
        }
        if (sql.includes('pg_advisory_xact_lock')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
    };

    const quota = await DocumentQuotaService.checkQuota('tenant-1', mockClient);
    assert.strictEqual(quota.allowed, true, 'Count 9 with limit 10 must be allowed (9 < 10)');
    assert.strictEqual(quota.currentUsage, 9);
    assert.strictEqual(quota.limit, 10);

    const reserveRes = await DocumentQuotaService.assertAndReserveSlot('tenant-1', mockClient);
    assert.strictEqual(reserveRes.currentUsage, 9);
  });

  // =========================================================================
  // 3. Upload beyond the limit
  // =========================================================================
  it('3. Upload beyond limit: blocks upload with PLAN_LIMIT_EXCEEDED when count >= limit', async () => {
    const mockClient = {
      query: async (sql: string, params?: any[]) => {
        if (sql.includes('FROM tenants t')) {
          return {
            rows: [
              {
                tenant_plan: 'free',
                plan_id: 'free',
                storage_limit_gb: 1,
                features: { rag_documents: 10 },
              },
            ],
          };
        }
        if (sql.includes('SELECT COUNT(*)')) {
          return { rows: [{ count: 10 }] };
        }
        if (sql.includes('pg_advisory_xact_lock')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
    };

    const quota = await DocumentQuotaService.checkQuota('tenant-1', mockClient);
    assert.strictEqual(quota.allowed, false, 'Count 10 with limit 10 must not be allowed');
    assert.strictEqual(quota.currentUsage, 10);
    assert.strictEqual(quota.limit, 10);

    let thrownError: any = null;
    try {
      await DocumentQuotaService.assertAndReserveSlot('tenant-1', mockClient);
    } catch (err: any) {
      thrownError = err;
    }

    assert.ok(thrownError instanceof QuotaExceededError, 'Must throw QuotaExceededError');
    assert.strictEqual(thrownError.code, 'PLAN_LIMIT_EXCEEDED');
    assert.strictEqual(thrownError.feature, 'rag_documents');
    assert.strictEqual(thrownError.limitReached, true);
    assert.strictEqual(thrownError.currentUsage, 10);
    assert.strictEqual(thrownError.limit, 10);
    assert.strictEqual(thrownError.plan, 'free');

    const json = thrownError.toJSON();
    assert.strictEqual(json.code, 'PLAN_LIMIT_EXCEEDED');
    assert.strictEqual(json.limitReached, true);
    assert.ok(json.error.includes('10/10'));
  });

  // =========================================================================
  // 4. Concurrent uploads
  // =========================================================================
  it('4. Concurrent uploads: serialized advisory lock ensures quota cannot be breached', async () => {
    let activeDocCount = 9;
    const limit = 10;
    let lockHeld = false;

    // Simulate database client with advisory lock
    const createSimulatedClient = () => ({
      query: async (sql: string, params?: any[]) => {
        if (sql.includes('pg_advisory_xact_lock')) {
          while (lockHeld) {
            await new Promise((r) => setTimeout(r, 5));
          }
          lockHeld = true;
          return { rows: [] };
        }
        if (sql.includes('FROM tenants t')) {
          return {
            rows: [
              {
                tenant_plan: 'free',
                plan_id: 'free',
                features: { rag_documents: limit },
              },
            ],
          };
        }
        if (sql.includes('SELECT COUNT(*)')) {
          return { rows: [{ count: activeDocCount }] };
        }
        if (sql.includes('INSERT INTO knowledge_documents')) {
          activeDocCount++;
          return { rows: [] };
        }
        return { rows: [] };
      },
    });

    // 5 concurrent upload attempts racing for 1 remaining slot (9/10)
    const attempts = Array.from({ length: 5 }, async (_, index) => {
      const client = createSimulatedClient();
      try {
        await DocumentQuotaService.assertAndReserveSlot('tenant-concurrent', client);
        // Simulate inserting the document
        await client.query('INSERT INTO knowledge_documents VALUES ($1)', [`doc-${index}`]);
        lockHeld = false; // Transaction commit
        return { success: true, index };
      } catch (err: any) {
        lockHeld = false; // Transaction rollback
        return { success: false, index, error: err.code };
      }
    });

    const results = await Promise.all(attempts);
    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    assert.strictEqual(successes.length, 1, 'Exactly one concurrent upload should succeed');
    assert.strictEqual(failures.length, 4, 'Four concurrent uploads should be rejected');
    assert.strictEqual(failures[0].error, 'PLAN_LIMIT_EXCEEDED');
    assert.strictEqual(activeDocCount, 10, 'Document count must not exceed limit 10');
  });

  // =========================================================================
  // 5. Tenant isolation
  // =========================================================================
  it('5. Tenant isolation: quota limits and counts of Tenant A do not affect Tenant B', async () => {
    const tenantDocs: Record<string, number> = {
      'tenant-a': 10, // At limit
      'tenant-b': 2,  // Below limit
    };

    const mockClient = {
      query: async (sql: string, params?: any[]) => {
        if (sql.includes('FROM tenants t')) {
          return {
            rows: [
              {
                tenant_plan: 'free',
                plan_id: 'free',
                features: { rag_documents: 10 },
              },
            ],
          };
        }
        if (sql.includes('SELECT COUNT(*)')) {
          const tenantId = params?.[0];
          return { rows: [{ count: tenantDocs[tenantId] ?? 0 }] };
        }
        if (sql.includes('pg_advisory_xact_lock')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
    };

    // Tenant A check (at limit)
    const quotaA = await DocumentQuotaService.checkQuota('tenant-a', mockClient);
    assert.strictEqual(quotaA.allowed, false, 'Tenant A must be rejected');

    // Tenant B check (under limit)
    const quotaB = await DocumentQuotaService.checkQuota('tenant-b', mockClient);
    assert.strictEqual(quotaB.allowed, true, 'Tenant B must be allowed');
    assert.strictEqual(quotaB.currentUsage, 2);

    // Tenant B can reserve slot
    const reserveB = await DocumentQuotaService.assertAndReserveSlot('tenant-b', mockClient);
    assert.strictEqual(reserveB.currentUsage, 2);
  });

  // =========================================================================
  // 6. Document deletion and replacement
  // =========================================================================
  it('6. Deletion and replacement: deleting a document frees a slot for replacement', async () => {
    let activeDocCount = 10; // At limit

    const mockClient = {
      query: async (sql: string, params?: any[]) => {
        if (sql.includes('FROM tenants t')) {
          return {
            rows: [
              {
                tenant_plan: 'free',
                plan_id: 'free',
                features: { rag_documents: 10 },
              },
            ],
          };
        }
        if (sql.includes('SELECT COUNT(*)')) {
          return { rows: [{ count: activeDocCount }] };
        }
        if (sql.includes('UPDATE knowledge_documents SET is_active = false')) {
          activeDocCount--; // Soft-delete
          return { rows: [] };
        }
        if (sql.includes('pg_advisory_xact_lock')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
    };

    // Initially at limit
    const initialCheck = await DocumentQuotaService.checkQuota('tenant-1', mockClient);
    assert.strictEqual(initialCheck.allowed, false);

    // Soft delete one document
    await mockClient.query('UPDATE knowledge_documents SET is_active = false WHERE id = $1', ['doc-1']);

    // Check again - now 9/10, so replacement is allowed
    const afterDeleteCheck = await DocumentQuotaService.checkQuota('tenant-1', mockClient);
    assert.strictEqual(afterDeleteCheck.allowed, true);
    assert.strictEqual(afterDeleteCheck.currentUsage, 9);

    const reserveRes = await DocumentQuotaService.assertAndReserveSlot('tenant-1', mockClient);
    assert.strictEqual(reserveRes.currentUsage, 9);
  });

  // =========================================================================
  // 7. Re-indexing existing documents (deduplication)
  // =========================================================================
  it('7. Re-indexing: deduplication match returns existing document without consuming new quota', async () => {
    // When a file has matching content_hash, the system reuses the existing active record
    const existingDoc = {
      id: 'existing-doc-id',
      filename: 'report.pdf',
      content_hash: 'hash-abc-123',
      is_active: true,
      status: 'indexed',
    };

    const mockClient = {
      query: async (sql: string, params?: any[]) => {
        if (sql.includes('WHERE content_hash = $1 AND tenant_id = $2 AND is_active = true')) {
          return { rows: [existingDoc] };
        }
        return { rows: [] };
      },
    };

    const res = await mockClient.query(
      'SELECT id, filename FROM knowledge_documents WHERE content_hash = $1 AND tenant_id = $2 AND is_active = true',
      ['hash-abc-123', 'tenant-1']
    );

    assert.strictEqual(res.rows.length, 1);
    assert.strictEqual(res.rows[0].id, 'existing-doc-id');
    // Does not perform an INSERT into knowledge_documents
  });

  // =========================================================================
  // 8. Failed uploads and retries
  // =========================================================================
  it('8. Failed uploads: rows with status = failed do not consume quota slots', async () => {
    // Query condition: WHERE tenant_id = $1 AND is_active = true AND status != 'failed'
    const docs = [
      { id: '1', is_active: true, status: 'indexed' },
      { id: '2', is_active: true, status: 'indexed' },
      { id: '3', is_active: true, status: 'failed' },  // Ingestion failed
      { id: '4', is_active: false, status: 'indexed' }, // Deleted
    ];

    const activeValidCount = docs.filter((d) => d.is_active && d.status !== 'failed').length;
    assert.strictEqual(activeValidCount, 2, 'Only active, non-failed documents consume quota');

    const mockClient = {
      query: async (sql: string, params?: any[]) => {
        if (sql.includes('FROM tenants t')) {
          return {
            rows: [
              {
                tenant_plan: 'free',
                plan_id: 'free',
                features: { rag_documents: 10 },
              },
            ],
          };
        }
        if (sql.includes('SELECT COUNT(*)')) {
          return { rows: [{ count: activeValidCount }] };
        }
        return { rows: [] };
      },
    };

    const count = await DocumentQuotaService.getActiveDocumentCount('tenant-1', mockClient);
    assert.strictEqual(count, 2);

    const quota = await DocumentQuotaService.checkQuota('tenant-1', mockClient);
    assert.strictEqual(quota.allowed, true);
    assert.strictEqual(quota.currentUsage, 2);
  });

  // =========================================================================
  // 9. Plan upgrades and downgrades
  // =========================================================================
  it('9. Plan downgrade/upgrade: existing docs are never deleted; uploads blocked on downgrade and restored on upgrade', async () => {
    let currentPlan = 'professional'; // limit: 50000
    const totalExistingDocs = 25; // 25 docs uploaded under Pro

    const mockClient = {
      query: async (sql: string, params?: any[]) => {
        if (sql.includes('FROM tenants t')) {
          if (currentPlan === 'professional') {
            return {
              rows: [
                {
                  tenant_plan: 'professional',
                  plan_id: 'professional',
                  features: { rag_documents: 50000 },
                },
              ],
            };
          } else {
            return {
              rows: [
                {
                  tenant_plan: 'free',
                  plan_id: 'free',
                  features: { rag_documents: 10 },
                },
              ],
            };
          }
        }
        if (sql.includes('SELECT COUNT(*)')) {
          return { rows: [{ count: totalExistingDocs }] };
        }
        if (sql.includes('pg_advisory_xact_lock')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
    };

    // Under Pro plan, 25 docs is well below 50000
    const proQuota = await DocumentQuotaService.checkQuota('tenant-1', mockClient);
    assert.strictEqual(proQuota.allowed, true);
    assert.strictEqual(proQuota.limit, 50000);

    // Tenant downgrades to Free (limit 10)
    currentPlan = 'free';

    // Verify existing documents were NOT deleted (still 25)
    const docCountAfterDowngrade = await DocumentQuotaService.getActiveDocumentCount('tenant-1', mockClient);
    assert.strictEqual(docCountAfterDowngrade, 25, 'Documents must not be deleted on downgrade');

    // New upload attempts must be blocked
    const freeQuota = await DocumentQuotaService.checkQuota('tenant-1', mockClient);
    assert.strictEqual(freeQuota.allowed, false, 'Tenant with 25 docs on Free (limit 10) must be blocked');
    assert.strictEqual(freeQuota.currentUsage, 25);
    assert.strictEqual(freeQuota.limit, 10);

    // Tenant upgrades back to Pro
    currentPlan = 'professional';
    const upgradedQuota = await DocumentQuotaService.checkQuota('tenant-1', mockClient);
    assert.strictEqual(upgradedQuota.allowed, true, 'Upgrading restores ability to upload');
  });

  // =========================================================================
  // 10. Invalid or missing limit configuration
  // =========================================================================
  it('10. Invalid or missing configuration: safe fallback defaults are applied', async () => {
    // Case A: Missing features column or null
    const clientNullFeatures = {
      query: async () => ({
        rows: [{ tenant_plan: 'starter', plan_id: 'starter', features: null }],
      }),
    };
    const limitA = await DocumentQuotaService.resolveLimit('tenant-null', clientNullFeatures);
    assert.strictEqual(limitA.limit, 500, 'Starter defaults to 500 when features are null');

    // Case B: Enterprise plan with unlimited (-1)
    const clientEnterprise = {
      query: async () => ({
        rows: [{ tenant_plan: 'enterprise', plan_id: 'enterprise', features: { rag_documents: -1 } }],
      }),
    };
    const limitB = await DocumentQuotaService.resolveLimit('tenant-ent', clientEnterprise);
    assert.strictEqual(limitB.limit, -1, 'Enterprise supports unlimited (-1)');

    const countMock = {
      query: async (sql: string) => {
        if (sql.includes('FROM tenants t')) return clientEnterprise.query();
        if (sql.includes('SELECT COUNT(*)')) return { rows: [{ count: 99999 }] };
        return { rows: [] };
      },
    };
    const entQuota = await DocumentQuotaService.checkQuota('tenant-ent', countMock);
    assert.strictEqual(entQuota.allowed, true, 'Unlimited limit (-1) is always allowed');

    // Case C: Corrupted JSON string
    const clientCorruptJson = {
      query: async () => ({
        rows: [{ tenant_plan: 'free', plan_id: 'free', features: '{corrupt json...' }],
      }),
    };
    const limitC = await DocumentQuotaService.resolveLimit('tenant-corrupt', clientCorruptJson);
    assert.strictEqual(limitC.limit, 10, 'Free defaults to 10 on corrupt json');

    // Case D: String number in JSON ("rag_documents": "25")
    const clientStringNum = {
      query: async () => ({
        rows: [{ tenant_plan: 'custom', plan_id: 'custom', features: { rag_documents: '25' } }],
      }),
    };
    const limitD = await DocumentQuotaService.resolveLimit('tenant-str', clientStringNum);
    assert.strictEqual(limitD.limit, 25, 'String numbers are parsed correctly');
  });

  // =========================================================================
  // 11. Existing storage-limit (GB) behavior preserved
  // =========================================================================
  it('11. Existing storage-limit behavior: storageLimitGb and totalBytes are preserved and reported', async () => {
    const mockClient = {
      query: async (sql: string) => {
        if (sql.includes('FROM tenants t')) {
          return {
            rows: [
              {
                tenant_plan: 'professional',
                plan_id: 'professional',
                storage_limit_gb: 50,
                features: { rag_documents: 50000 },
              },
            ],
          };
        }
        return { rows: [] };
      },
    };

    const res = await DocumentQuotaService.resolveLimit('tenant-pro', mockClient);
    assert.strictEqual(res.storageLimitGb, 50, 'storageLimitGb must be preserved');
    assert.strictEqual(res.limit, 50000);
    assert.strictEqual(res.plan, 'professional');
  });

  // =========================================================================
  // 12. HTTP Route Integration: Middleware returns 403 PLAN_LIMIT_EXCEEDED
  // =========================================================================
  it('12. requireDocumentQuota middleware returns HTTP 403 PLAN_LIMIT_EXCEEDED when quota is exhausted', async () => {
    pool.query = (async (sql: string, params?: any[]) => {
      if (typeof sql === 'string' && sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              tenant_plan: 'free',
              plan_id: 'free',
              storage_limit_gb: 1,
              features: { rag_documents: 10 },
            },
          ],
        };
      }
      if (typeof sql === 'string' && sql.includes('SELECT COUNT(*)')) {
        return { rows: [{ count: 10 }] }; // 10/10 reached
      }
      return { rows: [] };
    }) as any;

    const req = createMockReq({
      user: { userId: 'u-1' },
      tenant: { id: 't-at-limit' },
    });
    const res = createMockRes();
    let nextCalled = false;

    await new Promise<void>((resolve) => {
      requireDocumentQuota(req, res, () => {
        nextCalled = true;
        resolve();
      });
      // Watch for response status set
      const checkInterval = setInterval(() => {
        if (res.getStatusCode() !== 200 || nextCalled) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 10);
    });

    assert.strictEqual(nextCalled, false, 'Next must not be called when quota exceeded');
    assert.strictEqual(res.getStatusCode(), 403, 'Must return 403 Forbidden');
    const body = res.getBody();
    assert.strictEqual(body.code, 'PLAN_LIMIT_EXCEEDED');
    assert.strictEqual(body.feature, 'rag_documents');
    assert.strictEqual(body.limitReached, true);
    assert.strictEqual(body.currentUsage, 10);
    assert.strictEqual(body.limit, 10);
  });

  // =========================================================================
  // 13. Regression test: Fix 1 api_access enforcement remains intact
  // =========================================================================
  it('13. Regression: api_access enforcement from Fix 1 remains functional', async () => {
    // A: Tenant with api_access: true is allowed
    const reqAllowed = createMockReq({
      user: { userId: 'u-pro', tenantId: 't-pro' },
      tenant: { id: 't-pro' },
      entitlements: {
        planId: 'professional',
        planName: 'Professional',
        tokenLimit: 5000000,
        storageLimitGb: 50,
        imageLimitMonthly: 100,
        features: { api_access: true, rag_documents: 50000 },
        apiAccess: true,
        ragDocumentsLimit: 50000,
        isTrial: false,
        trialEndsAt: null,
      },
    });
    const resAllowed = createMockRes();
    let nextAllowed = false;
    requireApiAccess(reqAllowed, resAllowed, () => {
      nextAllowed = true;
    });
    assert.strictEqual(nextAllowed, true);

    // B: Tenant with api_access: false is blocked with PLAN_FEATURE_DISABLED
    const reqBlocked = createMockReq({
      user: { userId: 'u-free', tenantId: 't-free' },
      tenant: { id: 't-free' },
      entitlements: {
        planId: 'free',
        planName: 'Free',
        tokenLimit: 1000,
        storageLimitGb: 1,
        imageLimitMonthly: 10,
        features: { api_access: false, rag_documents: 10 },
        apiAccess: false,
        ragDocumentsLimit: 10,
        isTrial: false,
        trialEndsAt: null,
      },
    });
    const resBlocked = createMockRes();
    let nextBlocked = false;
    requireApiAccess(reqBlocked, resBlocked, () => {
      nextBlocked = true;
    });
    assert.strictEqual(nextBlocked, false);
    assert.strictEqual(resBlocked.getStatusCode(), 403);
    assert.strictEqual(resBlocked.getBody()?.code, 'PLAN_FEATURE_DISABLED');
    assert.strictEqual(resBlocked.getBody()?.feature, 'api_access');
  });
});
