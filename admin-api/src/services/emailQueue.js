import Redis from 'ioredis';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { sendEmail, renderAndSendTemplate } from './email.js';

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';
const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const QUEUE_KEY = 'xarwiz:email_queue:pending';
const PROCESSING_KEY = 'xarwiz:email_queue:processing';
const FAILED_KEY = 'xarwiz:email_queue:failed';
const JOB_PREFIX = 'xarwiz:email_job:';

let isWorkerRunning = false;
let workerStopRequested = false;

/**
 * Enqueue a batch broadcast or asynchronous email dispatch job into durable Redis queue.
 */
export async function enqueueEmailJob({
  recipients = [],
  templateKey = null,
  subject = null,
  body_html = null,
  variables = {},
  emailType = 'custom_broadcast',
  metadata = {},
  priority = 'normal'
}) {
  const jobId = `job_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  const jobPayload = {
    id: jobId,
    recipients: JSON.stringify(recipients),
    templateKey: templateKey || '',
    subject: subject || '',
    body_html: body_html || '',
    variables: JSON.stringify(variables || {}),
    emailType,
    metadata: JSON.stringify(metadata || {}),
    priority,
    totalCount: recipients.length,
    processedCount: 0,
    successCount: 0,
    failedCount: 0,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
  };

  const jobKey = `${JOB_PREFIX}${jobId}`;
  await redis.hmset(jobKey, jobPayload);
  await redis.expire(jobKey, 86400 * 7); // Retain job telemetry for 7 days
  await redis.lpush(QUEUE_KEY, jobId);

  logger.info(`📬 [EMAIL QUEUE] Enqueued job ${jobId} for ${recipients.length} recipients (Type: ${emailType})`);

  // Ensure worker is running to process the queue
  ensureWorkerRunning();

  return {
    jobId,
    status: 'queued',
    recipientCount: recipients.length,
    enqueuedAt: now,
  };
}

/**
 * Fetch progress and status of an enqueued email job.
 */
export async function getEmailJobStatus(jobId) {
  const jobKey = `${JOB_PREFIX}${jobId}`;
  const data = await redis.hgetall(jobKey);
  if (!data || !data.id) {
    return null;
  }

  return {
    id: data.id,
    status: data.status,
    totalCount: parseInt(data.totalCount || '0', 10),
    processedCount: parseInt(data.processedCount || '0', 10),
    successCount: parseInt(data.successCount || '0', 10),
    failedCount: parseInt(data.failedCount || '0', 10),
    emailType: data.emailType,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    completedAt: data.completedAt || null,
  };
}

/**
 * Process a single email job with bounded batch concurrency (concurrency = 5)
 */
async function processEmailJob(jobId) {
  const jobKey = `${JOB_PREFIX}${jobId}`;
  const jobData = await redis.hgetall(jobKey);

  if (!jobData || !jobData.id) {
    logger.warn(`[EMAIL WORKER] Job ${jobId} not found in store`);
    return;
  }

  await redis.hset(jobKey, 'status', 'processing', 'updatedAt', new Date().toISOString());

  const recipients = JSON.parse(jobData.recipients || '[]');
  const variables = JSON.parse(jobData.variables || '{}');
  const templateKey = jobData.templateKey || null;
  const subject = jobData.subject || '';
  const body_html = jobData.body_html || '';
  const emailType = jobData.emailType || 'custom_broadcast';
  const metadata = JSON.parse(jobData.metadata || '{}');

  const startOffset = parseInt(jobData.processedCount || '0', 10);
  let successCount = parseInt(jobData.successCount || '0', 10);
  let failedCount = parseInt(jobData.failedCount || '0', 10);
  const errors = [];

  // Bounded batch concurrency: 5 emails at a time.
  // Resumes from startOffset to guarantee idempotency and avoid duplicate dispatches if recovered.
  const BATCH_SIZE = 5;
  for (let i = startOffset; i < recipients.length; i += BATCH_SIZE) {
    if (workerStopRequested) break;

    const batch = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (email) => {
        try {
          let res;
          if (templateKey) {
            res = await renderAndSendTemplate(templateKey, email, { email, ...variables });
          } else {
            res = await sendEmail({
              to: email,
              subject,
              html: body_html,
              emailType,
              metadata: { ...metadata, jobId }
            });
          }
          return { email, success: res.success, error: res.error };
        } catch (err) {
          return { email, success: false, error: err.message };
        }
      })
    );

    for (const r of results) {
      if (r.success) {
        successCount++;
      } else {
        failedCount++;
        errors.push({ email: r.email, error: r.error });
      }
    }

    const processedSoFar = Math.min(i + BATCH_SIZE, recipients.length);
    await redis.hset(
      jobKey,
      'processedCount',
      processedSoFar,
      'successCount',
      successCount,
      'failedCount',
      failedCount,
      'updatedAt',
      new Date().toISOString()
    );
  }

  const finalStatus = failedCount === recipients.length && recipients.length > 0 ? 'failed' : 'completed';
  await redis.hset(
    jobKey,
    'status',
    finalStatus,
    'completedAt',
    new Date().toISOString(),
    'errors',
    JSON.stringify(errors.slice(0, 50)) // store up to 50 sample errors
  );

  logger.info(`✅ [EMAIL WORKER] Job ${jobId} finished: ${successCount} sent, ${failedCount} failed of ${recipients.length}`);
}

/**
 * Recover orphaned jobs that were in-flight during a server crash or restart.
 */
export async function recoverInterruptedJobs() {
  try {
    let recoveredCount = 0;
    while (true) {
      const orphanedJobId = await redis.rpoplpush(PROCESSING_KEY, QUEUE_KEY);
      if (!orphanedJobId) break;
      recoveredCount++;
      logger.warn(`⚠️ [EMAIL QUEUE RECOVERY] Recovered interrupted job ${orphanedJobId} back to pending queue`);
    }
    if (recoveredCount > 0) {
      logger.info(`✅ [EMAIL QUEUE RECOVERY] Successfully recovered ${recoveredCount} orphaned jobs`);
    }
    return recoveredCount;
  } catch (err) {
    logger.warn('[EMAIL QUEUE RECOVERY ERROR]:', err.message);
    return 0;
  }
}

/**
 * Worker main loop
 */
async function runWorkerLoop() {
  if (isWorkerRunning) return;
  isWorkerRunning = true;
  workerStopRequested = false;

  logger.info('🚀 [EMAIL WORKER] Email queue background processor started');

  // Recover any orphaned jobs before starting new pulls
  await recoverInterruptedJobs();

  while (!workerStopRequested) {
    try {
      // Pop next job from Redis (rpoplpush for reliability)
      const jobId = await redis.rpoplpush(QUEUE_KEY, PROCESSING_KEY);
      if (!jobId) {
        // Queue empty: pause briefly
        await new Promise((res) => setTimeout(res, 1000));
        continue;
      }

      try {
        await processEmailJob(jobId);
      } catch (err) {
        logger.error(`[EMAIL WORKER ERROR] Job ${jobId} failed unexpectedly:`, err.message);
        await redis.lpush(FAILED_KEY, jobId);
      } finally {
        await redis.lrem(PROCESSING_KEY, 1, jobId);
      }
    } catch (loopErr) {
      logger.warn('[EMAIL WORKER LOOP ERROR]:', loopErr.message);
      await new Promise((res) => setTimeout(res, 3000));
    }
  }

  isWorkerRunning = false;
  logger.info('🛑 [EMAIL WORKER] Email queue processor stopped');
}

export function ensureWorkerRunning() {
  if (!isWorkerRunning) {
    runWorkerLoop().catch((err) => {
      logger.error('Failed to start email worker loop:', err);
    });
  }
}

export function startEmailWorker() {
  ensureWorkerRunning();
}

export function stopEmailWorker() {
  workerStopRequested = true;
}
