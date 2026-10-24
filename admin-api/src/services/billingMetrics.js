/**
 * Billing Observability & Prometheus Metrics Service
 *
 * Implements bounded-cardinality financial and webhook metrics according to Prometheus 0.0.4 text format.
 * Strictly avoids customer IDs, tenant IDs, email addresses, order IDs, or unvetted strings.
 */

const KNOWN_PROVIDERS = ['stripe', 'razorpay', 'phonepe', 'cashfree', 'neuracollect'];
const HISTOGRAM_BUCKETS = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]; // seconds

function sanitizeProvider(prov) {
  if (!prov) return 'unknown';
  const p = String(prov).toLowerCase().trim();
  return KNOWN_PROVIDERS.includes(p) ? p : 'other';
}

function sanitizeEventType(type) {
  if (!type) return 'unknown';
  const clean = String(type).toLowerCase().replace(/[^a-z0-9_.]/g, '_').slice(0, 40);
  return clean || 'unknown';
}

function sanitizeOutcome(outcome) {
  const allowed = ['processed', 'unresolved', 'failed', 'already_processed'];
  const o = String(outcome).toLowerCase().trim();
  return allowed.includes(o) ? o : 'unknown';
}

class BillingMetricsStore {
  constructor() {
    this.reset();
  }

  reset() {
    // 1. Webhook events received: key = `${provider}|${eventType}|${outcome}` -> count
    this.eventsReceived = new Map();

    // 2. Signature verification failures: key = `${provider}` -> count
    this.signatureFailures = new Map();

    // 3. Authoritative lookup failures: key = `${provider}` -> count
    this.lookupFailures = new Map();

    // 4. Duplicate deliveries: key = `${provider}` -> count
    this.duplicates = new Map();

    // 5. Retry attempts: key = `${provider}|${trigger}|${outcome}` -> count
    this.retries = new Map();

    // 6. Reconciliation mismatches: key = `${provider}|${mismatchType}` -> count
    this.reconciliationMismatches = new Map();

    // 7. State transition failures: key = `${provider}|${fromState}|${toState}` -> count
    this.stateTransitionFailures = new Map();

    // 8. DB transaction failures: key = `${operation}` -> count
    this.dbFailures = new Map();

    // 9. Processing duration histogram: key = `${provider}|${status}` -> { buckets: Map(le -> count), sum: number, count: number }
    this.durations = new Map();

    // Initialize baseline 0-counters for all 5 providers so Prometheus never encounters missing series
    for (const p of KNOWN_PROVIDERS) {
      this.signatureFailures.set(p, 0);
      this.lookupFailures.set(p, 0);
      this.duplicates.set(p, 0);
      for (const outcome of ['processed', 'unresolved', 'failed', 'already_processed']) {
        this.eventsReceived.set(`${p}|standard|${outcome}`, 0);
      }
    }
  }

  recordWebhookReceived(provider, eventType, outcome) {
    const p = sanitizeProvider(provider);
    const et = sanitizeEventType(eventType);
    const oc = sanitizeOutcome(outcome);
    const key = `${p}|${et}|${oc}`;
    this.eventsReceived.set(key, (this.eventsReceived.get(key) || 0) + 1);
  }

  recordSignatureFailure(provider) {
    const p = sanitizeProvider(provider);
    this.signatureFailures.set(p, (this.signatureFailures.get(p) || 0) + 1);
  }

  recordLookupFailure(provider) {
    const p = sanitizeProvider(provider);
    this.lookupFailures.set(p, (this.lookupFailures.get(p) || 0) + 1);
  }

  recordDuplicateDelivery(provider) {
    const p = sanitizeProvider(provider);
    this.duplicates.set(p, (this.duplicates.get(p) || 0) + 1);
  }

