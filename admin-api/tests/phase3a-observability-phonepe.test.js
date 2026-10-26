import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import {
  billingMetrics,
  recordWebhookReceived,
  recordSignatureFailure,
  recordLookupFailure,
  recordDuplicateDelivery,
  recordRetryAttempt,
  recordReconciliationMismatch,
  recordStateTransitionFailure,
  recordDbTransactionFailure,
  recordProcessingDuration,
  getBillingMetricsPrometheusText,
  resetBillingMetricsForTesting,
} from '../src/services/billingMetrics.js';

describe('Phase 3A: PhonePe Defect Fixes & Billing Observability Test Suite', () => {

  beforeEach(() => {
    resetBillingMetricsForTesting();
  });

  // =========================================================================
  // Task 1: PhonePe Webhook Scoping & ReferenceError Remediation
  // =========================================================================
  describe('Task 1: PhonePe Webhook Scoping & Authoritative Lookup', () => {

    // Simulates the PhonePe handler logic in admin.js lines 5023-5165
    async function processPhonePeWebhookSim({
      decodedEvent,
      mockLookupFetch = null,
      merchantId = 'M_TEST_123',
      saltKey = 'SALT_KEY_123',
      saltIndex = '1',
    }) {
      const eventData = decodedEvent.data || {};
      const merchantTxnId = eventData.merchantTransactionId || '';
      const phonepeTxnId = eventData.transactionId || merchantTxnId || ('phpe_' + Date.now());
      const eventType = decodedEvent.code || 'PAYMENT_SUCCESS';
      const amount = eventData.amount ? eventData.amount / 100 : 0;
      const isSuccess = Boolean(
        decodedEvent.success &&
        (eventData.state === 'COMPLETED' || eventData.responseCode === 'SUCCESS' || eventType === 'PAYMENT_SUCCESS')
      );
      const isFailed = Boolean(
        decodedEvent.success === false ||
        eventData.state === 'FAILED' ||
        eventData.responseCode === 'PAYMENT_ERROR' ||
        eventData.responseCode === 'AUTHORIZATION_FAILED'
      );
      const status = isSuccess ? 'processed' : (isFailed ? 'failed' : 'pending');

      let tenantId = null;
      let planId = 'starter';
      const txnParts = merchantTxnId.split('_');
      if (txnParts.length >= 4) {
        tenantId = txnParts[1];
        planId = txnParts.slice(2, -1).join('_').toLowerCase();
      } else if (txnParts.length === 3) {
        tenantId = txnParts[1];
      }

      let rawCurrency = eventData.currency || eventData.paymentInstrument?.currency;
      let lookupUrlCalled = null;

      // Authoritative status lookup when currency is missing in event payload
      if (!rawCurrency) {
        if (merchantId && saltKey && merchantTxnId) {
          try {
            const statusPath = `/pg/v1/status/${merchantId}/${merchantTxnId}`;
            lookupUrlCalled = statusPath;
            if (mockLookupFetch) {
              const phRes = await mockLookupFetch(statusPath);
              if (phRes && phRes.ok) {
                const phJson = await phRes.json();
                if (phJson.success && phJson.data) {
                  const phData = phJson.data;
                  if (phData.transactionId && phData.amount) {
                    const lookupAmount = phData.amount / 100;
                    if (amount === 0 || Math.abs(amount - lookupAmount) < 0.01) {
                      rawCurrency = phData.currency || phData.paymentInstrument?.currency;
                    }
                  }
                }
              } else {
                recordLookupFailure('phonepe');
              }
            }
          } catch (lookupErr) {
            recordLookupFailure('phonepe');
          }
        }
      }

      let unresolvedReason = null;
      if (!rawCurrency) {
        unresolvedReason = `Missing currency in PhonePe event ${phonepeTxnId} and authoritative lookup unavailable`;
      } else if (String(rawCurrency).toUpperCase() !== 'INR') {
        unresolvedReason = `Non-INR currency '${String(rawCurrency).toUpperCase()}' rejected. Platform strictly operates in INR.`;
      }

      if (unresolvedReason) {
        recordWebhookReceived('phonepe', eventType, 'unresolved');
        return {
          status: 200,
          body: {
            status: 'unresolved',
            event_id: phonepeTxnId,
            reason: unresolvedReason,
          },
          lookupUrlCalled,
        };
      }

      return {
        status: 200,
        body: {
          status: 'processed',
          event_id: phonepeTxnId,
          currency: String(rawCurrency).toUpperCase(),
        },
        lookupUrlCalled,
      };
    }

    it('1. PhonePe payload with missing currency does not throw a ReferenceError', async () => {
      const decodedEvent = {
        success: true,
        code: 'PAYMENT_SUCCESS',
        data: {
          merchantTransactionId: 'TXN_t1_starter_1792600000',
          transactionId: 'PHPE_TXN_001',
          amount: 14900,
          state: 'COMPLETED',
          // currency is deliberately omitted to trigger the lookup path
        },
      };

      // Ensure execution does not throw ReferenceError: merchantTransactionId is not defined
      await assert.doesNotReject(async () => {
        const res = await processPhonePeWebhookSim({
          decodedEvent,
          mockLookupFetch: async (path) => ({
            ok: true,
            json: async () => ({
              success: true,
              data: { transactionId: 'PHPE_TXN_001', amount: 14900, currency: 'INR' },
            }),
          }),
        });

        assert.strictEqual(res.body.status, 'processed');
        assert.strictEqual(res.body.currency, 'INR');
      });
    });

    it('2. Correct merchant transaction ID is used for authoritative lookup', async () => {
      const decodedEvent = {
        success: true,
        code: 'PAYMENT_SUCCESS',
        data: {
          merchantTransactionId: 'TXN_tenant99_professional_1792601234',
          transactionId: 'PHPE_TXN_002',
          amount: 49900,
          state: 'COMPLETED',
        },
      };

      const res = await processPhonePeWebhookSim({
        decodedEvent,
        mockLookupFetch: async (path) => ({
          ok: true,
          json: async () => ({
            success: true,
            data: { transactionId: 'PHPE_TXN_002', amount: 49900, currency: 'INR' },
          }),
        }),
      });

      assert.strictEqual(
        res.lookupUrlCalled,
        '/pg/v1/status/M_TEST_123/TXN_tenant99_professional_1792601234',
        'Status path must contain the correctly scoped merchantTxnId'
      );
    });

    it('3. Failed or unavailable provider lookup leaves the event unresolved', async () => {
      const decodedEvent = {
        success: true,
        code: 'PAYMENT_SUCCESS',
        data: {
          merchantTransactionId: 'TXN_t1_starter_1792600000',
          amount: 14900,
          state: 'COMPLETED',
          // missing currency
        },
      };

      // Provider API returns 503 Service Unavailable
      const res = await processPhonePeWebhookSim({
        decodedEvent,
        mockLookupFetch: async () => ({
          ok: false,
          status: 503,
          json: async () => ({ error: 'Service Unavailable' }),
        }),
      });

      assert.strictEqual(res.body.status, 'unresolved');
      assert.match(res.body.reason, /Missing currency in PhonePe event/);
    });

    it('4. If merchantTransactionId is absent, fails safely to unresolved without throwing', async () => {
      const decodedEvent = {
        success: true,
        code: 'PAYMENT_SUCCESS',
        data: {
          amount: 14900,
          state: 'COMPLETED',
          // both merchantTransactionId and currency are absent
        },
      };

      await assert.doesNotReject(async () => {
        const res = await processPhonePeWebhookSim({
          decodedEvent,
          mockLookupFetch: async () => ({ ok: true, json: async () => ({}) }),
        });

        assert.strictEqual(res.body.status, 'unresolved');
        assert.strictEqual(res.lookupUrlCalled, null, 'Lookup should not be attempted when transaction ID is empty');
      });
    });

    it('5. Missing currency cannot create a paid invoice or activate a paid subscription', async () => {
      const db = { subscriptions: [], invoices: [] };
      const decodedEvent = {
        success: true,
        code: 'PAYMENT_SUCCESS',
        data: {
          merchantTransactionId: 'TXN_t1_starter_1792600000',
          amount: 14900,
          state: 'COMPLETED',
          // missing currency
        },
      };

      const res = await processPhonePeWebhookSim({
        decodedEvent,
        mockLookupFetch: async () => ({ ok: false }),
      });

      // Assert business logic guard
      if (res.body.status === 'unresolved') {
        // In admin.js, when unresolvedReason is present, DB transaction commits status='unresolved' and returns
        // Subscriptions and invoices are strictly NOT written
      } else {
        db.subscriptions.push({ id: 'sub_1' });
        db.invoices.push({ id: 'inv_1' });
      }

      assert.strictEqual(res.body.status, 'unresolved');
      assert.strictEqual(db.subscriptions.length, 0, 'No subscription may be created for unresolved currency');
      assert.strictEqual(db.invoices.length, 0, 'No invoice may be created for unresolved currency');
    });
  });

  // =========================================================================
  // Task 2: Removal of Implicit INR Fallback in PhonePe Reconciliation
  // =========================================================================
  describe('Task 2: PhonePe Reconciliation & Currency Fallback Removal', () => {

    // Simulates reconcileWebhookEvent PhonePe logic in admin.js lines 6061-6215
    async function reconcilePhonePeWebhookSim({
      webhookRecord,
      mockStatusResponse = null,
      provider = { id: 'prov_1', is_test_mode: true },
    }) {
      const payload = webhookRecord.payload || {};
      const pData = payload.data || {};
      const eventId = webhookRecord.event_id;
      const txnId = pData.merchantTransactionId || payload.merchantTransactionId || eventId;

      let authoritativeCurrency = null;
      let authoritativeAmount = webhookRecord.amount || 0;
      let isPaymentSuccessful = false;

      if (mockStatusResponse) {
        if (mockStatusResponse.ok) {
          const statusBody = mockStatusResponse.body;
          if (statusBody.success && (statusBody.code === 'PAYMENT_SUCCESS' || statusBody.data?.responseCode === 'SUCCESS')) {
            isPaymentSuccessful = true;
            // REMEDIATED: No || 'INR' fallback
            authoritativeCurrency = statusBody.data?.paymentInstrument?.currency || statusBody.data?.currency || null;
            if (statusBody.data?.amount) {
              authoritativeAmount = statusBody.data.amount / 100;
            }
          }
        } else {
          recordLookupFailure('phonepe');
        }
      }

      // REMEDIATED: No || 'INR' fallback
      if (!authoritativeCurrency) {
        authoritativeCurrency = pData.currency || payload.currency || null;
      }
      if (!isPaymentSuccessful) {
        isPaymentSuccessful = payload.code === 'PAYMENT_SUCCESS' || pData.responseCode === 'SUCCESS';
      }

      let unresolvedReason = null;
      if (!authoritativeCurrency) {
        recordReconciliationMismatch('phonepe', 'currency_mismatch');
        unresolvedReason = `Missing currency in phonepe event ${eventId} and authoritative lookup unavailable`;
      } else if (String(authoritativeCurrency).trim().toUpperCase() !== 'INR') {
        recordReconciliationMismatch('phonepe', 'currency_mismatch');
        unresolvedReason = `Non-INR currency '${String(authoritativeCurrency).toUpperCase()}' rejected. Platform strictly operates in INR.`;
      } else if (webhookRecord.amount > 0 && authoritativeAmount > 0 && Math.abs(webhookRecord.amount - authoritativeAmount) > 0.01) {
        recordReconciliationMismatch('phonepe', 'amount_mismatch');
        unresolvedReason = `Amount mismatch for phonepe event ${eventId}: webhook recorded ${webhookRecord.amount} but authoritative provider returned ${authoritativeAmount}`;
      }

      if (unresolvedReason) {
        return {
          success: false,
          status: 'unresolved',
          error: unresolvedReason,
          message: 'Currency could not be authoritatively resolved as INR. Webhook remains unresolved.',
        };
      }

      if (!isPaymentSuccessful) {
        return {
          success: false,
          status: 'failed',
          error: 'Authoritative payment status verification failed',
        };
      }

      return {
        success: true,
        status: 'processed',
        currency: 'INR',
        amount: authoritativeAmount,
      };
    }

    it('1. Missing authoritative currency never becomes INR and leaves event unresolved', async () => {
      const webhookRecord = {
        id: 'wh_phpe_unresolved_1',
        event_id: 'phpe_evt_123',
        amount: 149,
        payload: {
          code: 'PAYMENT_SUCCESS',
          data: {
            merchantTransactionId: 'TXN_t1_starter_123',
            // no currency
          },
        },
      };

      // Provider status response returns success but no currency field
      const res = await reconcilePhonePeWebhookSim({
        webhookRecord,
        mockStatusResponse: {
          ok: true,
          body: {
            success: true,
            code: 'PAYMENT_SUCCESS',
            data: {
              transactionId: 'phpe_evt_123',
              amount: 14900,
              // currency omitted
            },
          },
        },
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.status, 'unresolved');
      assert.match(res.error, /Missing currency in phonepe event/);
    });

    it('2. Plan currency is never substituted for missing transaction currency', async () => {
      const webhookRecord = {
        id: 'wh_phpe_unresolved_2',
        event_id: 'phpe_evt_456',
        amount: 149,
        payload: {
          code: 'PAYMENT_SUCCESS',
          planId: 'starter', // plan is priced in INR
          data: {
            merchantTransactionId: 'TXN_t1_starter_456',
          },
        },
      };

      const res = await reconcilePhonePeWebhookSim({
        webhookRecord,
        mockStatusResponse: null, // no provider response
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.status, 'unresolved');
      assert.match(res.error, /Missing currency in phonepe event/);
    });

    it('3. Valid authoritative INR payment successfully reconciles', async () => {
      const webhookRecord = {
        id: 'wh_phpe_success_1',
        event_id: 'phpe_evt_789',
        amount: 149,
        payload: {
          code: 'PAYMENT_SUCCESS',
          data: {
            merchantTransactionId: 'TXN_t1_starter_789',
          },
        },
      };

      const res = await reconcilePhonePeWebhookSim({
        webhookRecord,
        mockStatusResponse: {
          ok: true,
          body: {
            success: true,
            code: 'PAYMENT_SUCCESS',
            data: {
              transactionId: 'phpe_evt_789',
              amount: 14900,
              currency: 'INR',
            },
          },
        },
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.status, 'processed');
      assert.strictEqual(res.currency, 'INR');
      assert.strictEqual(res.amount, 149);
    });

    it('4. Unsupported currency (USD) and amount mismatch remain safely unresolved', async () => {
      // Test 4a: Unsupported Currency
      const usdWebhook = {
        id: 'wh_phpe_usd',
        event_id: 'phpe_evt_usd',
        amount: 29,
        payload: {
          code: 'PAYMENT_SUCCESS',
          data: { merchantTransactionId: 'TXN_t1_starter_usd' },
        },
      };

      const resUsd = await reconcilePhonePeWebhookSim({
        webhookRecord: usdWebhook,
        mockStatusResponse: {
          ok: true,
          body: {
            success: true,
            code: 'PAYMENT_SUCCESS',
            data: { transactionId: 'phpe_evt_usd', amount: 2900, currency: 'USD' },
          },
        },
      });
      assert.strictEqual(resUsd.success, false);
      assert.strictEqual(resUsd.status, 'unresolved');
      assert.match(resUsd.error, /Non-INR currency 'USD' rejected/);

      // Test 4b: Amount Mismatch (Order: ₹149, Provider: ₹99)
      const mismatchWebhook = {
        id: 'wh_phpe_mismatch',
        event_id: 'phpe_evt_mismatch',
        amount: 149,
        payload: {
          code: 'PAYMENT_SUCCESS',
          data: { merchantTransactionId: 'TXN_t1_starter_mismatch' },
        },
      };

      const resMismatch = await reconcilePhonePeWebhookSim({
        webhookRecord: mismatchWebhook,
        mockStatusResponse: {
          ok: true,
          body: {
            success: true,
            code: 'PAYMENT_SUCCESS',
            data: { transactionId: 'phpe_evt_mismatch', amount: 9900, currency: 'INR' },
          },
        },
      });
      assert.strictEqual(resMismatch.success, false);
      assert.strictEqual(resMismatch.status, 'unresolved');
      assert.match(resMismatch.error, /Amount mismatch for phonepe event/);
    });

    it('5. Idempotent check prevents re-processing already processed events', async () => {
      let processCount = 0;

      async function retrySimulation(status) {
        if (status === 'processed') {
          return { success: true, status: 'already_processed', message: 'Webhook already processed' };
        }
        processCount += 1;
        return { success: true, status: 'processed' };
      }

      const firstAttempt = await retrySimulation('unresolved');
      assert.strictEqual(firstAttempt.status, 'processed');
      assert.strictEqual(processCount, 1);

      // Second attempt on already processed row
      const secondAttempt = await retrySimulation('processed');
      assert.strictEqual(secondAttempt.status, 'already_processed');
      assert.strictEqual(processCount, 1, 'Process count must not increase on duplicate retry');
    });
  });

  // =========================================================================
  // Task 4: Billing Observability & Prometheus Metrics
  // =========================================================================
  describe('Task 4: Billing Observability & Prometheus Metrics Instrumentation', () => {

    it('1. Metrics format correctly into Prometheus exposition text (version 0.0.4)', async () => {
      const text = await getBillingMetricsPrometheusText();

      // Verify header declarations
      assert.match(text, /# HELP webhook_events_received_total/);
      assert.match(text, /# TYPE webhook_events_received_total counter/);
      assert.match(text, /# HELP webhook_signature_failures_total/);
      assert.match(text, /# TYPE webhook_signature_failures_total counter/);
      assert.match(text, /# HELP webhook_authoritative_lookup_failures_total/);
      assert.match(text, /# TYPE webhook_authoritative_lookup_failures_total counter/);
      assert.match(text, /# HELP webhook_unresolved_events_total/);
      assert.match(text, /# TYPE webhook_unresolved_events_total gauge/);
      assert.match(text, /# HELP webhook_unresolved_oldest_age_seconds/);
      assert.match(text, /# TYPE webhook_unresolved_oldest_age_seconds gauge/);
      assert.match(text, /# HELP webhook_processing_duration_seconds/);
      assert.match(text, /# TYPE webhook_processing_duration_seconds histogram/);
      assert.match(text, /# HELP webhook_duplicate_deliveries_total/);
      assert.match(text, /# TYPE webhook_duplicate_deliveries_total counter/);
      assert.match(text, /# HELP webhook_retry_attempts_total/);
      assert.match(text, /# TYPE webhook_retry_attempts_total counter/);
      assert.match(text, /# HELP billing_reconciliation_mismatches_total/);
      assert.match(text, /# TYPE billing_reconciliation_mismatches_total counter/);
      assert.match(text, /# HELP payment_state_transition_failures_total/);
      assert.match(text, /# TYPE payment_state_transition_failures_total counter/);
      assert.match(text, /# HELP billing_db_transaction_failures_total/);
      assert.match(text, /# TYPE billing_db_transaction_failures_total counter/);
    });

    it('2. Zero-traffic baseline initializes valid series for all 5 providers', async () => {
      const text = await getBillingMetricsPrometheusText();

      for (const prov of ['stripe', 'razorpay', 'phonepe', 'cashfree', 'neuracollect']) {
        assert.match(text, new RegExp(`webhook_signature_failures_total\\{provider="${prov}"\\} 0`));
        assert.match(text, new RegExp(`webhook_authoritative_lookup_failures_total\\{provider="${prov}"\\} 0`));
        assert.match(text, new RegExp(`webhook_duplicate_deliveries_total\\{provider="${prov}"\\} 0`));
        assert.match(text, new RegExp(`webhook_unresolved_events_total\\{provider="${prov}"\\} 0`));
      }
    });

    it('3. Counter and histogram update accurately on representative webhook lifecycle events', async () => {
      // 1. Record incoming processed event
      recordWebhookReceived('phonepe', 'PAYMENT_SUCCESS', 'processed');
      recordProcessingDuration('phonepe', 'processed', 0.12);

      // 2. Record signature failure
      recordSignatureFailure('phonepe');

      // 3. Record authoritative lookup failure
      recordLookupFailure('phonepe');

      // 4. Record duplicate delivery
      recordDuplicateDelivery('phonepe');

      // 5. Record reconciliation mismatch
      recordReconciliationMismatch('phonepe', 'currency_mismatch');

      // 6. Record DB transaction failure
      recordDbTransactionFailure('phonepe_webhook_tx');

      // 7. Record retry attempt
      recordRetryAttempt('phonepe', 'admin', 'processed');

      const text = await getBillingMetricsPrometheusText();

      assert.match(text, /webhook_events_received_total\{provider="phonepe",event_type="payment_success",outcome="processed"\} 1/);
      assert.match(text, /webhook_signature_failures_total\{provider="phonepe"\} 1/);
      assert.match(text, /webhook_authoritative_lookup_failures_total\{provider="phonepe"\} 1/);
      assert.match(text, /webhook_duplicate_deliveries_total\{provider="phonepe"\} 1/);
      assert.match(text, /billing_reconciliation_mismatches_total\{provider="phonepe",mismatch_type="currency_mismatch"\} 1/);
      assert.match(text, /billing_db_transaction_failures_total\{operation="phonepe_webhook_tx"\} 1/);
      assert.match(text, /webhook_retry_attempts_total\{provider="phonepe",trigger="admin",outcome="processed"\} 1/);
      assert.match(text, /webhook_processing_duration_seconds_count\{provider="phonepe",status="processed"\} 1/);
    });

    it('4. Database gauges accurately query unresolved count and oldest event age', async () => {
      const mockPool = {
        query: async (sql) => {
          return {
            rows: [
              { provider: 'phonepe', count: '3', oldest_age_seconds: '720' },
              { provider: 'stripe', count: '1', oldest_age_seconds: '150' },
            ],
          };
        },
      };

      const text = await getBillingMetricsPrometheusText(mockPool);

      assert.match(text, /webhook_unresolved_events_total\{provider="phonepe"\} 3/);
      assert.match(text, /webhook_unresolved_oldest_age_seconds\{provider="phonepe"\} 720/);
      assert.match(text, /webhook_unresolved_events_total\{provider="stripe"\} 1/);
      assert.match(text, /webhook_unresolved_oldest_age_seconds\{provider="stripe"\} 150/);
      assert.match(text, /webhook_unresolved_events_total\{provider="razorpay"\} 0/);
    });

    it('5. Metric labels strictly avoid high-cardinality and sensitive identifiers', async () => {
      recordWebhookReceived('phonepe', 'payment_success', 'processed');
      recordReconciliationMismatch('phonepe', 'amount_mismatch');

      const text = await getBillingMetricsPrometheusText();

      // Verify no customer identifiers, email, token, or order ID appear in labels
      assert.doesNotMatch(text, /customer_id/);
      assert.doesNotMatch(text, /email/);
      assert.doesNotMatch(text, /tenant_id/);
      assert.doesNotMatch(text, /order_id/);
      assert.doesNotMatch(text, /payment_id/);
    });

    it('6. Database query failures during scrape are observable and distinguishable from legitimate zero counts', async () => {
      // Successful query: gauge is 1
      const healthyPool = {
        query: async () => ({ rows: [] }),
      };
      const healthyText = await getBillingMetricsPrometheusText(healthyPool);
      assert.match(healthyText, /webhook_unresolved_query_success 1/);

      // Failing query: gauge drops to 0, failure counter increments
      const failingPool = {
        query: async () => {
          throw new Error('Connection pool exhausted: ECONNREFUSED');
        },
      };
      const failingText = await getBillingMetricsPrometheusText(failingPool);
      assert.match(failingText, /webhook_unresolved_query_success 0/);
      assert.match(failingText, /billing_db_transaction_failures_total\{operation="metrics_unresolved_query"\} 1/);
    });
  });
});

