import { Queue, Job } from 'bullmq';
import { Redis } from 'ioredis';
import logger from '../../utils/logger.js';

let workflowQueueInstance: Queue | null = null;
let redisConnection: Redis | null = null;

function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

    redisConnection.on('error', (err) => {
      logger.warn('[WorkflowQueue] Redis connection error (will retry):', err.message);
    });
  }
  return redisConnection;
}

export function getWorkflowQueue(): Queue {
  if (!workflowQueueInstance) {
    const conn = getRedisConnection();
    workflowQueueInstance = new Queue('workflowQueue', { connection: conn });
  }
  return workflowQueueInstance;
}

export interface IWorkflowJobData {
  executionId: string;
  workflowId: string;
  triggerType: 'manual' | 'webhook' | 'cron' | 'event';
  payload: Record<string, any>;
  tenantId: string;
}

/**
 * Enqueue a workflow execution into BullMQ for asynchronous worker processing.
 * Returns the BullMQ Job instance or null if enqueue fails.
 */
export async function enqueueWorkflowExecution(data: IWorkflowJobData): Promise<Job<IWorkflowJobData> | null> {
  try {
    const queue = getWorkflowQueue();
    const job = await queue.add('execute-workflow', data, {
      jobId: `wf-exec-${data.executionId}`,
      removeOnComplete: { age: 86400 }, // retain 24h
      removeOnFail: { age: 7 * 86400 },  // retain 7 days
    });
    logger.info(`[WorkflowQueue] Enqueued execution ${data.executionId} for workflow ${data.workflowId}`);
    return job;
  } catch (err: any) {
    logger.error(`[WorkflowQueue] Failed to enqueue execution ${data.executionId}:`, err);
    throw err;
  }
}
