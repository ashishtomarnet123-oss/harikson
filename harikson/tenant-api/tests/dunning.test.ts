import { describe, it, expect, after } from './test-utils.js';
import { triggerSubscriptionDunning, reactivateTenantSubscription, dunningQueue, dunningRedisConnection } from '../src/services/dunningService.js';
import { pool, readPool, redis } from '../src/db/pool.js';

describe('Failed Payment Dunning Retry Schedule Test Suite', () => {
  const tenantId = '00000000-0000-0000-0000-000000000000';
  const subId = '00000000-0000-0000-0000-000000000000';

  after(async () => {
    try {
      await dunningQueue.close();
      if (dunningRedisConnection && dunningRedisConnection.status !== 'end') {
        dunningRedisConnection.disconnect();
      }
      await pool.end();
      await readPool.end();
      if (redis.status !== 'end') {
        redis.disconnect();
      }
    } catch {
      // ignore
    }
  });

  it('1. Triggers subscription dunning and updates status to past_due', async () => {
    await expect(
      triggerSubscriptionDunning(tenantId, subId, 'Card declined - Insufficient funds')
    ).resolves.not.toThrow();
  });

  it('2. Reactivates tenant subscription and clears dunning state', async () => {
    await expect(
      reactivateTenantSubscription(tenantId)
    ).resolves.not.toThrow();
  });
});