  recordRetryAttempt(provider, trigger, outcome) {
    const p = sanitizeProvider(provider);
    const tr = ['admin', 'worker', 'cron'].includes(trigger) ? trigger : 'unknown';
    const oc = sanitizeOutcome(outcome);
    const key = `${p}|${tr}|${oc}`;
    this.retries.set(key, (this.retries.get(key) || 0) + 1);
  }

  recordReconciliationMismatch(provider, mismatchType) {
    const p = sanitizeProvider(provider);
    const mt = ['currency_mismatch', 'amount_mismatch', 'state_mismatch', 'missing_tenant'].includes(mismatchType)
      ? mismatchType
      : 'other_mismatch';
    const key = `${p}|${mt}`;
    this.reconciliationMismatches.set(key, (this.reconciliationMismatches.get(key) || 0) + 1);
  }

  recordStateTransitionFailure(provider, fromState, toState) {
    const p = sanitizeProvider(provider);
    const fs = String(fromState || 'unknown').toLowerCase().slice(0, 20);
    const ts = String(toState || 'unknown').toLowerCase().slice(0, 20);
    const key = `${p}|${fs}|${ts}`;
    this.stateTransitionFailures.set(key, (this.stateTransitionFailures.get(key) || 0) + 1);
  }

  recordDbTransactionFailure(operation) {
    const op = String(operation || 'unknown').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 30);
    this.dbFailures.set(op, (this.dbFailures.get(op) || 0) + 1);
  }

  recordProcessingDuration(provider, status, durationSeconds) {
    const p = sanitizeProvider(provider);
    const st = sanitizeOutcome(status);
    const key = `${p}|${st}`;

    let hist = this.durations.get(key);
    if (!hist) {
      hist = {
        buckets: new Map(HISTOGRAM_BUCKETS.map((b) => [b, 0])),
        inf: 0,
        sum: 0,
        count: 0,
      };
      this.durations.set(key, hist);
    }

    const sec = Math.max(0, Number(durationSeconds) || 0);
    hist.count += 1;
    hist.sum += sec;
    for (const b of HISTOGRAM_BUCKETS) {
      if (sec <= b) {
        hist.buckets.set(b, hist.buckets.get(b) + 1);
      }
    }
    hist.inf += 1;
  }

  async toPrometheusText(pool = null) {
    const lines = [];

    // 1. webhook_events_received_total
    lines.push('# HELP webhook_events_received_total Total count of payment webhooks received by provider, event type, and outcome');
    lines.push('# TYPE webhook_events_received_total counter');
    for (const [key, count] of this.eventsReceived.entries()) {
      const [p, et, oc] = key.split('|');
      lines.push(`webhook_events_received_total{provider="${p}",event_type="${et}",outcome="${oc}"} ${count}`);
    }
    lines.push('');

    // 2. webhook_signature_failures_total
    lines.push('# HELP webhook_signature_failures_total Total count of webhook signature verification failures');
    lines.push('# TYPE webhook_signature_failures_total counter');
    for (const [p, count] of this.signatureFailures.entries()) {
      lines.push(`webhook_signature_failures_total{provider="${p}"} ${count}`);
    }
    lines.push('');

    // 3. webhook_authoritative_lookup_failures_total
    lines.push('# HELP webhook_authoritative_lookup_failures_total Total count of authoritative payment gateway API lookup failures');
    lines.push('# TYPE webhook_authoritative_lookup_failures_total counter');
    for (const [p, count] of this.lookupFailures.entries()) {
      lines.push(`webhook_authoritative_lookup_failures_total{provider="${p}"} ${count}`);
    }
    lines.push('');

    // 4 & 5. Unresolved count & age gauges (queried from DB)
    const unresolvedCounts = new Map(KNOWN_PROVIDERS.map((p) => [p, 0]));
    const unresolvedOldestAge = new Map(KNOWN_PROVIDERS.map((p) => [p, 0]));
    let dbQuerySuccess = 1;

    if (pool && typeof pool.query === 'function') {
      try {
        const res = await pool.query(`
          SELECT provider,
                 COUNT(*) as count,
                 COALESCE(MAX(EXTRACT(EPOCH FROM (NOW() - created_at))), 0) as oldest_age_seconds
          FROM payment_webhooks
          WHERE status = 'unresolved'
          GROUP BY provider
        `);
        for (const row of res.rows || []) {
          const p = sanitizeProvider(row.provider);
          unresolvedCounts.set(p, parseInt(row.count, 10) || 0);
          unresolvedOldestAge.set(p, Math.max(0, Math.round(Number(row.oldest_age_seconds) || 0)));
        }
      } catch (_) {
        dbQuerySuccess = 0;
        this.recordDbTransactionFailure('metrics_unresolved_query');
      }
    } else if (pool !== null && pool !== undefined) {
      dbQuerySuccess = 0;
    }

    lines.push('# HELP webhook_unresolved_query_success Indicates whether the unresolved backlog DB query succeeded (1=success, 0=failure)');
    lines.push('# TYPE webhook_unresolved_query_success gauge');
    lines.push(`webhook_unresolved_query_success ${dbQuerySuccess}`);
    lines.push('');

    lines.push('# HELP webhook_unresolved_events_total Current backlog of webhook events in unresolved state');
    lines.push('# TYPE webhook_unresolved_events_total gauge');
    for (const [p, count] of unresolvedCounts.entries()) {
      lines.push(`webhook_unresolved_events_total{provider="${p}"} ${count}`);
    }
    lines.push('');

    lines.push('# HELP webhook_unresolved_oldest_age_seconds Age in seconds of the oldest unresolved webhook event');
    lines.push('# TYPE webhook_unresolved_oldest_age_seconds gauge');
    for (const [p, age] of unresolvedOldestAge.entries()) {
      lines.push(`webhook_unresolved_oldest_age_seconds{provider="${p}"} ${age}`);
    }
    lines.push('');

    // 6. webhook_processing_duration_seconds histogram
    lines.push('# HELP webhook_processing_duration_seconds Webhook request processing duration in seconds');
    lines.push('# TYPE webhook_processing_duration_seconds histogram');
    if (this.durations.size === 0) {
      for (const p of KNOWN_PROVIDERS) {
        for (const b of HISTOGRAM_BUCKETS) {
          lines.push(`webhook_processing_duration_seconds_bucket{provider="${p}",status="processed",le="${b}"} 0`);
        }
        lines.push(`webhook_processing_duration_seconds_bucket{provider="${p}",status="processed",le="+Inf"} 0`);
        lines.push(`webhook_processing_duration_seconds_sum{provider="${p}",status="processed"} 0`);
        lines.push(`webhook_processing_duration_seconds_count{provider="${p}",status="processed"} 0`);
      }
    } else {
      for (const [key, hist] of this.durations.entries()) {
        const [p, st] = key.split('|');
        let cumulative = 0;
        for (const b of HISTOGRAM_BUCKETS) {
          cumulative += hist.buckets.get(b) || 0;
          lines.push(`webhook_processing_duration_seconds_bucket{provider="${p}",status="${st}",le="${b}"} ${cumulative}`);
        }
        lines.push(`webhook_processing_duration_seconds_bucket{provider="${p}",status="${st}",le="+Inf"} ${hist.count}`);
        lines.push(`webhook_processing_duration_seconds_sum{provider="${p}",status="${st}"} ${hist.sum.toFixed(4)}`);
        lines.push(`webhook_processing_duration_seconds_count{provider="${p}",status="${st}"} ${hist.count}`);
      }
    }
    lines.push('');

    // 7. webhook_duplicate_deliveries_total
    lines.push('# HELP webhook_duplicate_deliveries_total Total count of duplicate webhook deliveries caught by idempotency lock');
    lines.push('# TYPE webhook_duplicate_deliveries_total counter');
    for (const [p, count] of this.duplicates.entries()) {
      lines.push(`webhook_duplicate_deliveries_total{provider="${p}"} ${count}`);
    }
    lines.push('');

    // 8. webhook_retry_attempts_total
    lines.push('# HELP webhook_retry_attempts_total Total count of webhook reconciliation retry attempts by provider and outcome');
    lines.push('# TYPE webhook_retry_attempts_total counter');
    if (this.retries.size === 0) {
      for (const p of KNOWN_PROVIDERS) {
        lines.push(`webhook_retry_attempts_total{provider="${p}",trigger="admin",outcome="processed"} 0`);
      }
    } else {
      for (const [key, count] of this.retries.entries()) {
        const [p, tr, oc] = key.split('|');
        lines.push(`webhook_retry_attempts_total{provider="${p}",trigger="${tr}",outcome="${oc}"} ${count}`);
      }
    }
    lines.push('');

    // 9. billing_reconciliation_mismatches_total
    lines.push('# HELP billing_reconciliation_mismatches_total Total count of billing reconciliation mismatches detected');
    lines.push('# TYPE billing_reconciliation_mismatches_total counter');
    if (this.reconciliationMismatches.size === 0) {
      for (const p of KNOWN_PROVIDERS) {
        lines.push(`billing_reconciliation_mismatches_total{provider="${p}",mismatch_type="currency_mismatch"} 0`);
      }
    } else {
      for (const [key, count] of this.reconciliationMismatches.entries()) {
        const [p, mt] = key.split('|');
        lines.push(`billing_reconciliation_mismatches_total{provider="${p}",mismatch_type="${mt}"} ${count}`);
      }
    }
    lines.push('');

    // 10. payment_state_transition_failures_total
    lines.push('# HELP payment_state_transition_failures_total Total count of invalid payment state transition attempts');
    lines.push('# TYPE payment_state_transition_failures_total counter');
    if (this.stateTransitionFailures.size === 0) {
      for (const p of KNOWN_PROVIDERS) {
        lines.push(`payment_state_transition_failures_total{provider="${p}",from_state="pending",to_state="processed"} 0`);
      }
    } else {
      for (const [key, count] of this.stateTransitionFailures.entries()) {
        const [p, fs, ts] = key.split('|');
        lines.push(`payment_state_transition_failures_total{provider="${p}",from_state="${fs}",to_state="${ts}"} ${count}`);
      }
    }
    lines.push('');

    // 11. billing_db_transaction_failures_total
    lines.push('# HELP billing_db_transaction_failures_total Total count of database transaction failures during billing operations');
    lines.push('# TYPE billing_db_transaction_failures_total counter');
    if (this.dbFailures.size === 0) {
      lines.push('billing_db_transaction_failures_total{operation="webhook_tx"} 0');
    } else {
      for (const [op, count] of this.dbFailures.entries()) {
        lines.push(`billing_db_transaction_failures_total{operation="${op}"} ${count}`);
      }
    }
    lines.push('');

    return lines.join('\n');
  }
}

const store = new BillingMetricsStore();

export const billingMetrics = store;

export const recordWebhookReceived = (p, et, oc) => store.recordWebhookReceived(p, et, oc);
export const recordSignatureFailure = (p) => store.recordSignatureFailure(p);
export const recordLookupFailure = (p) => store.recordLookupFailure(p);
export const recordDuplicateDelivery = (p) => store.recordDuplicateDelivery(p);
export const recordRetryAttempt = (p, tr, oc) => store.recordRetryAttempt(p, tr, oc);
export const recordReconciliationMismatch = (p, mt) => store.recordReconciliationMismatch(p, mt);
export const recordStateTransitionFailure = (p, fs, ts) => store.recordStateTransitionFailure(p, fs, ts);
export const recordDbTransactionFailure = (op) => store.recordDbTransactionFailure(op);
export const recordProcessingDuration = (p, st, sec) => store.recordProcessingDuration(p, st, sec);
export const getBillingMetricsPrometheusText = (pool) => store.toPrometheusText(pool);
export const resetBillingMetricsForTesting = () => store.reset();
