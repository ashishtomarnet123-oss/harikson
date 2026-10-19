import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  InferenceQueueManager,
  InferenceOverloadError,
  InferenceQueueTimeoutError,
  InferenceAbortedError,
} from '../src/services/inferenceQueue.js';

describe('InferenceQueueManager - Concurrency, Queue Limits & Overload Protection', () => {
  let queue: InferenceQueueManager;

  beforeEach(() => {
    queue = new InferenceQueueManager();
    // Configure predictable bounds for unit testing: 1 active slot, max 2 queued, 100ms timeout
    queue.resetForTesting({
      maxConcurrent: 1,
      maxQueueSize: 2,
      queueTimeoutMs: 100,
      retryAfterSecs: 5,
    });
  });

  it('1. Slot Acquisition: acquires slot immediately when below maxConcurrent', async () => {
    const release = await queue.acquire('req-1');
    assert.strictEqual(typeof release, 'function');

    const metrics = queue.getMetrics();
    assert.strictEqual(metrics.activeCount, 1);
    assert.strictEqual(metrics.queuedCount, 0);
    assert.strictEqual(metrics.totalAcquired, 1);

    release();
    const afterRelease = queue.getMetrics();
    assert.strictEqual(afterRelease.activeCount, 0);
    assert.strictEqual(afterRelease.totalCompleted, 1);
  });

  it('2. Queueing: queues subsequent request when slot is busy and drains upon release', async () => {
    const release1 = await queue.acquire('req-1');
    assert.strictEqual(queue.getMetrics().activeCount, 1);

    let req2Acquired = false;
    let release2Fn: (() => void) | null = null;
    const req2Promise = queue.acquire('req-2').then((rel) => {
      req2Acquired = true;
      release2Fn = rel;
    });

    // req-2 is waiting in queue
    assert.strictEqual(req2Acquired, false);
    assert.strictEqual(queue.getMetrics().queuedCount, 1);

    // Release req-1 -> req-2 should immediately acquire
    release1();
    await req2Promise;

    assert.strictEqual(req2Acquired, true);
    assert.strictEqual(queue.getMetrics().activeCount, 1);
    assert.strictEqual(queue.getMetrics().queuedCount, 0);

    if (release2Fn) (release2Fn as () => void)();
    assert.strictEqual(queue.getMetrics().activeCount, 0);
  });

  it('3. Overload Rejection: throws InferenceOverloadError (429) when queue capacity is exceeded', async () => {
    // Fill active slot (1)
    await queue.acquire('active-1');

    // Fill queue slots (2)
    const p1 = queue.acquire('queued-1').catch(() => {});
    const p2 = queue.acquire('queued-2').catch(() => {});

    assert.strictEqual(queue.getMetrics().queuedCount, 2);

    // 4th request must be rejected immediately
    await assert.rejects(
      async () => {
        await queue.acquire('overflow-request');
      },
      (err: any) => {
        assert.ok(err instanceof InferenceOverloadError);
        assert.strictEqual(err.code, 'INFERENCE_OVERLOAD');
        assert.strictEqual(err.status, 429);
        assert.strictEqual(err.retryAfter, 5);
        return true;
      }
    );

    const metrics = queue.getMetrics();
    assert.strictEqual(metrics.totalRejected, 1);

    // Clean up
    await Promise.allSettled([p1, p2]);
  });

  it('4. Queue Timeout: queued request aborts with InferenceQueueTimeoutError if wait exceeds limit', async () => {
    await queue.acquire('active-slot');

    const start = Date.now();
    await assert.rejects(
      async () => {
        await queue.acquire('slow-waiter');
      },
      (err: any) => {
        assert.ok(err instanceof InferenceQueueTimeoutError);
        assert.strictEqual(err.code, 'INFERENCE_QUEUE_TIMEOUT');
        assert.strictEqual(err.status, 504);
        return true;
      }
    );
    const elapsed = Date.now() - start;

    assert.ok(elapsed >= 90);
    assert.strictEqual(queue.getMetrics().totalTimedOut, 1);
    assert.strictEqual(queue.getMetrics().queuedCount, 0);
  });

  it('5. Client Disconnect Cancellation: queued request aborts cleanly and frees queue space', async () => {
    await queue.acquire('active-slot');

    const controller = new AbortController();
    const waitPromise = queue.acquire('abort-waiter', controller.signal);

    assert.strictEqual(queue.getMetrics().queuedCount, 1);

    // Client disconnects
    controller.abort();

    await assert.rejects(
      async () => {
        await waitPromise;
      },
      (err: any) => {
        assert.ok(err instanceof InferenceAbortedError);
        assert.strictEqual(err.code, 'INFERENCE_ABORTED');
        assert.strictEqual(err.status, 499);
        return true;
      }
    );

    assert.strictEqual(queue.getMetrics().totalAborted, 1);
    assert.strictEqual(queue.getMetrics().queuedCount, 0);
  });

  it('6. Sequential Draining: processes queued requests in strict FIFO order', async () => {
    const release0 = await queue.acquire('req-0');
    const executionOrder: string[] = [];

    const p1 = queue.acquire('req-1').then((rel) => {
      executionOrder.push('req-1');
      rel();
    });
    const p2 = queue.acquire('req-2').then((rel) => {
      executionOrder.push('req-2');
      rel();
    });

    release0();
    await Promise.all([p1, p2]);

    assert.deepStrictEqual(executionOrder, ['req-1', 'req-2']);
    assert.strictEqual(queue.getMetrics().activeCount, 0);
    assert.strictEqual(queue.getMetrics().totalCompleted, 3);
  });
});
