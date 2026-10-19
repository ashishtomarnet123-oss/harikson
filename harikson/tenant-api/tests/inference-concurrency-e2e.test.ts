import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  InferenceQueueManager,
  InferenceOverloadError,
} from '../src/services/inferenceQueue.js';

describe('Inference Concurrency & Mock Load Test (E2E API Simulation)', () => {
  it('Simulates 15 concurrent incoming requests under bounded single-slot inference', async () => {
    // Isolated manager simulating production settings:
    // 1 active runner, queue depth of 5, fast simulated inference time (20ms each)
    const queue = new InferenceQueueManager();
    queue.resetForTesting({
      maxConcurrent: 1,
      maxQueueSize: 5,
      queueTimeoutMs: 500,
      retryAfterSecs: 5,
    });

    const results: Array<{ id: string; status: 'completed' | 'rejected' | 'failed'; durationMs: number }> = [];

    // Simulated worker executing mock inference
    async function simulateChatRequest(id: string, mockGenMs = 25) {
      const start = Date.now();
      try {
        const release = await queue.acquire(id);
        try {
          // Simulate streaming LLM token generation (Mocked — does not reflect real CPU token throughput)
          await new Promise((resolve) => setTimeout(resolve, mockGenMs));
          results.push({ id, status: 'completed', durationMs: Date.now() - start });
        } finally {
          release();
        }
      } catch (err: any) {
        if (err instanceof InferenceOverloadError || err?.code === 'INFERENCE_OVERLOAD') {
          results.push({ id, status: 'rejected', durationMs: Date.now() - start });
        } else {
          results.push({ id, status: 'failed', durationMs: Date.now() - start });
        }
      }
    }

    // Fire 15 simultaneous incoming requests
    const tasks = Array.from({ length: 15 }, (_, i) => simulateChatRequest(`req-${i + 1}`, 20));
    await Promise.all(tasks);

    // Analysis of results:
    // 1 active slot + 5 queued = exactly 6 requests should succeed sequentially.
    // 9 requests should be rejected with HTTP 429 INFERENCE_OVERLOAD.
    const completed = results.filter((r) => r.status === 'completed');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(completed.length, 6, 'Exactly 1 active + 5 queued requests must complete successfully');
    assert.strictEqual(rejected.length, 9, 'All 9 excess requests beyond queue capacity must be rejected immediately with 429');

    // Confirm all completed requests ran sequentially with 0 active slots remaining
    const metrics = queue.getMetrics();
    assert.strictEqual(metrics.activeCount, 0, 'All inference slots must be released');
    assert.strictEqual(metrics.queuedCount, 0, 'Inference queue must be fully drained');
    assert.strictEqual(metrics.totalCompleted, 6, 'Total completed count must equal 6');
    assert.strictEqual(metrics.totalRejected, 9, 'Total rejected count must equal 9');
  });

  it('Verifies queue cancellation prevents phantom inference execution', async () => {
    const queue = new InferenceQueueManager();
    queue.resetForTesting({
      maxConcurrent: 1,
      maxQueueSize: 5,
      queueTimeoutMs: 500,
      retryAfterSecs: 5,
    });

    // Acquire active slot
    const releaseActive = await queue.acquire('active-running');

    // Enqueue 2 requests with abort controllers
    const ctrl1 = new AbortController();
    const ctrl2 = new AbortController();

    let req1Started = false;
    let req2Started = false;

    const p1 = queue.acquire('waiter-1', ctrl1.signal).then(() => {
      req1Started = true;
    }).catch(() => {});

    const p2 = queue.acquire('waiter-2', ctrl2.signal).then(() => {
      req2Started = true;
    }).catch(() => {});

    assert.strictEqual(queue.getMetrics().queuedCount, 2);

    // Client 1 cancels before active slot finishes
    ctrl1.abort();
    await p1;

    assert.strictEqual(queue.getMetrics().queuedCount, 1, 'Cancelled waiter must be purged from queue');

    // Finish active slot -> waiter-2 should now acquire, waiter-1 must NEVER execute
    releaseActive();
    await p2;

    assert.strictEqual(req1Started, false, 'Aborted request must never acquire inference slot');
    assert.strictEqual(req2Started, true, 'Next active waiter must cleanly acquire slot');
  });
});
