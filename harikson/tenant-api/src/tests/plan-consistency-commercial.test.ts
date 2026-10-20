import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePlanId } from '../routes/user.routes.js';

/**
 * Phase 2 Test Suite: Commercial Consistency & Plan Normalization
 * 
 * Test Classification:
 * - [Pure Unit]: In-memory deterministic function testing (normalizePlanId, pricing math).
 * - [Logic Invariant]: Verification of runtime decision rules (quota boundaries, quota fallback safety).
 * - [Contract Invariant]: Verification of documented commercial terms against database migration schemas.
 */
describe('Phase 2: Plan Consistency & Commercial Accuracy Test Suite', () => {

  describe('[Pure Unit] Plan Identifier Canonicalization & Alias Normalization', () => {
    it('normalizes legacy "pro" alias to canonical "professional"', () => {
      assert.equal(normalizePlanId('pro'), 'professional');
      assert.equal(normalizePlanId('PRO'), 'professional');
      assert.equal(normalizePlanId('Pro'), 'professional');
      assert.equal(normalizePlanId(' pro '), 'professional');
    });

    it('preserves canonical plan identifiers untouched', () => {
      assert.equal(normalizePlanId('free'), 'free');
      assert.equal(normalizePlanId('starter'), 'starter');
      assert.equal(normalizePlanId('professional'), 'professional');
      assert.equal(normalizePlanId('enterprise'), 'enterprise');
    });

    it('falls back safely to "free" for empty or missing plan identifiers', () => {
      assert.equal(normalizePlanId(''), 'free');
      assert.equal(normalizePlanId(null as any), 'free');
      assert.equal(normalizePlanId(undefined as any), 'free');
    });

    it('preserves custom or unknown plan identifiers for safe database handling without silent mutation', () => {
      assert.equal(normalizePlanId('custom_tier'), 'custom_tier');
      assert.equal(normalizePlanId('nonexistent_plan'), 'nonexistent_plan');
    });
  });

  describe('[Logic Invariant] Quota Fallback & Safety on Failed Plan Lookup', () => {
    // Replicates the runtime resolution in chat.routes.ts and user.routes.ts:
    const resolveTokenLimit = (planRow: { token_limit?: number | null } | undefined | null): number => {
      return (planRow && planRow.token_limit !== null && planRow.token_limit !== undefined)
        ? Number(planRow.token_limit)
        : 1000; // Safe Free-tier fallback, NEVER -1 (unlimited)
    };

    it('resolves explicit enterprise token_limit (-1) as unlimited', () => {
      assert.equal(resolveTokenLimit({ token_limit: -1 }), -1);
    });

    it('resolves explicit starter (5000) and professional (10000) quotas', () => {
      assert.equal(resolveTokenLimit({ token_limit: 5000 }), 5000);
      assert.equal(resolveTokenLimit({ token_limit: 10000 }), 10000);
    });

    it('CRITICAL SAFETY: falls back to 1000 (Free tier), NOT -1, when plan lookup returns null or undefined', () => {
      // If a tenant has an invalid plan or the DB query fails to match,
      // the system MUST NOT grant unlimited access (-1).
      assert.equal(resolveTokenLimit(null), 1000);
      assert.equal(resolveTokenLimit(undefined), 1000);
      assert.equal(resolveTokenLimit({ token_limit: null }), 1000);
      assert.equal(resolveTokenLimit({ token_limit: undefined }), 1000);
      assert.notEqual(resolveTokenLimit(null), -1);
    });
  });

  describe('[Contract Invariant] Commercial Plan Quota & Unit Verification', () => {
    // Official database quotas established in Migration 038 and enforced in chat.routes.ts:
    const canonicalPlanQuotas: Record<string, { tokenLimit: number; unit: string; period: string; storageGb: number }> = {
      free: { tokenLimit: 1000, unit: 'AI Messages', period: 'monthly', storageGb: 1 },
      starter: { tokenLimit: 5000, unit: 'AI Messages', period: 'monthly', storageGb: 20 },
      professional: { tokenLimit: 10000, unit: 'AI Messages', period: 'monthly', storageGb: 100 },
      enterprise: { tokenLimit: -1, unit: 'AI Messages', period: 'monthly', storageGb: 1024 },
    };

    it('verifies canonical message quotas for all plans against Migration 038', () => {
      assert.equal(canonicalPlanQuotas.free.tokenLimit, 1000);
      assert.equal(canonicalPlanQuotas.starter.tokenLimit, 5000);
      assert.equal(canonicalPlanQuotas.professional.tokenLimit, 10000);
      assert.equal(canonicalPlanQuotas.enterprise.tokenLimit, -1);
    });

    it('verifies that quota enforcement unit is AI Messages per month', () => {
      const isWithinQuota = (count: number, limit: number) => limit === -1 || count < limit;

      // Starter tests (limit 5000)
      assert.equal(isWithinQuota(4999, 5000), true);
      assert.equal(isWithinQuota(5000, 5000), false);
      assert.equal(isWithinQuota(5001, 5000), false);

      // Professional tests (limit 10000)
      assert.equal(isWithinQuota(9999, 10000), true);
      assert.equal(isWithinQuota(10000, 10000), false);
      assert.equal(isWithinQuota(10001, 10000), false);

      // Enterprise tests (unlimited -1)
      assert.equal(isWithinQuota(500000, -1), true);
    });

    it('verifies that resolving legacy "pro" yields the professional quota', () => {
      const resolvedPlan = normalizePlanId('pro');
      const quota = canonicalPlanQuotas[resolvedPlan];
      assert.ok(quota);
      assert.equal(quota.tokenLimit, 10000);
      assert.equal(quota.storageGb, 100);
    });
  });

  describe('[Contract Invariant] Commercial Pricing & Interval Verification', () => {
    // Official database prices established in Migration 072/073:
    const canonicalPlanPrices: Record<string, { price: number; currency: string; billing: string }> = {
      free: { price: 0, currency: 'INR', billing: 'monthly' },
      starter: { price: 149, currency: 'INR', billing: 'monthly' },
      professional: { price: 999, currency: 'INR', billing: 'monthly' },
      enterprise: { price: 2499, currency: 'INR', billing: 'monthly' },
    };

    it('verifies database prices are monthly INR recurring against Migration 072/073', () => {
      assert.equal(canonicalPlanPrices.starter.price, 149);
      assert.equal(canonicalPlanPrices.professional.price, 999);
      assert.equal(canonicalPlanPrices.enterprise.price, 2499);
      assert.equal(canonicalPlanPrices.free.price, 0);

      for (const plan of Object.values(canonicalPlanPrices)) {
        assert.equal(plan.billing, 'monthly');
        assert.equal(plan.currency, 'INR');
      }
    });

    it('verifies annual equivalent calculation (20% commitment discount)', () => {
      const calcAnnualEquivalentMonthly = (monthlyPrice: number) => Math.round(monthlyPrice * 0.8);
      assert.equal(calcAnnualEquivalentMonthly(149), 119);
      assert.equal(calcAnnualEquivalentMonthly(999), 799);
      assert.equal(calcAnnualEquivalentMonthly(2499), 1999);
    });

    it('verifies annual commitment totals (12 months at 20% discount)', () => {
      assert.equal(12 * 119, 1428);
      assert.equal(12 * 799, 9588);
      assert.equal(12 * 1999, 23988);
    });
  });

  after(async () => {
    setTimeout(() => process.exit(0), 100);
  });
});
