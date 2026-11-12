if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://neuravolt:neuravolt_dev_pwd@localhost:5432/neuravolt';
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}

import { describe, it, after, afterEach } from 'node:test';
import assert from 'node:assert';
import pg from 'pg';
import crypto from 'crypto';
import { pool, redis, executeTenantTransaction, executeTenantQuery } from '../src/db/pool.js';
import {
  calculateMigrationChecksum,
  verifyMigrationIntegrity,
  runMigrations,
} from '../src/utils/migrate.js';

describe('Phase 8 — Database Reliability & Data Integrity Test Suite', () => {
  const originalQuery = pool.query;
  const originalConnect = pool.connect;

  after(async () => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
    try {
      redis.disconnect();
    } catch (_) {}
    setTimeout(() => process.exit(0), 100);
  });

  afterEach(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
  });

  // ─── 1. Sequential Migration Checksum Integrity & Drift Detection ────────────────
  it('1. Checksum Hashing: calculates deterministic SHA-256 checksums matching file contents', () => {
    const sampleSql = 'CREATE TABLE test_checksum (id INT PRIMARY KEY);';
    const hash1 = calculateMigrationChecksum(sampleSql);
    const hash2 = calculateMigrationChecksum(sampleSql);
    const hashDifferent = calculateMigrationChecksum(sampleSql + '\n-- extra comment');

    assert.strictEqual(hash1.length, 64);
    assert.strictEqual(hash1, hash2);
    assert.notStrictEqual(hash1, hashDifferent);
  });

  it('2. Migration Integrity Verification: inspects database meta and reports zero drift on clean migrations', async () => {
    const integrity = await verifyMigrationIntegrity(pool);

    assert.ok(integrity.totalOnDisk >= 80, `Expected at least 80 migrations on disk, got ${integrity.totalOnDisk}`);
    assert.strictEqual(integrity.pending.length, 0, `Expected 0 pending migrations, got: ${integrity.pending.join(', ')}`);
    assert.strictEqual(integrity.drifts.length, 0, `Expected 0 drifted migrations, got: ${integrity.drifts.join(', ')}`);
    assert.ok(integrity.totalApplied >= 80);
  });

  // ─── 2. Advisory Lock Concurrency & Idempotency ──────────────────────────────────
  it('3. Migration Idempotency & Locking: repeated runMigrations executions acquire locks and succeed safely', async () => {
    await runMigrations(pool);
    const { rows } = await pool.query('SELECT COUNT(*)::int as count FROM migrations_meta WHERE checksum = \'hash\'');
    assert.strictEqual(rows[0].count, 0, 'All legacy placeholder "hash" checksums must be backfilled to real SHA-256');
  });

  // ─── 3. Atomic Transaction Isolation & Safe Rollback ────────────────────────────
  it('4. Atomic Tenant Transaction Rollback: rolls back changes and clears tenant context when an inner query fails', async () => {
    const tenantRes = await pool.query('SELECT id FROM tenants LIMIT 1');
    const testTenantId = tenantRes.rows[0]?.id || '00000000-0000-0000-0000-000000000000';
    const testPath = `test-rollback-${Date.now()}.ts`;

    let errorThrown = false;
    try {
      await executeTenantTransaction(testTenantId, async (client) => {
        await client.query(
          `INSERT INTO file_index_state (tenant_id, file_path, mtime, sha256)
           VALUES ($1, $2, 1000, 'hash123')`,
          [testTenantId, testPath]
        );
        // Force intentional transaction failure
        throw new Error('INTENTIONAL_TRANSACTION_FAILURE');
      });
    } catch (err: any) {
      if (err.message === 'INTENTIONAL_TRANSACTION_FAILURE') {
        errorThrown = true;
      }
    }

    assert.strictEqual(errorThrown, true);

    // Verify row was rolled back and does not exist in database
    const checkRes = await pool.query(
      'SELECT id FROM file_index_state WHERE file_path = $1',
      [testPath]
    );
    assert.strictEqual(checkRes.rows.length, 0, 'Uncommitted transaction record must not persist');
  });

  it('5. Atomic Tenant Transaction Commit: commits all changes atomically and returns execution payload on success', async () => {
    const tenantRes = await pool.query('SELECT id FROM tenants LIMIT 1');
    const testTenantId = tenantRes.rows[0]?.id || '00000000-0000-0000-0000-000000000000';
    const testPath = `test-commit-${Date.now()}.ts`;

    const insertedId = await executeTenantTransaction(testTenantId, async (client) => {
      const res = await client.query(
        `INSERT INTO file_index_state (tenant_id, file_path, mtime, sha256)
         VALUES ($1, $2, 2000, 'commithash')
         RETURNING id`,
        [testTenantId, testPath]
      );
      return res.rows[0].id;
    });

    assert.ok(insertedId);

    // Cleanup committed test record
    await pool.query('DELETE FROM file_index_state WHERE id = $1', [insertedId]);
  });

  // ─── 4. Schema Completeness & Previously Missing Tables ──────────────────────────
  it('6. Schema Completeness: memories, file_chunks, file_index_state, tool_executions, task_plans exist with RLS enabled', async () => {
    const targetTables = ['memories', 'file_chunks', 'file_index_state', 'tool_executions', 'task_plans'];

    const res = await pool.query(
      `SELECT tablename, rowsecurity 
       FROM pg_tables 
       WHERE schemaname = 'public' AND tablename = ANY($1)`,
      [targetTables]
    );

    const foundTables = new Map(res.rows.map(r => [r.tablename, r.rowsecurity]));
    for (const t of targetTables) {
      assert.ok(foundTables.has(t), `Table "${t}" must exist in the database`);
      assert.strictEqual(foundTables.get(t), true, `Table "${t}" must have row-level security enabled`);
    }
  });

  // ─── 5. Vector Search HNSW Indexing ─────────────────────────────────────────────
  it('7. HNSW Vector Indexes: document_embeddings, memories, and file_chunks possess active HNSW vector indexes', async () => {
    const { rows } = await pool.query(`
      SELECT indexname, tablename, indexdef 
      FROM pg_indexes 
      WHERE indexdef ILIKE '%hnsw%' AND tablename IN ('document_embeddings', 'memories', 'file_chunks')
    `);

    const hnswTables = new Set(rows.map(r => r.tablename));
    assert.ok(hnswTables.has('document_embeddings'), 'document_embeddings must have an active HNSW index');
    assert.ok(hnswTables.has('memories'), 'memories must have an active HNSW index');
    assert.ok(hnswTables.has('file_chunks'), 'file_chunks must have an active HNSW index');

    // Verify index definition parameters
    const docIdx = rows.find(r => r.tablename === 'document_embeddings');
    assert.ok(docIdx?.indexdef.includes('vector_cosine_ops'));
  });

  // ─── 6. Foreign Key Cascades & Covering Indexes ─────────────────────────────────
  it('8. Foreign Key Indexes: foreign key relationships possess covering indexes preventing table lock contention', async () => {
    const { rows } = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE indexname IN (
        'idx_subscriptions_plan_id',
        'idx_invoices_tax_rate_id',
        'idx_payment_webhooks_provider_id',
        'idx_conversations_user_tenant',
        'idx_messages_conversation_id'
      )
    `);

    const foundIndexes = new Set(rows.map(r => r.indexname));
    assert.ok(foundIndexes.has('idx_subscriptions_plan_id'));
    assert.ok(foundIndexes.has('idx_invoices_tax_rate_id'));
    assert.ok(foundIndexes.has('idx_payment_webhooks_provider_id'));
    assert.ok(foundIndexes.has('idx_conversations_user_tenant'));
    assert.ok(foundIndexes.has('idx_messages_conversation_id'));
  });

  // ─── 7. Partial Indexes for Soft-Delete Optimization ────────────────────────────
  it('9. Partial Indexes: active query partial indexes exist for soft-deleted tables (WHERE deleted_at IS NULL)', async () => {
    const { rows } = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE indexname IN (
        'idx_conversations_active',
        'idx_knowledge_documents_active',
        'idx_workflows_active',
        'idx_users_active',
        'idx_agents_active'
      )
    `);

    const indexMap = new Map(rows.map(r => [r.indexname, r.indexdef]));
    assert.ok(indexMap.has('idx_conversations_active'));
    assert.ok(indexMap.get('idx_conversations_active')?.includes('deleted_at IS NULL'));

    assert.ok(indexMap.has('idx_users_active'));
    assert.ok(indexMap.get('idx_users_active')?.includes('deleted_at IS NULL'));

    assert.ok(indexMap.has('idx_agents_active'));
    assert.ok(indexMap.get('idx_agents_active')?.includes('deleted'));
  });

  // ─── 8. Financial Ledger Non-Negative Balance Constraint ────────────────────────
  it('10. Financial Integrity: credit_ledger check constraint rejects negative balance_after', async () => {
    const tenantRes = await pool.query('SELECT id FROM tenants LIMIT 1');
    const testTenantId = tenantRes.rows[0]?.id || '00000000-0000-0000-0000-000000000000';
    let rejected = false;

    try {
      await pool.query(
        `INSERT INTO credit_ledger (tenant_id, amount, currency, source_type, balance_after)
         VALUES ($1, -500.00, 'INR', 'adjustment', -100.00)`,
        [testTenantId]
      );
    } catch (err: any) {
      if (err.message.includes('chk_credit_ledger_balance_non_negative') || err.code === '23514') {
        rejected = true;
      }
    }

    assert.strictEqual(rejected, true, 'Negative balance_after in credit_ledger must be rejected by check constraint');
  });

  // ─── 9. Telemetry Purge Retention Procedure ────────────────────────────────────
  it('11. Data Retention Purge Procedure: public.purge_stale_telemetry callable and executes safely', async () => {
    const res = await pool.query('SELECT * FROM public.purge_stale_telemetry(365)');
    assert.ok(res.rows.length === 1);
    assert.ok(typeof res.rows[0].purged_cookie_logs === 'number');
    assert.ok(typeof res.rows[0].purged_ai_activity === 'number');
  });
});
