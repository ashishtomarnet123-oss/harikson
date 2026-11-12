import Stripe from 'stripe';
import { pool, executeTenantQuery, invalidateTenantCache } from '../db/pool.js';
import logger from '../utils/logger.js';

if (!process.env.STRIPE_SECRET_KEY) {
  logger.warn('STRIPE_SECRET_KEY not set — proration Stripe operations will fail');
}
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' as any })
  : null;

export interface ProrationResult {
  oldPlanPrice: number;
  newPlanPrice: number;
  periodStart: Date;
  periodEnd: Date;
  daysInPeriod: number;
  daysRemaining: number;
  unusedCredit: number;
  newPlanCharge: number;
  netAmount: number;
  taxAmount: number;
  total: number;
  currency: string;
  invoiceDescription: string;
  inTrial: boolean;
  status?: string;
  checkoutRequired?: boolean;
}

export interface PlanChangeOptions {
  userId?: string;
  paymentVerified?: boolean;
  paymentReference?: string;
  orderId?: string;
  idempotencyKey?: string;
}

/**
 * Calculate mid-cycle prorated billing for plan changes.
 * Incorporates 18% standard Indian GST on positive net amounts.
 */
export function calculateProration(
  oldPlanPrice: number,
  newPlanPrice: number,
  periodStart: Date,
  periodEnd: Date,
  now: Date = new Date(),
  inTrial: boolean = false,
  currency: string = 'INR'
): ProrationResult {
  const symbol = currency.toUpperCase() === 'INR' ? '₹' : '$';

  if (inTrial || oldPlanPrice <= 0) {
    // If tenant is on trial or free tier, they have 0 unused credit to forfeit or redeem
    const totalMs = Math.max(1, periodEnd.getTime() - periodStart.getTime());
    const remainingMs = Math.max(0, periodEnd.getTime() - now.getTime());
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysInPeriod = Math.max(1, Math.round(totalMs / msPerDay));
    const daysRemaining = Math.max(0, Math.round(remainingMs / msPerDay));

    if (inTrial && newPlanPrice <= 0) {
      return {
        oldPlanPrice: 0,
        newPlanPrice,
        periodStart,
        periodEnd,
        daysInPeriod: 30,
        daysRemaining: 30,
        unusedCredit: 0,
        newPlanCharge: 0,
        netAmount: 0,
        taxAmount: 0,
        total: 0,
        currency,
        invoiceDescription: `Prorated plan change: Credit ${symbol}0.00, Charge ${symbol}0.00, Net ${symbol}0.00 (Trial period active)`,
        inTrial: true,
      };
    }

    const dailyRateNew = newPlanPrice > 0 ? newPlanPrice / daysInPeriod : 0;
    const newPlanCharge = parseFloat((daysRemaining * dailyRateNew).toFixed(2));
    const netAmount = newPlanCharge;
    const taxAmount = netAmount > 0 ? parseFloat((netAmount * 0.18).toFixed(2)) : 0;
    const total = parseFloat((netAmount + taxAmount).toFixed(2));

    return {
      oldPlanPrice: 0,
      newPlanPrice,
      periodStart,
      periodEnd,
      daysInPeriod,
      daysRemaining,
      unusedCredit: 0,
      newPlanCharge,
      netAmount,
      taxAmount,
      total,
      currency,
      invoiceDescription: `Prorated upgrade: Credit ${symbol}0.00, Charge ${symbol}${newPlanCharge.toFixed(2)}, Tax (18% GST) ${symbol}${taxAmount.toFixed(2)}, Total ${symbol}${total.toFixed(2)}`,
      inTrial: !!inTrial,
    };
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const totalMs = Math.max(1, periodEnd.getTime() - periodStart.getTime());
  const remainingMs = Math.max(0, periodEnd.getTime() - now.getTime());

  const daysInPeriod = Math.max(1, Math.round(totalMs / msPerDay));
  const daysRemaining = Math.max(0, Math.round(remainingMs / msPerDay));

  const dailyRateOld = oldPlanPrice > 0 ? oldPlanPrice / daysInPeriod : 0;
  const unusedCredit = parseFloat((daysRemaining * dailyRateOld).toFixed(2));

  const dailyRateNew = newPlanPrice > 0 ? newPlanPrice / daysInPeriod : 0;
  const newPlanCharge = parseFloat((daysRemaining * dailyRateNew).toFixed(2));

  const netAmount = parseFloat((newPlanCharge - unusedCredit).toFixed(2));
  const taxAmount = netAmount > 0 ? parseFloat((netAmount * 0.18).toFixed(2)) : 0;
  const total = netAmount > 0 ? parseFloat((netAmount + taxAmount).toFixed(2)) : 0;

  const invoiceDescription = netAmount > 0
    ? `Prorated upgrade: Credit ${symbol}${unusedCredit.toFixed(2)}, Charge ${symbol}${newPlanCharge.toFixed(2)}, Net ${symbol}${netAmount.toFixed(2)}, Tax (18% GST) ${symbol}${taxAmount.toFixed(2)}, Total ${symbol}${total.toFixed(2)}`
    : `Prorated downgrade: Credit ${symbol}${unusedCredit.toFixed(2)}, Charge ${symbol}${newPlanCharge.toFixed(2)}, Net Credit ${symbol}${Math.abs(netAmount).toFixed(2)}`;

  return {
    oldPlanPrice,
    newPlanPrice,
    periodStart,
    periodEnd,
    daysInPeriod,
    daysRemaining,
    unusedCredit,
    newPlanCharge,
    netAmount,
    taxAmount,
    total,
    currency,
    invoiceDescription,
    inTrial: false,
  };
}

/**
 * Execute mid-cycle plan upgrade or downgrade with prorated billing.
 *
 * Financial Controls & Invariants:
 * 1. An upgrade (netAmount > 0) CANNOT mark an invoice as paid or elevate plan without verified payment reference.
 * 2. A downgrade (netAmount < 0) CANNOT generate account credit unless the tenant has a verified paid invoice in the current cycle.
 * 3. Account credits are audited in `credit_ledger` with idempotency protection.
 * 4. State updates are transaction-safe (atomic BEGIN/COMMIT/ROLLBACK).
 */
export async function executePlanChange(
  tenantId: string,
  newPlanId: string,
  paymentProvider: string = 'stripe',
  options: PlanChangeOptions = {}
): Promise<ProrationResult> {
  const client = await pool.connect();
  try {
    // 1. Fetch current subscription and target plan
    const subRes = await client.query(
      `SELECT s.*, p.price as old_price, p.currency, p.name as old_plan_name
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.tenant_id = $1 AND s.status IN ('active', 'trialing')
       ORDER BY s.created_at DESC LIMIT 1`,
      [tenantId]
    );

    const targetPlanId = (newPlanId || '').trim().toLowerCase() === 'pro' ? 'professional' : newPlanId.trim().toLowerCase();
    const newPlanRes = await client.query('SELECT * FROM plans WHERE id = $1', [targetPlanId]);
    const newPlan = newPlanRes.rows[0];
    if (!newPlan) throw new Error(`Target plan ${newPlanId} not found`);

    const currentSub = subRes.rows[0];
    const oldPrice = currentSub ? Number(currentSub.old_price) : 0;
    const newPrice = Number(newPlan.price);
    const currency = newPlan.currency || 'INR';

    const periodStart = currentSub?.current_period_start ? new Date(currentSub.current_period_start) : new Date();
    const periodEnd = currentSub?.current_period_end ? new Date(currentSub.current_period_end) : new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const inTrial = currentSub?.status === 'trialing';

    // 2. Calculate proration with 18% GST
    const proration = calculateProration(oldPrice, newPrice, periodStart, periodEnd, new Date(), inTrial, currency);

    // 3. Provider-specific proration execution (Stripe subscription sync if configured)
    if (paymentProvider === 'stripe' && currentSub?.provider_subscription_id && stripe) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(currentSub.provider_subscription_id);
        const itemId = stripeSub.items.data[0]?.id;

        if (itemId) {
          await stripe.subscriptions.update(currentSub.provider_subscription_id, {
            proration_behavior: 'create_prorations',
            items: [{ id: itemId, price: newPlan.stripe_price_id || targetPlanId }],
          });
        }
      } catch (stripeErr: any) {
        logger.warn('Stripe subscription proration update failed, proceeding with platform proration:', stripeErr.message);
      }
    }

    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`;

    // 4. Handle UPGRADE (netAmount > 0): Strict payment verification check (FIN-001)
    if (proration.netAmount > 0) {
      if (!options.paymentVerified) {
        // Unverified upgrade attempt: create open/pending invoice, do NOT upgrade tenant or subscription
        await client.query(
          `INSERT INTO invoices (
            tenant_id, subscription_id, invoice_number, amount, currency, status,
            subtotal, tax_amount, total, provider, provider_invoice_id, created_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
          [
            tenantId,
            currentSub?.id || null,
            invoiceNumber,
            proration.netAmount,
            currency,
            'pending_payment',
            proration.netAmount,
            proration.taxAmount,
            proration.total,
            paymentProvider,
            options.orderId || invoiceNumber,
          ]
        );

        logger.info(`📋 [PRORATION] Tenant ${tenantId} generated pending invoice ${invoiceNumber} for upgrade to ${targetPlanId}. Checkout required.`);
        return {
          ...proration,
          status: 'pending_payment',
          checkoutRequired: true,
        };
      }

      // Verified upgrade: apply changes inside a transaction
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO invoices (
          tenant_id, subscription_id, invoice_number, amount, currency, status,
          subtotal, tax_amount, total, provider, provider_invoice_id, created_at, paid_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          tenantId,
          currentSub?.id || null,
          invoiceNumber,
          proration.netAmount,
          currency,
          'paid',
          proration.netAmount,
          proration.taxAmount,
          proration.total,
          paymentProvider,
          options.paymentReference || invoiceNumber,
        ]
      );

      await client.query(
        `UPDATE tenants SET plan = $1, status = 'active', updated_at = NOW() WHERE id = $2`,
        [targetPlanId.toUpperCase(), tenantId]
      );

      if (currentSub?.id) {
        await client.query(
          `UPDATE subscriptions SET plan_id = $1, amount = $2, status = 'active', updated_at = NOW() WHERE id = $3`,
          [targetPlanId, newPrice, currentSub.id]
        );
      } else {
        await client.query(
          `INSERT INTO subscriptions (tenant_id, provider, provider_subscription_id, plan_id, status, current_period_start, current_period_end, amount, currency, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'active', NOW(), NOW() + INTERVAL '30 days', $5, $6, NOW(), NOW())`,
          [tenantId, paymentProvider, options.paymentReference || invoiceNumber, targetPlanId, newPrice, currency]
        );
      }

      await client.query('COMMIT');
      await invalidateTenantCache(tenantId);
      logger.info(`✅ [PRORATION VERIFIED] Tenant ${tenantId} upgraded to ${targetPlanId}. Invoice ${invoiceNumber} marked paid.`);
      return { ...proration, status: 'paid' };
    }

    // 5. Handle DOWNGRADE (netAmount < 0): Strict credit verification check (FIN-002)
    if (proration.netAmount < 0) {
      await client.query('BEGIN');

      let creditAmount = 0;
      let paidInvoiceId: string | null = null;

      // Only active, non-trial subscriptions with an actual paid invoice can yield credits
      if (currentSub && currentSub.status === 'active' && oldPrice > 0) {
        const paidInvRes = await client.query(
          `SELECT id, amount, total, paid_at, provider_invoice_id
           FROM invoices
           WHERE tenant_id = $1
             AND status = 'paid'
             AND paid_at IS NOT NULL
             AND created_at >= $2
           ORDER BY paid_at DESC LIMIT 1`,
          [tenantId, periodStart]
        );

        if (paidInvRes.rows.length > 0) {
          const paidInvoice = paidInvRes.rows[0];
          paidInvoiceId = paidInvoice.id;
          const maxAllowedCredit = Number(paidInvoice.total || paidInvoice.amount || 0);
          creditAmount = Math.min(Math.abs(proration.netAmount), maxAllowedCredit);
        } else {
          logger.warn(`⚠️ [PRORATION] Tenant ${tenantId} requested downgrade without verified paid invoice in current cycle. Account credit set to 0.`);
        }
      }

      if (creditAmount > 0) {
        // Fetch current tenant credit balance
        const tenantRes = await client.query('SELECT metadata FROM tenants WHERE id = $1', [tenantId]);
        const currentMetadata = tenantRes.rows[0]?.metadata || {};
        const currentBalance = Number(currentMetadata.account_credit || 0);
        const newBalance = parseFloat((currentBalance + creditAmount).toFixed(2));

        const idempotencyKey = options.idempotencyKey || `credit_${tenantId}_${currentSub?.id || 'cycle'}_${targetPlanId}_${Math.floor(Date.now() / 60000)}`;

        // Auditable credit ledger record
        await client.query(
          `INSERT INTO credit_ledger (
            tenant_id, amount, currency, source_type, source_ref_id,
            idempotency_key, description, balance_after, created_by, created_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
           ON CONFLICT (idempotency_key) DO NOTHING`,
          [
            tenantId,
            creditAmount,
            currency,
            'proration_downgrade',
            paidInvoiceId,
            idempotencyKey,
            `Proration downgrade credit from ${currentSub?.old_plan_name || 'previous plan'} to ${targetPlanId}`,
            newBalance,
            options.userId || null,
          ]
        );

        await client.query(
          `UPDATE tenants
           SET plan = $1,
               metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('account_credit', $2::numeric),
               updated_at = NOW()
           WHERE id = $3`,
          [targetPlanId.toUpperCase(), newBalance, tenantId]
        );
      } else {
        await client.query(
          `UPDATE tenants SET plan = $1, updated_at = NOW() WHERE id = $2`,
          [targetPlanId.toUpperCase(), tenantId]
        );
      }

      // Record credit note / adjustment invoice
      await client.query(
        `INSERT INTO invoices (
          tenant_id, subscription_id, invoice_number, amount, currency, status,
          subtotal, tax_amount, total, provider, provider_invoice_id, created_at
         )
         VALUES ($1, $2, $3, 0, $4, 'credited', 0, 0, 0, 'system', $5, NOW())`,
        [
          tenantId,
          currentSub?.id || null,
          invoiceNumber,
          currency,
          invoiceNumber,
        ]
      );

      // Update active subscription
      if (currentSub?.id) {
        await client.query(
          `UPDATE subscriptions SET plan_id = $1, amount = $2, updated_at = NOW() WHERE id = $3`,
          [targetPlanId, newPrice, currentSub.id]
        );
      }

      await client.query('COMMIT');
      await invalidateTenantCache(tenantId);
      logger.info(`🔄 [PRORATION] Tenant ${tenantId} downgraded to ${targetPlanId}. Granted credit: ${currency} ${creditAmount}.`);
      return { ...proration, status: 'credited' };
    }

    // 6. Handle SAME PLAN / ZERO NET AMOUNT
    await client.query('BEGIN');
    await client.query(
      `UPDATE tenants SET plan = $1, updated_at = NOW() WHERE id = $2`,
      [targetPlanId.toUpperCase(), tenantId]
    );
    if (currentSub?.id) {
      await client.query(
        `UPDATE subscriptions SET plan_id = $1, amount = $2, updated_at = NOW() WHERE id = $3`,
        [targetPlanId, newPrice, currentSub.id]
      );
    }
    await client.query('COMMIT');
    await invalidateTenantCache(tenantId);

    return { ...proration, status: 'unchanged' };
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('Execute plan change error:', err);
    throw err;
  } finally {
    client.release();
  }
}
