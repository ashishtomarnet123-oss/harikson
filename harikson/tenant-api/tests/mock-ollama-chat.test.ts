import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import axios from 'axios';
import {
  InferenceQueueManager,
  InferenceOverloadError,
  InferenceQueueTimeoutError,
  InferenceAbortedError,
} from '../src/services/inferenceQueue.js';

describe('Safe Automated Mock Ollama HTTP Server Integration Tests', () => {
  let server: http.Server;
  let serverPort: number;
  let serverUrl: string;

  // Track mock server state
  let requestsReceived = 0;
  let activeMockConnections = 0;
  let lastReceivedPayload: any = null;

  // Configurable behavior for mock server
  let mockStreamDelayMs = 10;
  let mockShouldFailMidway = false;
  let mockHttpStatus = 200;

  before((_, done) => {
    server = http.createServer((req, res) => {
      requestsReceived++;
      activeMockConnections++;

      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', async () => {
        try {
          lastReceivedPayload = JSON.parse(body);
        } catch (_) {
          lastReceivedPayload = body;
        }

        if (mockHttpStatus !== 200) {
          res.writeHead(mockHttpStatus, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Mock Ollama internal error' }));
          activeMockConnections--;
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'application/x-ndjson',
          'Transfer-Encoding': 'chunked',
        });

        // Send first chunk
        res.write(JSON.stringify({
          model: lastReceivedPayload?.model || 'qwen2.5:3b',
          message: { role: 'assistant', content: 'Mock' },
          done: false,
        }) + '\n');

        if (mockShouldFailMidway) {
          // Abruptly destroy socket to simulate network/stream error
          setTimeout(() => {
            activeMockConnections--;
            res.destroy(new Error('Mock Ollama abrupt socket destruction'));
          }, mockStreamDelayMs);
          return;
        }

        // Wait simulated generation time, then send second chunk
        setTimeout(() => {
          if (res.writableEnded || res.destroyed) {
            activeMockConnections--;
            return;
          }
          res.write(JSON.stringify({
            model: lastReceivedPayload?.model || 'qwen2.5:3b',
            message: { role: 'assistant', content: ' response' },
            done: false,
          }) + '\n');

          // Send final completion chunk
          setTimeout(() => {
            if (!res.writableEnded && !res.destroyed) {
              res.write(JSON.stringify({
                model: lastReceivedPayload?.model || 'qwen2.5:3b',
                message: { role: 'assistant', content: '.' },
                done: true,
                prompt_eval_count: 10,
                eval_count: 3,
                total_duration: 35000000,
              }) + '\n');
              res.end();
            }
            activeMockConnections--;
          }, mockStreamDelayMs);
        }, mockStreamDelayMs);
      });

      req.on('close', () => {
        // Connection closed by client or finished
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      serverPort = addr.port;
      serverUrl = `http://127.0.0.1:${serverPort}`;
      done();
    });
  });

  after((_, done) => {
    server.close(done);
  });

  let queue: InferenceQueueManager;

  beforeEach(() => {
    queue = new InferenceQueueManager();
    queue.resetForTesting({
      maxConcurrent: 1,
      maxQueueSize: 3,
      queueTimeoutMs: 250,
      retryAfterSecs: 5,
    });
    mockStreamDelayMs = 15;
    mockShouldFailMidway = false;
    mockHttpStatus = 200;
  });

  /**
   * Helper function mimicking the streaming chat execution lifecycle in chat.routes.ts
   */
  async function executeChatStream(
    requestId: string,
    signal?: AbortSignal,
    options?: { model?: string; keepAlive?: string }
  ) {
    let releaseSlot: (() => void) | null = null;
    let fullText = '';
    let completed = false;

    try {
      releaseSlot = await queue.acquire(requestId, signal);

      const res = await axios.post(
        `${serverUrl}/api/chat`,
        {
          model: options?.model || 'qwen2.5:3b',
          messages: [{ role: 'user', content: 'Hello test' }],
          stream: true,
          keep_alive: options?.keepAlive || '30m',
        },
        {
          responseType: 'stream',
          timeout: 5000,
          signal,
        }
      );

      await new Promise<void>((resolve, reject) => {
        res.data.on('data', (chunk: Buffer) => {
          const lines = chunk.toString('utf-8').split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.message?.content) {
                fullText += parsed.message.content;
              }
              if (parsed.done) {
                completed = true;
              }
            } catch (_) {}
          }
        });

        res.data.on('end', () => {
          if (releaseSlot) {
            releaseSlot();
            releaseSlot = null;
          }
          resolve();
        });

        res.data.on('error', (err: any) => {
          if (releaseSlot) {
            releaseSlot();
            releaseSlot = null;
          }
          reject(err);
        });
      });

      return { status: 'completed', fullText, completed };
    } catch (err: any) {
      if (releaseSlot) {
        releaseSlot();
        releaseSlot = null;
      }
      throw err;
    }
  }

  it('1. Concurrent Requests: processes multiple requests sequentially under single-slot constraint', async () => {
    const results: string[] = [];

    // Launch 3 requests concurrently
    const p1 = executeChatStream('req-1').then((res) => results.push(`req-1:${res.fullText}`));
    const p2 = executeChatStream('req-2').then((res) => results.push(`req-2:${res.fullText}`));
    const p3 = executeChatStream('req-3').then((res) => results.push(`req-3:${res.fullText}`));

    await Promise.all([p1, p2, p3]);

    assert.strictEqual(results.length, 3);
    assert.deepStrictEqual(results, [
      'req-1:Mock response.',
      'req-2:Mock response.',
      'req-3:Mock response.',
    ]);

    const metrics = queue.getMetrics();
    assert.strictEqual(metrics.activeCount, 0, 'Active slots must return to 0');
    assert.strictEqual(metrics.queuedCount, 0, 'Queue must be empty');
    assert.strictEqual(metrics.totalAcquired, 3);
    assert.strictEqual(metrics.totalCompleted, 3);
    assert.strictEqual(lastReceivedPayload.keep_alive, '30m', 'keep_alive config must be sent to Ollama');
  });

  it('2. Queue Overflow: rejects excess requests immediately with 429 INFERENCE_OVERLOAD', async () => {
    // maxConcurrent = 1, maxQueueSize = 3 -> Total capacity = 4
    // Send 6 requests simultaneously
    const promises: Promise<any>[] = [];
    const errors: any[] = [];

    for (let i = 1; i <= 6; i++) {
      promises.push(
        executeChatStream(`overflow-req-${i}`).catch((err) => {
          errors.push({ id: `overflow-req-${i}`, err });
        })
      );
    }

    await Promise.all(promises);

    const metrics = queue.getMetrics();
    // Exactly 4 requests should succeed (1 active + 3 queued), 2 requests must be rejected immediately
    assert.strictEqual(metrics.totalCompleted, 4, '4 requests must complete');
    assert.strictEqual(metrics.totalRejected, 2, '2 requests must be rejected due to queue overflow');
    assert.strictEqual(errors.length, 2);

    for (const rejected of errors) {
      assert.ok(rejected.err instanceof InferenceOverloadError);
      assert.strictEqual(rejected.err.code, 'INFERENCE_OVERLOAD');
      assert.strictEqual(rejected.err.status, 429);
      assert.strictEqual(rejected.err.retryAfter, 5);
    }

    assert.strictEqual(metrics.activeCount, 0);
    assert.strictEqual(metrics.queuedCount, 0);
  });

  it('3. Queue Timeout: requests waiting longer than timeout reject with 504 and release queue slot', async () => {
    // Set queue timeout to 40ms, while each stream takes ~60ms
    queue.resetForTesting({
      maxConcurrent: 1,
      maxQueueSize: 3,
      queueTimeoutMs: 40,
    });
    mockStreamDelayMs = 30; // 30ms * 2 = ~60ms generation

    const p1 = executeChatStream('slow-active');
    let timeoutError: any = null;

    const p2 = executeChatStream('timed-out-waiter').catch((err) => {
      timeoutError = err;
    });

    await Promise.allSettled([p1, p2]);

    assert.ok(timeoutError instanceof InferenceQueueTimeoutError);
    assert.strictEqual(timeoutError.code, 'INFERENCE_QUEUE_TIMEOUT');
    assert.strictEqual(timeoutError.status, 504);

    const metrics = queue.getMetrics();
    assert.strictEqual(metrics.totalTimedOut, 1);
    assert.strictEqual(metrics.activeCount, 0);
    assert.strictEqual(metrics.queuedCount, 0);
  });

  it('4. Client Disconnect (In Queue): abort signal evicts waiter without executing Ollama inference', async () => {
    mockStreamDelayMs = 40;
    const p1 = executeChatStream('active-task');

    const abortCtrl = new AbortController();
    let abortedErr: any = null;

    const p2 = executeChatStream('aborted-waiter', abortCtrl.signal).catch((err) => {
      abortedErr = err;
    });

    // Abort client while it is waiting in queue
    setTimeout(() => {
      abortCtrl.abort();
    }, 10);

    await Promise.allSettled([p1, p2]);

    assert.ok(abortedErr instanceof InferenceAbortedError);
    assert.strictEqual(abortedErr.code, 'INFERENCE_ABORTED');
    assert.strictEqual(abortedErr.status, 499);

    const metrics = queue.getMetrics();
    assert.strictEqual(metrics.totalAborted, 1);
    assert.strictEqual(metrics.activeCount, 0);
    assert.strictEqual(metrics.queuedCount, 0);
  });

  it('5. Client Disconnect (Mid-Stream): abort signal cancels axios request and releases slot', async () => {
    mockStreamDelayMs = 50;
    const abortCtrl = new AbortController();
    let streamErr: any = null;

    const streamPromise = executeChatStream('streaming-task', abortCtrl.signal).catch((err) => {
      streamErr = err;
    });

    // Abort client after stream has begun
    setTimeout(() => {
      abortCtrl.abort();
    }, 25);

    await streamPromise;

    assert.ok(streamErr, 'Stream should throw on client abort');
    assert.ok(
      axios.isCancel(streamErr) || streamErr?.name === 'CanceledError' || streamErr?.code === 'ERR_CANCELED',
      'Error must be an axios CanceledError'
    );

    // Verify slot is completely freed
    const metrics = queue.getMetrics();
    assert.strictEqual(metrics.activeCount, 0, 'Slot must be freed even on mid-stream abort');
  });

  it('6. Stream Error: mock Ollama server error triggers slot cleanup and error handling', async () => {
    mockShouldFailMidway = true;
    mockStreamDelayMs = 10;

    let streamError: any = null;
    try {
      await executeChatStream('failing-stream');
    } catch (err: any) {
      streamError = err;
    }

    assert.ok(streamError, 'Stream must throw on server socket destruction');

    const metrics = queue.getMetrics();
    assert.strictEqual(metrics.activeCount, 0, 'Slot must be released immediately after stream error');
    assert.strictEqual(metrics.queuedCount, 0);
  });

  it('7. Full Recovery: queue continues processing clean requests after multiple failures', async () => {
    // 1. Trigger an HTTP 500 error from mock Ollama
    mockHttpStatus = 500;
    await assert.rejects(async () => {
      await executeChatStream('http-500-test');
    });
    assert.strictEqual(queue.getMetrics().activeCount, 0);

    // 2. Trigger an abort
    mockHttpStatus = 200;
    const ctrl = new AbortController();
    ctrl.abort();
    await assert.rejects(async () => {
      await executeChatStream('pre-aborted-test', ctrl.signal);
    });
    assert.strictEqual(queue.getMetrics().activeCount, 0);

    // 3. Send a normal healthy request to confirm complete recovery
    const recoveryResult = await executeChatStream('recovery-req');
    assert.strictEqual(recoveryResult.status, 'completed');
    assert.strictEqual(recoveryResult.fullText, 'Mock response.');

    const finalMetrics = queue.getMetrics();
    assert.strictEqual(finalMetrics.totalCompleted, 2, 'Both acquired slots must be completed/released');
    assert.strictEqual(finalMetrics.totalAborted, 1, 'Pre-aborted request must be recorded as aborted');
  });

  it('8. Multi-Slot Concurrency Draining: drains all free slots without starvation when maxConcurrent > 1', async () => {
    // Configure 2 concurrent slots
    queue.resetForTesting({
      maxConcurrent: 2,
      maxQueueSize: 4,
      queueTimeoutMs: 500,
    });
    mockStreamDelayMs = 25;

    const startedTimes: Record<string, number> = {};
    const finishedTimes: Record<string, number> = {};

    async function monitoredStream(id: string) {
      startedTimes[id] = Date.now();
      const res = await executeChatStream(id);
      finishedTimes[id] = Date.now();
      return res;
    }

    // Launch 4 requests simultaneously:
    // Slot 1 & 2 run concurrently. Slot 3 & 4 queue up.
    // When slot 1 & 2 finish, both slot 3 & 4 should run concurrently!
    const [r1, r2, r3, r4] = await Promise.all([
      monitoredStream('con-1'),
      monitoredStream('con-2'),
      monitoredStream('con-3'),
      monitoredStream('con-4'),
    ]);

    assert.strictEqual(r1.completed, true);
    assert.strictEqual(r2.completed, true);
    assert.strictEqual(r3.completed, true);
    assert.strictEqual(r4.completed, true);

    const metrics = queue.getMetrics();
    assert.strictEqual(metrics.totalCompleted, 4);
    assert.strictEqual(metrics.activeCount, 0);
    assert.strictEqual(metrics.queuedCount, 0);
  });
});
