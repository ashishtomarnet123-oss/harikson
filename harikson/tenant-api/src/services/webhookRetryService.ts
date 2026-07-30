import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { pool, invalidateTenantCache } from '../db/pool.js';
import logger from '../utils/logger.js';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: null,
});

export const webhookRetryQueue = new Queue('webhookRetryQueue', { connection: redisConnection });
export const webhookDeadLetterQueue = new Queue('webhookDeadLetterQueue', { connection: redisConnection });

const RETRY_DELAYS_MS: Record<number, number> = {
  1: 5 * 60 * 1000,       // Attempt 1 -> 2: 5 min
  2: 15 * 60 * 1000,      // Attempt 2 -> 3: 15 min
  3: 60 * 60 * 1000,      // Attempt 3 -> 4: 1 hour
  4: 4 * 60 * 60 * 1000,   // Attempt 4 -> 5: 4 hours
  5: 12 * 60 * 60 * 1000,  // Attempt 5+: 12 hours (DLQ fallback)
};

/**
 * Enqueue incoming webhook event into payment_webhooks table and BullMQ queue.
 */
export async function enqueueWebhookEvent(
  provider: string,
  eventId: string,
  eventType: string,
  payload: any,
  amount: number = 0,
  tenantName: string = ''
): Promise<{ id: string; status: string }> {
  try {
    const insertRes = await pool.query(
      `INSERT INTO payment_webhooks (event_id, provider, event_type, status, payload, signature_verified, amount, tenant_name, created_at)
       VALUES ($1, $2, $3, 'pending', $4, true, $5, $6, NOW())
       ON CONFLICT (event_id, provider) DO UPDATE 
       SET payload = EXCLUDED.payload, signature_verified = true
       RETURNING id, status`,
      [eventId, provider, eventType, JSON.stringify(payload), amount, tenantName]
    );

    const record = insertRes.rows[0];

    // Enqueue to BullMQ queue for async worker processing
    await webhookRetryQueue.add(
      'process-webhook',
      {
        eventId,
        provider,
        eventType,
        payload,
        attempt: 1,
      },
      {
        jobId: `webhook-${provider}-${eventId}`,
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 7 * 86400 },
      }
    );

    logger.info(`📥 Webhook enqueued: [${provider}] ${eventId} (${eventType})`);
    return record;
  } catch (err: any) {
    logger.error(`Failed to enqueue webhook [${provider}] ${eventId}:`, err);
    throw err;
  }
}

/**
 * Business logic to process payment webhook payload based on event type.
 */
export async function processWebhookPayload(provider: string, eventType: string, payload: any): Promise<void> {
  if (provider === 'razorpay') {
    await processRazorpayWebhookPayload(eventType, payload);
    return;
  }

  const dataObject = payload?.data?.object || payload?.object || payload;

  if (eventType === 'checkout.session.completed' || eventType === 'payment_intent.succeeded') {
    const tenantId = dataObject.metadata?.tenantId;
    const planId = dataObject.metadata?.planId;

    if (tenantId && planId) {
      await pool.query(
        `UPDATE tenants SET status = 'active', updated_at = NOW() WHERE id = $1`,
        [tenantId]
      );
      await invalidateTenantCache(tenantId);
      logger.info(`✅ Webhook processed payment success: Activated plan ${planId} for tenant ${tenantId}`);
    }
  } else if (eventType === 'customer.subscription.deleted') {
    const tenantId = dataObject.metadata?.tenantId;
    if (tenantId) {
      await pool.query(
        `UPDATE tenants SET status = 'canceled', updated_at = NOW() WHERE id = $1`,
        [tenantId]
      );
      await invalidateTenantCache(tenantId);
      logger.info(`🚫 Webhook processed cancellation for tenant ${tenantId}`);
    }
  }
}

/**
 * Razorpay event payloads nest everything under payload.payment.entity /
 * payload.subscription.entity — a distinct shape from Stripe's
 * payload.data.object, so it gets its own dedicated handler rather than
 * reusing the Stripe-shaped `dataObject` extraction above. This is the async
 * fallback confirmation path: it activates the plan the same way
 * POST /billing/verify-payment does, in case the client never completed that
 * call (e.g. the browser closed right after paying).
 */
