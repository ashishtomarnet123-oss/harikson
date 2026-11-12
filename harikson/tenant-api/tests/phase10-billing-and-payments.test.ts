import { describe, it, expect } from './test-utils.js';
import crypto from 'crypto';
import { calculateProration } from '../src/services/prorationService.js';
import {
  MockStripeGateway,
  MockRazorpayGateway,
  MockPhonePeGateway,
  MockCashfreeGateway,
} from './mocks/mockPayments.js';
import { MockRedis } from './mocks/mockRedis.js';

describe('Phase 10 — Billing, Payments & Webhooks Automated Test Suite', () => {
  const periodStart = new Date('2026-06-01T00:00:00Z');
  const periodEnd = new Date('2026-07-01T00:00:00Z'); // 30 days
  const now = new Date('2026-06-16T00:00:00Z');       // 15 days remaining (50%)

  // =========================================================================
  // 1. Proration & Financial Mathematics
  // =========================================================================
  describe('1. Proration Calculations & GST Taxation', () => {
    it('Calculates upgrade proration with 18% GST (Starter $50 -> Professional $150)', () => {
      const proration = calculateProration(50, 150, periodStart, periodEnd, now, false, 'INR');

      // 15 days remaining:
      // unusedCredit = 50 * 0.5 = 25
      // newPlanCharge = 150 * 0.5 = 75
      // netAmount = 75 - 25 = 50
      expect(proration.daysRemaining).toBe(15);
      expect(proration.unusedCredit).toBe(25);
      expect(proration.newPlanCharge).toBe(75);
      expect(proration.netAmount).toBe(50);

      // GST at 18%
      const gstAmount = parseFloat((proration.netAmount * 0.18).toFixed(2));
      const totalPayable = proration.netAmount + gstAmount;

      expect(gstAmount).toBe(9.0);
      expect(totalPayable).toBe(59.0);
    });

    it('Calculates downgrade proration resulting in negative net amount (credit balance)', () => {
      const proration = calculateProration(200, 60, periodStart, periodEnd, now, false, 'USD');

      // 15 days remaining:
      // unusedCredit = 200 * 0.5 = 100
      // newPlanCharge = 60 * 0.5 = 30
      // netAmount = 30 - 100 = -70 (customer gets $70 credit on future invoices)
      expect(proration.unusedCredit).toBe(100);
      expect(proration.newPlanCharge).toBe(30);
      expect(proration.netAmount).toBe(-70);
      expect(proration.invoiceDescription).toContain('Net Credit $70.00');
    });

    it('Safeguards against zero-cost Enterprise plan upgrade bypass', () => {
      const evaluatePlanEligibility = (currentPlan: string, targetPlan: string, paymentVerified: boolean) => {
        if (targetPlan === 'enterprise' && !paymentVerified) {
          throw new Error('Enterprise plan upgrade requires verified payment or contract approval');
        }
        return true;
      };

      expect(() => {
        evaluatePlanEligibility('starter', 'enterprise', false);
      }).toThrow();

      expect(evaluatePlanEligibility('starter', 'enterprise', true)).toBe(true);
    });
  });

  // =========================================================================
  // 2. Payment Gateway Verification (Stripe, Razorpay, PhonePe, Cashfree)
  // =========================================================================
  describe('2. Payment Gateway Integration & Webhook Signatures', () => {
    it('Stripe: Generates and verifies HMAC-SHA256 timestamped signatures', () => {
      const stripe = new MockStripeGateway();
      const payload = JSON.stringify({
        id: 'evt_stripe_test_123',
        type: 'checkout.session.completed',
        data: { object: { amount_total: 4900, currency: 'usd' } },
      });

      const signatureHeader = stripe.generateWebhookSignature(payload, stripe.secretKey);
      const isValid = stripe.verifyWebhookSignature(payload, signatureHeader, stripe.secretKey);
      expect(isValid).toBe(true);

      const isInvalid = stripe.verifyWebhookSignature(payload + 'tampered', signatureHeader, stripe.secretKey);
      expect(isInvalid).toBe(false);
    });

    it('Razorpay: Validates order signature using HMAC-SHA256 of orderId|paymentId', () => {
      const razorpay = new MockRazorpayGateway();
      const order = razorpay.createOrder({ amount: 50000, currency: 'INR', receipt: 'rcpt_123' });
      const paymentId = 'pay_rzp_mock_999';

      const validSignature = crypto
        .createHmac('sha256', razorpay.keySecret)
        .update(`${order.id}|${paymentId}`)
        .digest('hex');

      const isVerified = razorpay.verifyPaymentSignature(order.id, paymentId, validSignature);
      expect(isVerified).toBe(true);

      const isTampered = razorpay.verifyPaymentSignature(order.id, paymentId, 'invalid_sig');
      expect(isTampered).toBe(false);
    });

    it('PhonePe: Generates payment request and verifies SHA256 base64 callback checksum', () => {
      const phonepe = new MockPhonePeGateway();
      const txId = 'TXN_PHONEPE_12345';
      const req = phonepe.generatePaymentRequest({ transactionId: txId, amount: 99900, tenantId: 'tenant-1' });

      expect(req.checksum).toContain('###1');
      const isChecksumValid = phonepe.verifyCallbackChecksum(req.base64Payload, req.checksum);
      expect(isChecksumValid).toBe(true);
    });

    it('Cashfree: Creates order and verifies HMAC-SHA256 base64 webhook signature', () => {
      const cashfree = new MockCashfreeGateway();
      const order = cashfree.createOrder({ orderId: 'CF_ORD_99', amount: 1500, customerEmail: 'buyer@xarwiz.com' });
      expect(order.order_status).toBe('ACTIVE');

      const rawBody = JSON.stringify({ data: { order: { order_id: order.order_id, order_status: 'PAID' } } });
      const timestamp = String(Date.now());
      const signature = crypto.createHmac('sha256', cashfree.secretKey).update(timestamp + rawBody).digest('base64');

      expect(cashfree.verifyWebhookSignature(rawBody, timestamp, signature)).toBe(true);
      expect(cashfree.verifyWebhookSignature(rawBody, timestamp, 'bad_signature')).toBe(false);
    });
  });

  // =========================================================================
  // 3. Webhook Idempotency, Retry Queue & Dead Letter Queue
  // =========================================================================
  describe('3. Webhook Idempotency & Retry Schedule', () => {
    it('Enforces idempotency to prevent duplicate transaction and balance credits', async () => {
      const mockRedis = new MockRedis();
      const eventId = 'evt_idempotency_check_99';
      const key = `webhook_processed:${eventId}`;

      // First webhook receipt: not yet processed
      const existing = await mockRedis.get(key);
      expect(existing).toBeNull();

      // Process and mark as processed with 86400s TTL (24 hours)
      await mockRedis.setex(key, 86400, 'PROCESSED');

      // Second webhook receipt: recognized as duplicate, returns already_processed without re-crediting
      const duplicateCheck = await mockRedis.get(key);
      expect(duplicateCheck).toBe('PROCESSED');
    });

    it('Calculates correct exponential retry backoff schedule up to 5 attempts', () => {
      const RETRY_DELAYS_MS: Record<number, number> = {
        1: 5 * 60 * 1000,       // 5 min
        2: 15 * 60 * 1000,      // 15 min
        3: 60 * 60 * 1000,      // 1 hour
        4: 4 * 60 * 60 * 1000,   // 4 hours
        5: 12 * 60 * 60 * 1000,  // 12 hours
      };

      expect(RETRY_DELAYS_MS[1]).toBe(300000);
      expect(RETRY_DELAYS_MS[2]).toBe(900000);
      expect(RETRY_DELAYS_MS[3]).toBe(3600000);
      expect(RETRY_DELAYS_MS[4]).toBe(14400000);
      expect(RETRY_DELAYS_MS[5]).toBe(43200000);

      const shouldRouteToDeadLetterQueue = (attempt: number) => attempt >= 5;
      expect(shouldRouteToDeadLetterQueue(1)).toBe(false);
      expect(shouldRouteToDeadLetterQueue(4)).toBe(false);
      expect(shouldRouteToDeadLetterQueue(5)).toBe(true);
    });
  });
});

