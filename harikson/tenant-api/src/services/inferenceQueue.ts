import logger from '../utils/logger.js';

export class InferenceOverloadError extends Error {
  public readonly code = 'INFERENCE_OVERLOAD';
  public readonly status = 429;
  public readonly retryAfter: number;

  constructor(message = 'AI inference capacity reached. Please wait a moment and try again.', retryAfter = 10) {
    super(message);
    this.name = 'InferenceOverloadError';
    this.retryAfter = retryAfter;
  }
}

export class InferenceQueueTimeoutError extends Error {
  public readonly code = 'INFERENCE_QUEUE_TIMEOUT';
  public readonly status = 504;

  constructor(message = 'Inference queue timeout. The server is busy processing other requests. Please try again.') {
    super(message);
    this.name = 'InferenceQueueTimeoutError';
  }
}

export class InferenceAbortedError extends Error {
  public readonly code = 'INFERENCE_ABORTED';
  public readonly status = 499;

  constructor(message = 'Inference request was cancelled while waiting in queue.') {
    super(message);
    this.name = 'InferenceAbortedError';
  }
}

interface QueueEntry {
  id: string;
  queuedAt: number;
  resolve: (release: () => void) => void;
  reject: (err: Error) => void;
  timeoutTimer: NodeJS.Timeout;
  abortHandler?: () => void;
  signal?: AbortSignal;
}

function parsePositiveInt(val: string | undefined, fallback: number, min = 1): number {
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  return Number.isFinite(parsed) ? Math.max(min, parsed) : fallback;
}

export class InferenceQueueManager {
  private activeCount = 0;
  private queue: QueueEntry[] = [];

  // Configurable bounds
  private maxConcurrent: number;
  private maxQueueSize: number;
  private queueTimeoutMs: number;
  private retryAfterSecs: number;

  // Cumulative Metrics
  private totalAcquired = 0;
  private totalCompleted = 0;
  private totalRejected = 0;
  private totalTimedOut = 0;
  private totalAborted = 0;

  constructor() {
    this.maxConcurrent = parsePositiveInt(process.env.MAX_CONCURRENT_INFERENCE, 1, 1);
    this.maxQueueSize = parsePositiveInt(process.env.MAX_INFERENCE_QUEUE, 10, 1);
    this.queueTimeoutMs = parsePositiveInt(process.env.INFERENCE_QUEUE_TIMEOUT_MS, 45000, 1000);
    this.retryAfterSecs = parsePositiveInt(process.env.INFERENCE_RETRY_AFTER_SECS, 10, 1);
  }

  /**
   * Acquire an inference execution slot.
   * If concurrency is saturated, queues the request up to maxQueueSize.
   * Throws InferenceOverloadError if queue is full.
   * Throws InferenceQueueTimeoutError if queue wait exceeds timeout.
   * Throws InferenceAbortedError if signal is aborted while in queue.
   */
  public async acquire(requestId: string, signal?: AbortSignal): Promise<() => void> {
    if (signal?.aborted) {
      this.totalAborted++;
      throw new InferenceAbortedError();
    }

    // Direct slot available
    if (this.activeCount < this.maxConcurrent) {
      this.activeCount++;
      this.totalAcquired++;
      logger.info({ requestId, activeCount: this.activeCount, maxConcurrent: this.maxConcurrent }, '[InferenceQueue] Slot acquired directly');
      return this.createReleaseCallback(requestId);
    }

    // Queue capacity check
    if (this.queue.length >= this.maxQueueSize) {
      this.totalRejected++;
      logger.warn(
        { requestId, activeCount: this.activeCount, queueLength: this.queue.length, maxQueueSize: this.maxQueueSize },
        '[InferenceQueue] Rejected: queue capacity reached'
      );
      throw new InferenceOverloadError(
        'AI inference service is currently at capacity. Please try again shortly.',
        this.retryAfterSecs
      );
    }

    // Enqueue
    return new Promise<() => void>((resolve, reject) => {
      const queuedAt = Date.now();
      logger.info(
        { requestId, queuePosition: this.queue.length + 1, activeCount: this.activeCount },
        '[InferenceQueue] Request queued for inference'
      );

      const timeoutTimer = setTimeout(() => {
        this.removeFromQueue(requestId);
        this.totalTimedOut++;
        logger.warn(
          { requestId, waitMs: Date.now() - queuedAt, timeoutMs: this.queueTimeoutMs },
          '[InferenceQueue] Queued request timed out'
        );
        reject(new InferenceQueueTimeoutError());
      }, this.queueTimeoutMs);

      const entry: QueueEntry = {
        id: requestId,
        queuedAt,
        resolve: (releaseFn) => {
          clearTimeout(timeoutTimer);
          if (entry.signal && entry.abortHandler) {
            entry.signal.removeEventListener('abort', entry.abortHandler);
          }
          resolve(releaseFn);
        },
        reject: (err) => {
          clearTimeout(timeoutTimer);
          if (entry.signal && entry.abortHandler) {
            entry.signal.removeEventListener('abort', entry.abortHandler);
          }
          reject(err);
        },
        timeoutTimer,
        signal,
      };

      if (signal) {
        entry.abortHandler = () => {
          this.removeFromQueue(requestId);
          clearTimeout(timeoutTimer);
          this.totalAborted++;
          logger.info({ requestId }, '[InferenceQueue] Queued request aborted by client');
          reject(new InferenceAbortedError());
        };
        signal.addEventListener('abort', entry.abortHandler, { once: true });
      }

      this.queue.push(entry);
    });
  }

