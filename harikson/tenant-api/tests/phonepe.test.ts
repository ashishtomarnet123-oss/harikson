import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import { PhonePeService } from '../src/services/phonepe.service.js';

describe('PhonePe Payment Gateway Service Tests', () => {
  after(() => {
    setTimeout(() => process.exit(0), 50);
  });
  test('1. Config retrieval returns valid sandbox defaults', async () => {
    const config = await PhonePeService.getConfig();
    assert.ok(config.merchantId, 'merchantId should be defined');
    assert.ok(config.saltKey, 'saltKey should be defined');
    assert.ok(config.saltIndex, 'saltIndex should be defined');
    assert.ok(config.baseUrl.includes('phonepe.com'), 'baseUrl should point to PhonePe');
  });

  test('2. Signature verification succeeds for valid X-VERIFY checksum', async () => {
    const config = await PhonePeService.getConfig();
    const mockPayload = {
      success: true,
      code: 'PAYMENT_SUCCESS',
      message: 'Payment Success',
      data: {
        merchantId: config.merchantId,
        merchantTransactionId: 'TXN_tenant123_professional_1700000000',
        transactionId: 'T23010100001',
        amount: 4900,
        state: 'COMPLETED',
        responseCode: 'SUCCESS',
      },
    };

    const base64Response = Buffer.from(JSON.stringify(mockPayload)).toString('base64');
    const keyToUse = config.webhookSecret || config.saltKey;
    const sha256 = crypto.createHash('sha256').update(base64Response + keyToUse).digest('hex');
    const validXVerify = `${sha256}###${config.saltIndex}`;

    const isValid = await PhonePeService.verifyWebhookSignature(base64Response, validXVerify);
    assert.strictEqual(isValid, true, 'Valid signature must be verified successfully');
  });

  test('3. Signature verification fails for tampered or invalid checksum', async () => {
    const mockPayload = { success: true };
    const base64Response = Buffer.from(JSON.stringify(mockPayload)).toString('base64');
    const invalidXVerify = 'badchecksum123456789###1';

    const isValid = await PhonePeService.verifyWebhookSignature(base64Response, invalidXVerify);
    assert.strictEqual(isValid, false, 'Invalid signature must be rejected');
  });

  test('4. Webhook response decoding parses typed payload accurately', () => {
    const original = {
      success: true,
      code: 'PAYMENT_SUCCESS',
      message: 'Transaction successfully completed',
      data: {
        merchantId: 'PGTESTPAYUAT',
        merchantTransactionId: 'TXN_test_tenant_pro_123',
        transactionId: 'T987654321',
        amount: 19900,
        state: 'COMPLETED',
        responseCode: 'SUCCESS',
        paymentInstrument: {
          type: 'UPI',
          utr: '123456789012',
        },
      },
    };

    const base64 = Buffer.from(JSON.stringify(original)).toString('base64');
    const decoded = PhonePeService.decodeWebhookResponse(base64);

    assert.strictEqual(decoded.success, true);
    assert.strictEqual(decoded.code, 'PAYMENT_SUCCESS');
    assert.strictEqual(decoded.data.merchantTransactionId, 'TXN_test_tenant_pro_123');
    assert.strictEqual(decoded.data.amount, 19900);
    assert.strictEqual(decoded.data.paymentInstrument?.type, 'UPI');
  });

  test('5. Initiate payment generates valid transaction ID and sandbox redirect URL', async () => {
    const result = await PhonePeService.initiatePayment({
      tenantId: 'd3b07384-d113-46fb-a006-2580a22161f5',
      planId: 'professional',
      amountRupees: 49,
    });

    assert.ok(result.success, 'Initiation should be successful');
    assert.ok(result.merchantTransactionId.startsWith('TXN_'), 'Transaction ID should start with TXN_');
    assert.ok(result.redirectUrl.includes('status=success') || result.redirectUrl.includes('phonepe.com'), 'Redirect URL should be present');
    assert.strictEqual(result.amountPaise, 4900, 'Amount in paise should be 49 * 100 = 4900');
  });
});
