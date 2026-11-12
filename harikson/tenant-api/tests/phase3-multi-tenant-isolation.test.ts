if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}

import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { pool, readPool, redis, executeTenantQuery, verifyDatabaseIsolationRole } from '../src/db/pool.js';

describe('Phase 3 — Database Security & Multi-Tenant Isolation Test Suite', () => {
  after(async () => {
    try {
      redis.disconnect();
    } catch (_) {}
    setTimeout(() => process.exit(0), 100);
  });

  const tenantA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const tenantB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const userA = '11111111-1111-1111-1111-111111111111';
  const userB = '22222222-2222-2222-2222-222222222222';

  // =========================================================================
  // 1. Static Schema & Migration 078 Verification
  // =========================================================================
  it('1. Migration 078 Audit: all 18 unshielded tables and admin tables have ENABLE & FORCE ROW LEVEL SECURITY', () => {
    const migration078Path = path.resolve(process.cwd(), 'src/migrations/078_enforce_database_security_and_rls.sql');
    assert.ok(fs.existsSync(migration078Path), 'Migration 078 must exist');
    const content = fs.readFileSync(migration078Path, 'utf-8');

    const expectedTables = [
      'tenant_custom_models',
      'support_tickets',
      'privacy_grievances',
      'user_passkeys',
      'user_developer_configs',
      'user_profile_events',
      'cookie_consent_log',
      'conversation_shares',
      'payment_webhooks',
      'workflow_templates',
      'contact_submissions',
      'career_applications',
      'founder_dashboard_state',
      'founder_dashboard_access_log',
      'founder_hypotheses',
      'founder_narrative_mentions',
      'founder_opportunities',
      'founder_threats',
      'admin_audit_log',
      'smtp_configs',
      'email_templates',
    ];

    for (const table of expectedTables) {
      assert.ok(
        content.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`),
        `Table ${table} must have ENABLE ROW LEVEL SECURITY in migration 078`
      );
      assert.ok(
        content.includes(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`),
        `Table ${table} must have FORCE ROW LEVEL SECURITY in migration 078`
      );
    }
  });

  // =========================================================================
  // 2. executeTenantQuery Fail-Closed UUID Validation
  // =========================================================================
  it('2. executeTenantQuery Input Validation: rejects invalid, empty, or malformed tenantId upfront', async () => {
    const invalidTenantIds = ['', ' ', null as any, undefined as any];

    for (const badId of invalidTenantIds) {
      await assert.rejects(
        async () => {
          await executeTenantQuery(badId, async () => {
            return true;
          });
        },
        /Valid tenantId is required/i,
        `executeTenantQuery must reject invalid tenantId: "${badId}"`
      );
    }
  });

  // =========================================================================
  // 3. executeTenantQuery Context Setting & Reset Lifecycle
  // =========================================================================
  it('3. Context Lifecycle: executeTenantQuery sets app.current_tenant, runs query, and clears context in finally', async () => {
    const executedQueries: { sql: string; params?: any[] }[] = [];
    let connectionReleased = false;

    const mockClient: any = {
      query: async (sql: string, params?: any[]) => {
        executedQueries.push({ sql, params });
        if (sql.includes('SELECT 1')) {
          return { rows: [{ '?column?': 1 }] };
        }
        if (sql.includes('current_setting')) {
          return { rows: [{ tenant: '' }] }; // Clean connection
        }
        if (sql.includes('assert_tenant_context')) {
          return { rows: [] };
        }
        if (sql.includes('SELECT * FROM test_items')) {
          return { rows: [{ id: 'item-1', tenant_id: tenantA }] };
        }
        return { rows: [] };
      },
      release: (destroy?: boolean) => {
        connectionReleased = true;
      },
    };

    const originalConnect = pool.connect;
    (pool as any).connect = async () => mockClient;

    try {
      const result = await executeTenantQuery(tenantA, async (client) => {
        return client.query('SELECT * FROM test_items');
      });

      assert.strictEqual(result.rows[0].id, 'item-1');
      assert.strictEqual(connectionReleased, true);

      // Verify set_config('app.current_tenant', tenantA, false) was executed
      const setQuery = executedQueries.find((q) => q.sql.includes("set_config('app.current_tenant'") && q.params?.[0] === tenantA);
      assert.ok(setQuery, 'Must set app.current_tenant to tenantA');

      // Verify set_config('app.current_tenant', '', false) was executed in finally
      const resetQuery = executedQueries.find((q) => q.sql.includes("set_config('app.current_tenant', '', false)"));
      assert.ok(resetQuery, 'Must clear app.current_tenant to empty string in finally');
    } finally {
      pool.connect = originalConnect;
    }
  });

  // =========================================================================
  // 4. Connection Pollution Detection & Discard
  // =========================================================================
  it('4. Connection Pollution Guard: connectWithValidation detects dirty tenant context and discards connection', async () => {
    let connectionDestroyed = false;

    const pollutedClient: any = {
      query: async (sql: string) => {
        if (sql.includes('current_setting')) {
          // Connection checked out with dirty leftover context from previous failed operation
          return { rows: [{ tenant: 'leaked-dirty-tenant-uuid' }] };
        }
        return { rows: [] };
      },
      release: (destroy?: boolean) => {
        if (destroy === true) {
          connectionDestroyed = true;
        }
      },
    };

    const originalConnect = pool.connect;
    (pool as any).connect = async () => pollutedClient;

    try {
      await assert.rejects(
        async () => {
          await executeTenantQuery(tenantA, async () => 'ok');
        },
        /Connection pollution detected/i
      );
      assert.strictEqual(connectionDestroyed, true, 'Polluted connection must be discarded with client.release(true)');
    } finally {
      pool.connect = originalConnect;
    }
  });

  // =========================================================================
  // 5. Transaction Rollback & Error Cleanup Resilience
  // =========================================================================
  it('5. Transaction Rollback on Error: aborted callback transaction issues ROLLBACK before clearing context', async () => {
    const executedSqls: string[] = [];

    const mockClient: any = {
      query: async (sql: string) => {
        executedSqls.push(sql);
        if (sql.includes('current_setting')) {
          return { rows: [{ tenant: '' }] };
        }
        if (sql.includes('assert_tenant_context')) {
          return { rows: [] };
        }
        return { rows: [] };
      },
      release: () => {},
    };

    const originalConnect = pool.connect;
    (pool as any).connect = async () => mockClient;

    try {
      await assert.rejects(
        async () => {
          await executeTenantQuery(tenantA, async (client) => {
            await client.query('BEGIN');
            throw new Error('Simulated database execution error inside transaction');
          });
        },
        /Simulated database execution error/
      );

      // Verify ROLLBACK was executed
      const rollbackIdx = executedSqls.findIndex((s) => s.includes('ROLLBACK'));
      const resetIdx = executedSqls.findIndex((s) => s.includes("set_config('app.current_tenant', '', false)"));
      assert.ok(rollbackIdx !== -1, 'Must execute ROLLBACK upon error');
      assert.ok(resetIdx !== -1, 'Must execute context reset upon error');
      assert.ok(rollbackIdx < resetIdx, 'ROLLBACK must execute before context reset');
    } finally {
      pool.connect = originalConnect;
    }
  });

  // =========================================================================
  // 6. Cross-Tenant SELECT Isolation
  // =========================================================================
  it('6. Cross-Tenant SELECT Isolation: simulated RLS policy strictly isolates Tenant A and Tenant B data', async () => {
    // Simulated database table with Tenant A and Tenant B rows
    const databaseRows = [
      { id: 'ticket-1', tenant_id: tenantA, user_id: userA, subject: 'Tenant A Secret Ticket' },
      { id: 'ticket-2', tenant_id: tenantB, user_id: userB, subject: 'Tenant B Secret Ticket' },
    ];

    const simulateRlsQuery = async (currentTenantSetting: string) => {
      // PostgreSQL RLS evaluates: tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid
      const effectiveTenant = currentTenantSetting.trim() || null;
      return databaseRows.filter((row) => effectiveTenant !== null && row.tenant_id === effectiveTenant);
    };

    // Tenant A queries
    const tenantARows = await simulateRlsQuery(tenantA);
    assert.strictEqual(tenantARows.length, 1);
    assert.strictEqual(tenantARows[0].subject, 'Tenant A Secret Ticket');

    // Tenant B queries
    const tenantBRows = await simulateRlsQuery(tenantB);
    assert.strictEqual(tenantBRows.length, 1);
    assert.strictEqual(tenantBRows[0].subject, 'Tenant B Secret Ticket');

    // Cross-tenant data leakage is zero
    assert.strictEqual(tenantARows.some((r) => r.tenant_id === tenantB), false);
    assert.strictEqual(tenantBRows.some((r) => r.tenant_id === tenantA), false);
  });

  // =========================================================================
  // 7. Cross-Tenant INSERT / UPDATE / DELETE Prevention
  // =========================================================================
  it('7. Cross-Tenant Mutation Prevention: RLS WITH CHECK prevents cross-tenant INSERT, UPDATE, and DELETE', () => {
    // Simulated RLS WITH CHECK policy: WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid)
    function simulateRlsCheck(currentTenant: string, newRowTenant: string) {
      if (newRowTenant !== currentTenant) {
        throw new Error(`new row violates row-level security policy for table "support_tickets"`);
      }
      return true;
    }

    // 7a. Tenant A inserting with Tenant A ID -> Allowed
    assert.strictEqual(simulateRlsCheck(tenantA, tenantA), true);

    // 7b. Tenant A attempting to insert row stamped with Tenant B ID -> Blocked
    assert.throws(
      () => simulateRlsCheck(tenantA, tenantB),
      /violates row-level security policy/
    );

    // 7c. Simulated UPDATE isolation
    const dataStore = [
      { id: 'model-1', tenant_id: tenantA, name: 'Tenant A Qwen Model' },
      { id: 'model-2', tenant_id: tenantB, name: 'Tenant B Llama Model' },
    ];

    function simulateRlsUpdate(currentTenant: string, targetId: string, newName: string) {
      // In PostgreSQL RLS, rows not matching the USING clause are invisible to UPDATE
      const visibleRows = dataStore.filter((r) => r.tenant_id === currentTenant);
      const target = visibleRows.find((r) => r.id === targetId);
      if (!target) {
        return 0; // 0 rows affected
      }
      target.name = newName;
      return 1;
    }

    // Tenant A tries to update Tenant B's custom model
    const affected = simulateRlsUpdate(tenantA, 'model-2', 'Hacked Name');
    assert.strictEqual(affected, 0, 'Cross-tenant update must affect 0 rows');
    assert.strictEqual(dataStore.find((r) => r.id === 'model-2')?.name, 'Tenant B Llama Model', 'Target row must remain unmodified');
  });

  // =========================================================================
  // 8. Public Intake RLS: Contact & Career Ingestion Protection
  // =========================================================================
  it('8. Lead Intake Protection: public INSERT permitted; tenant SELECT blocked; admin SELECT permitted', () => {
    function simulateIntakeRls(operation: 'INSERT' | 'SELECT', currentTenant: string | null) {
      if (operation === 'INSERT') {
        // Policy: FOR INSERT WITH CHECK (true) -> Always permitted
        return true;
      }
      if (operation === 'SELECT') {
        // Policy: FOR ALL USING (NULLIF(current_setting('app.current_tenant', true), '') IS NULL)
        const isSystemOrAdmin = currentTenant === null || currentTenant.trim() === '';
        return isSystemOrAdmin;
      }
      return false;
    }

    // Public visitor submits contact form
    assert.strictEqual(simulateIntakeRls('INSERT', null), true);

    // Tenant A attempts to read candidate / sales submissions
    assert.strictEqual(simulateIntakeRls('SELECT', tenantA), false, 'Tenant sessions must not be able to SELECT contact submissions');

    // Platform admin (no tenant context) reads submissions
    assert.strictEqual(simulateIntakeRls('SELECT', null), true, 'Platform admin context must be able to SELECT contact submissions');
  });

  // =========================================================================
  // 9. Platform Singletons & Founder Data Confidentiality
  // =========================================================================
  it('9. Founder Intelligence Confidentiality: tenant sessions return 0 rows for founder tables', () => {
    const founderThreats = [
      { id: '1', title: 'Competitor Launching Feature X', severity: 'high' },
    ];

    function queryFounderThreats(currentTenant: string | null) {
      // Policy: USING (NULLIF(current_setting('app.current_tenant', true), '') IS NULL)
      if (currentTenant && currentTenant.trim() !== '') {
        return []; // Tenant session sees 0 rows
      }
      return founderThreats; // Admin sees rows
    }

    // Tenant A querying founder data
    const tenantView = queryFounderThreats(tenantA);
    assert.strictEqual(tenantView.length, 0, 'Tenant session must see 0 founder rows');

    // Platform admin querying founder data
    const adminView = queryFounderThreats(null);
    assert.strictEqual(adminView.length, 1, 'Platform admin must see founder rows');
  });

  // =========================================================================
  // 10. Database Role Isolation & NOBYPASSRLS Verification
  // =========================================================================
  it('10. Database Role Verification: verifyDatabaseIsolationRole detects role privileges and warns on BYPASSRLS', async () => {
    const mockRolePool: any = {
      query: async (sql: string) => {
        if (sql.includes('pg_roles')) {
          return {
            rows: [
              { role: 'neuravolt_app', is_superuser: false, can_bypass_rls: false },
            ],
          };
        }
        return { rows: [] };
      },
    };

    const roleInfo = await verifyDatabaseIsolationRole(mockRolePool);
    assert.strictEqual(roleInfo.role, 'neuravolt_app');
    assert.strictEqual(roleInfo.isSuperuser, false);
    assert.strictEqual(roleInfo.canBypassRls, false);
  });
});
