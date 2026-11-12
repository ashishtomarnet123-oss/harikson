import { pool } from '../../src/db/pool.js';
import { setTenantContext, clearTenantContext } from '../../src/utils/context.js';

export async function resetTestDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      DELETE FROM messages WHERE conversation_id IN (
        SELECT id FROM conversations WHERE tenant_id IN (
          SELECT id FROM tenants WHERE slug LIKE 'test-%' OR slug LIKE 'login-%' OR slug LIKE 'stripe-%' OR slug LIKE 'chat-%' OR slug LIKE 'tenant-%' OR slug LIKE 'active-%'
        )
      )
    `);
    await client.query(`
      DELETE FROM conversations WHERE tenant_id IN (
        SELECT id FROM tenants WHERE slug LIKE 'test-%' OR slug LIKE 'login-%' OR slug LIKE 'stripe-%' OR slug LIKE 'chat-%' OR slug LIKE 'tenant-%' OR slug LIKE 'active-%'
      )
    `);
    await client.query(`
      DELETE FROM invoices WHERE tenant_id IN (
        SELECT id FROM tenants WHERE slug LIKE 'test-%' OR slug LIKE 'login-%' OR slug LIKE 'stripe-%' OR slug LIKE 'chat-%' OR slug LIKE 'tenant-%' OR slug LIKE 'active-%'
      )
    `);
    await client.query(`
      DELETE FROM subscriptions WHERE tenant_id IN (
        SELECT id FROM tenants WHERE slug LIKE 'test-%' OR slug LIKE 'login-%' OR slug LIKE 'stripe-%' OR slug LIKE 'chat-%' OR slug LIKE 'tenant-%' OR slug LIKE 'active-%'
      )
    `);
    await client.query(`
      DELETE FROM users WHERE tenant_id IN (
        SELECT id FROM tenants WHERE slug LIKE 'test-%' OR slug LIKE 'login-%' OR slug LIKE 'stripe-%' OR slug LIKE 'chat-%' OR slug LIKE 'tenant-%' OR slug LIKE 'active-%'
      ) OR email LIKE '%@tenantX.com' OR email LIKE '%@tenantY.com'
    `);
    await client.query(`
      DELETE FROM tenants WHERE slug LIKE 'test-%' OR slug LIKE 'login-%' OR slug LIKE 'stripe-%' OR slug LIKE 'chat-%' OR slug LIKE 'tenant-%' OR slug LIKE 'active-%'
    `);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { setTenantContext, clearTenantContext };