  private createReleaseCallback(requestId: string): () => void {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.activeCount = Math.max(0, this.activeCount - 1);
      this.totalCompleted++;
      logger.info({ requestId, remainingActive: this.activeCount, queueLength: this.queue.length }, '[InferenceQueue] Slot released');
      this.processNextInQueue();
    };
  }

  private processNextInQueue(): void {
    while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const next = this.queue.shift();
      if (!next) break;

      if (next.signal?.aborted) {
        clearTimeout(next.timeoutTimer);
        if (next.signal && next.abortHandler) {
          next.signal.removeEventListener('abort', next.abortHandler);
        }
        this.totalAborted++;
        next.reject(new InferenceAbortedError());
        continue;
      }

      this.activeCount++;
      this.totalAcquired++;
      const waitMs = Date.now() - next.queuedAt;
      logger.info({ requestId: next.id, waitMs, activeCount: this.activeCount }, '[InferenceQueue] Dequeued request, slot acquired');
      const releaseFn = this.createReleaseCallback(next.id);
      next.resolve(releaseFn);
    }
  }

  private removeFromQueue(requestId: string): void {
    const idx = this.queue.findIndex((e) => e.id === requestId);
    if (idx !== -1) {
      this.queue.splice(idx, 1);
    }
  }

  public getMetrics() {
    return {
      activeCount: this.activeCount,
      queuedCount: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: this.maxQueueSize,
      queueTimeoutMs: this.queueTimeoutMs,
      retryAfterSecs: this.retryAfterSecs,
      totalAcquired: this.totalAcquired,
      totalCompleted: this.totalCompleted,
      totalRejected: this.totalRejected,
      totalTimedOut: this.totalTimedOut,
      totalAborted: this.totalAborted,
    };
  }

  /**
   * Reset state for unit and integration testing
   */
  public resetForTesting(config?: { maxConcurrent?: number; maxQueueSize?: number; queueTimeoutMs?: number; retryAfterSecs?: number }) {
    for (const item of this.queue) {
      clearTimeout(item.timeoutTimer);
      if (item.signal && item.abortHandler) {
        item.signal.removeEventListener('abort', item.abortHandler);
      }
    }
    this.queue = [];
    this.activeCount = 0;
    this.totalAcquired = 0;
    this.totalCompleted = 0;
    this.totalRejected = 0;
    this.totalTimedOut = 0;
    this.totalAborted = 0;

    if (config?.maxConcurrent !== undefined) this.maxConcurrent = config.maxConcurrent;
    if (config?.maxQueueSize !== undefined) this.maxQueueSize = config.maxQueueSize;
    if (config?.queueTimeoutMs !== undefined) this.queueTimeoutMs = config.queueTimeoutMs;
    if (config?.retryAfterSecs !== undefined) this.retryAfterSecs = config.retryAfterSecs;
  }
}

// Singleton instance shared across chat routes
export const globalInferenceQueue = new InferenceQueueManager();
