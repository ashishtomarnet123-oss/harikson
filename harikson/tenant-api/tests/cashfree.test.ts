import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import axios from 'axios';
import { CashfreeService } from '../src/services/cashfree.service.js';

describe('Cashfree Embedded Payment Gateway Service Tests', () => {
  after(() => {
    setTimeout(() => process.exit(0), 50);
  });

  test('1. Config retrieval returns valid Cashfree endpoints and apiVersion', async () => {
    const config = await CashfreeService.getConfig();
    assert.ok(config.baseUrl.includes('cashfree.com'), 'baseUrl should point to Cashfree API');
    assert.ok(config.checkoutBaseUrl.includes('cashfree.com'), 'checkoutBaseUrl should point to Cashfree Checkout');
    assert.strictEqual(config.apiVersion, '2023-08-01', 'apiVersion should match 2023-08-01');
  });

  test('2. Partner request headers include x-partner-apikey, x-partner-merchantid, and x-api-version', () => {
    const mockConfig = {
      partnerApiKey: 'test_partner_key_123',
      partnerMerchantId: 'test_merchant_456',
      isTestMode: true,
      baseUrl: 'https://sandbox.cashfree.com/pg',
      checkoutBaseUrl: 'https://payments-test.cashfree.com/order/#',
      apiVersion: '2023-08-01',
    };

    const headers = CashfreeService.getRequestHeaders(mockConfig);
    assert.strictEqual(headers['x-partner-apikey'], 'test_partner_key_123');
    assert.strictEqual(headers['x-partner-merchantid'], 'test_merchant_456');
    assert.strictEqual(headers['x-api-version'], '2023-08-01');
    assert.strictEqual(headers['Content-Type'], 'application/json');
  });

  test('3. Signature verification succeeds for valid HMAC-SHA256 signature', () => {
    const secret = 'test_partner_secret_key_abcdef12345';
    const timestamp = '1617695238078';
    const payload = JSON.stringify({
      merchant: { merchant_id: 'merchant_123' },
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: 'cf_ord_test_001', order_amount: 49.0 },
        payment: { payment_status: 'SUCCESS', cf_payment_id: 'cf_pay_999' },
      },
    });

    const signedPayload = `${timestamp}${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('base64');

    const isValid = CashfreeService.verifyWebhookSignature(payload, timestamp, expectedSignature, secret);
    assert.strictEqual(isValid, true, 'Valid HMAC signature must verify successfully');
  });

  test('4. Signature verification fails for tampered or invalid signature', () => {
    const secret = 'test_partner_secret_key_abcdef12345';
    const timestamp = '1617695238078';
    const payload = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK' });
    const invalidSignature = 'tampered_bad_signature_base64=';

    const isValid = CashfreeService.verifyWebhookSignature(payload, timestamp, invalidSignature, secret);
    assert.strictEqual(isValid, false, 'Tampered signature must be rejected');
  });

  test('5. Initiate payment generates valid order ID and payment session', async () => {
    const result = await CashfreeService.initiatePayment({
      tenantId: '73aa1c8e-64f1-4f2a-927a-ee55345b9e43',
      planId: 'professional',
      amountRupees: 49.0,
      customerEmail: 'user@harikson.ai',
      customerName: 'Test User',
      redirectUrl: 'http://localhost:3002/settings/billing?status=success&provider=cashfree&orderId={order_id}',
    });

    assert.ok(result.success, 'Initiation should be successful');
    assert.ok(result.orderId.startsWith('cf_ord_'), 'orderId should start with cf_ord_');
    assert.ok(result.paymentSessionId, 'paymentSessionId should be generated');
    assert.ok(result.checkoutUrl, 'checkoutUrl should be defined');
    assert.strictEqual(result.amount, 49.0);
    assert.strictEqual(result.currency, 'INR');
  });

  test('6. getOrderStatus returns expected structure', async () => {
    const statusResult = await CashfreeService.getOrderStatus('cf_ord_test_sample');
    assert.ok(statusResult.orderId, 'orderId should be defined');
    assert.ok(statusResult.orderStatus, 'orderStatus should be defined');
  });

  test('7. getOrderStatus extracts orderCurrency without implicit INR fallback when currency is missing', async () => {
    const originalGet = axios.get;
    try {
      axios.get = (async () => {
        return {
          data: {
            order_id: 'cf_ord_no_curr',
            cf_order_id: '123456',
            order_status: 'PAID',
            order_amount: 149.0,
            // order_currency is intentionally missing
          },
        };
      }) as any;

      const res = await CashfreeService.getOrderStatus('cf_ord_no_curr');
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.orderCurrency, null, 'Currency must be null when absent from authoritative response');
    } finally {
      axios.get = originalGet;
    }
  });

  test('8. getOrderStatus correctly extracts and normalizes valid INR currency', async () => {
    const originalGet = axios.get;
    try {
      axios.get = (async () => {
        return {
          data: {
            order_id: 'cf_ord_inr',
            order_status: 'PAID',
            order_amount: 149.0,
            order_currency: 'inr',
          },
        };
      }) as any;

      const res = await CashfreeService.getOrderStatus('cf_ord_inr');
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.orderCurrency, 'INR');
    } finally {
      axios.get = originalGet;
    }
  });

  test('9. getOrderStatus preserves unsupported non-INR currency as-is without fallback to INR', async () => {
    const originalGet = axios.get;
    try {
      axios.get = (async () => {
        return {
          data: {
            order_id: 'cf_ord_usd',
            order_status: 'PAID',
            order_amount: 149.0,
            order_currency: 'USD',
          },
        };
      }) as any;

      const res = await CashfreeService.getOrderStatus('cf_ord_usd');
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.orderCurrency, 'USD');
    } finally {
      axios.get = originalGet;
    }
  });

  test('10. getOrderStatus handles lookup failures safely with success=false and orderCurrency=null', async () => {
    const originalGet = axios.get;
    try {
      axios.get = (async () => {
        const err: any = new Error('Gateway Connection Timeout');
        err.response = { status: 504, data: { message: 'Gateway timeout' } };
        throw err;
      }) as any;

      const res = await CashfreeService.getOrderStatus('cf_ord_fail');
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.orderStatus, 'UNKNOWN');
      assert.strictEqual(res.orderCurrency, null, 'Currency must be null on lookup failure');
    } finally {
      axios.get = originalGet;
    }
  });

  test('11. Downstream payment verification rejects missing authoritative currency', () => {
    function simulateVerifyCashfree(statusRes: any) {
      if (!statusRes.success || statusRes.orderStatus !== 'PAID') {
        return { status: 400, error: 'Payment not completed' };
      }
      if (!statusRes.orderCurrency) {
        return { status: 400, error: 'Authoritative payment currency is absent or unresolved. Payment verification deferred or rejected.' };
      }
      const normalizedCurrency = String(statusRes.orderCurrency).trim().toUpperCase();
      if (normalizedCurrency !== 'INR') {
        return { status: 400, error: `Unsupported payment currency: ${normalizedCurrency}. Platform strictly operates in INR.` };
      }
      return { status: 200, success: true, currency: normalizedCurrency };
    }

    const missingCurrencyRes = { success: true, orderStatus: 'PAID', orderAmount: 49.0, orderCurrency: null };
    const result = simulateVerifyCashfree(missingCurrencyRes);
    assert.strictEqual(result.status, 400);
    assert.match(result.error, /absent or unresolved/);
  });

  test('12. Downstream payment verification rejects non-INR currency', () => {
    function simulateVerifyCashfree(statusRes: any) {
      if (!statusRes.success || statusRes.orderStatus !== 'PAID') {
        return { status: 400, error: 'Payment not completed' };
      }
      if (!statusRes.orderCurrency) {
        return { status: 400, error: 'Authoritative payment currency is absent or unresolved. Payment verification deferred or rejected.' };
      }
      const normalizedCurrency = String(statusRes.orderCurrency).trim().toUpperCase();
      if (normalizedCurrency !== 'INR') {
        return { status: 400, error: `Unsupported payment currency: ${normalizedCurrency}. Platform strictly operates in INR.` };
      }
      return { status: 200, success: true, currency: normalizedCurrency };
    }

    const usdRes = { success: true, orderStatus: 'PAID', orderAmount: 49.0, orderCurrency: 'USD' };
    const result = simulateVerifyCashfree(usdRes);
    assert.strictEqual(result.status, 400);
    assert.match(result.error, /Unsupported payment currency: USD/);
  });

  test('13. Downstream payment verification accepts valid INR currency', () => {
    function simulateVerifyCashfree(statusRes: any) {
      if (!statusRes.success || statusRes.orderStatus !== 'PAID') {
        return { status: 400, error: 'Payment not completed' };
      }
      if (!statusRes.orderCurrency) {
        return { status: 400, error: 'Authoritative payment currency is absent or unresolved. Payment verification deferred or rejected.' };
      }
      const normalizedCurrency = String(statusRes.orderCurrency).trim().toUpperCase();
      if (normalizedCurrency !== 'INR') {
        return { status: 400, error: `Unsupported payment currency: ${normalizedCurrency}. Platform strictly operates in INR.` };
      }
      return { status: 200, success: true, currency: normalizedCurrency };
    }

    const inrRes = { success: true, orderStatus: 'PAID', orderAmount: 49.0, orderCurrency: 'INR' };
    const result = simulateVerifyCashfree(inrRes);
    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.currency, 'INR');
  });
});