async function processRazorpayWebhookPayload(eventType: string, payload: any): Promise<void> {
  if (eventType === 'payment.captured' || eventType === 'order.paid') {
    const paymentEntity = payload?.payload?.payment?.entity;
    const notes = paymentEntity?.notes || {};
    const tenantId = notes.tenantId;
    const planId = notes.planId;
    const paymentId = paymentEntity?.id;
    const orderId = paymentEntity?.order_id;
    const amount = paymentEntity?.amount ? paymentEntity.amount / 100 : 0;
    const currency = paymentEntity?.currency || 'INR';

    if (!tenantId || !planId || !paymentId) {
      logger.warn(`Razorpay ${eventType} webhook missing tenantId/planId/paymentId in notes — skipping activation`);
      return;
    }

    const subRes = await pool.query(
      `INSERT INTO subscriptions (tenant_id, provider, provider_subscription_id, plan_id, status, current_period_start, current_period_end, amount, currency, created_at, updated_at)
       VALUES ($1, 'razorpay', $2, $3, 'active', NOW(), NOW() + INTERVAL '30 days', $4, $5, NOW(), NOW())
       ON CONFLICT (provider, provider_subscription_id) DO UPDATE SET status = 'active', updated_at = NOW()
       RETURNING id`,
      [tenantId, orderId || paymentId, planId, amount, currency]
    );
    const subscriptionId = subRes.rows[0]?.id || null;

    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(paymentId).slice(-8).toUpperCase()}`;
    await pool.query(
      `INSERT INTO invoices (tenant_id, subscription_id, provider, provider_invoice_id, invoice_number, amount, currency, status, paid_at, created_at, updated_at)
       VALUES ($1, $2, 'razorpay', $3, $4, $5, $6, 'paid', NOW(), NOW(), NOW())
       ON CONFLICT (provider, provider_invoice_id) DO NOTHING`,
      [tenantId, subscriptionId, paymentId, invoiceNumber, amount, currency]
    );

    await pool.query(`UPDATE tenants SET plan = $2, status = 'active', updated_at = NOW() WHERE id = $1`, [tenantId, planId]);
    await invalidateTenantCache(tenantId);
    logger.info(`✅ Razorpay webhook processed payment success: Activated plan ${planId} for tenant ${tenantId}`);
  } else if (eventType === 'subscription.cancelled' || eventType === 'subscription.completed') {
    const subEntity = payload?.payload?.subscription?.entity;
    const tenantId = subEntity?.notes?.tenantId;

    if (tenantId) {
      await pool.query(`UPDATE tenants SET status = 'canceled', updated_at = NOW() WHERE id = $1`, [tenantId]);
      await pool.query(`UPDATE subscriptions SET status = 'cancelled', updated_at = NOW() WHERE tenant_id = $1`, [tenantId]);
      await invalidateTenantCache(tenantId);
      logger.info(`🚫 Razorpay webhook processed cancellation for tenant ${tenantId}`);
    }
  }
}

/**
 * Worker handler processing jobs from webhookRetryQueue.
 */
export async function handleWebhookRetryJob(job: Job): Promise<void> {
  const { eventId, provider, eventType, payload, attempt = 1 } = job.data;

  // 1. Idempotency Check: Verify if event is already processed in DB
  const checkRes = await pool.query(
    `SELECT status FROM payment_webhooks WHERE event_id = $1 AND provider = $2`,
    [eventId, provider]
  );
  const currentStatus = checkRes.rows[0]?.status;

  if (currentStatus === 'processed') {
    logger.info(`⏩ [Idempotency] Webhook ${eventId} (${provider}) already processed. Skipping.`);
    return;
  }

  try {
    // 2. Process webhook business logic
    await processWebhookPayload(provider, eventType || payload?.type, payload);

    // 3. Mark processed on success
    await pool.query(
      `UPDATE payment_webhooks 
       SET status = 'processed', processed_at = NOW(), processing_error = NULL 
       WHERE event_id = $1 AND provider = $2`,
      [eventId, provider]
    );
    logger.info(`🎉 [Webhook Success] Processed ${eventId} (${provider}) on attempt ${attempt}`);
  } catch (err: any) {
    const errorMessage = err.message || 'Unknown processing error';
    logger.warn(`⚠️ [Webhook Error] Attempt ${attempt}/5 failed for ${eventId} (${provider}): ${errorMessage}`);

    if (attempt < 5) {
      const nextAttempt = attempt + 1;
      const delayMs = RETRY_DELAYS_MS[attempt] || 5 * 60 * 1000;

      await pool.query(
        `UPDATE payment_webhooks 
         SET status = 'pending', processing_error = $1 
         WHERE event_id = $2 AND provider = $3`,
        [errorMessage, eventId, provider]
      );

      // Re-enqueue job with exponential delay
      await webhookRetryQueue.add(
        'process-webhook',
        { eventId, provider, eventType, payload, attempt: nextAttempt },
        {
          delay: delayMs,
          jobId: `webhook-${provider}-${eventId}-retry-${nextAttempt}`,
        }
      );

      logger.info(`⏰ Re-enqueued webhook ${eventId} for attempt ${nextAttempt} in ${delayMs / 1000}s`);
    } else {
      // 5th Failure: Mark failed, alert admin, send to Dead Letter Queue
      await pool.query(
        `UPDATE payment_webhooks 
         SET status = 'failed', processing_error = $1 
         WHERE event_id = $2 AND provider = $3`,
        [errorMessage, eventId, provider]
      );

      await webhookDeadLetterQueue.add('dead-letter-event', {
        eventId,
        provider,
        eventType,
        payload,
        error: errorMessage,
        failedAt: new Date().toISOString(),
      });

      logger.error(`🚨 [DLQ ALERT] Webhook ${eventId} (${provider}) failed permanently after 5 attempts. Error: ${errorMessage}`);
    }
  }
}

// Initialize BullMQ Worker for Webhook Retries
export const webhookRetryWorker = new Worker(
  'webhookRetryQueue',
  async (job: Job) => {
    await handleWebhookRetryJob(job);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);
