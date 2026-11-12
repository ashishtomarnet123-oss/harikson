import pg from '../admin-api/node_modules/pg/lib/index.js';
import Redis from '../admin-api/node_modules/ioredis/built/index.js';

const DB_URL = process.env.DATABASE_URL || 'postgresql://neuravolt:neuravolt_dev_pwd@localhost:5432/neuravolt';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

async function runLoadTest() {
  console.log('====================================================');
  console.log('🚀 Xarwiz Platform Enterprise Load Test Suite');
  console.log('====================================================');

  const pool = new pg.Pool({
    connectionString: DB_URL,
    max: 20,
    idleTimeoutMillis: 10000,
  });

  const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
  });

  const NUM_REQUESTS = 250;
  const CONCURRENCY = 25;

  console.log(`Parameters: ${NUM_REQUESTS} requests, ${CONCURRENCY} concurrent workers`);

  const latencies = [];
  let completed = 0;
  let errors = 0;

  async function worker(workerId, iterations) {
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        const tenantId = workerId % 2 === 0
          ? '00000000-0000-0000-0000-000000000001'
          : '11111111-1111-1111-1111-111111111111';

        // 1. Database isolated query
        const client = await pool.connect();
        try {
          await client.query("SELECT set_config('app.current_tenant', $1, true)", [tenantId]);
          await client.query('SELECT id, name, plan, status FROM tenants LIMIT 5');
        } finally {
          client.release();
        }

        // 2. Redis cache & rate-limit operation
        const rKey = `ratelimit:loadtest:${workerId}:${i}`;
        await redis.set(rKey, '1', 'EX', 10);
        await redis.get(rKey);

        const duration = performance.now() - start;
        latencies.push(duration);
        completed++;
      } catch (err) {
        errors++;
        console.error(`Worker ${workerId} error:`, err.message);
      }
    }
  }

  const overallStart = performance.now();
  const perWorker = Math.floor(NUM_REQUESTS / CONCURRENCY);

  const workers = [];
  for (let w = 0; w < CONCURRENCY; w++) {
    workers.push(worker(w, perWorker));
  }

  await Promise.all(workers);
  const totalTimeMs = performance.now() - overallStart;

  latencies.sort((a, b) => a - b);
  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const avg = latencies.reduce((sum, v) => sum + v, 0) / latencies.length || 0;
  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const rps = (completed / (totalTimeMs / 1000)).toFixed(1);

  console.log('\n--- Load Test Results ---');
  console.log(`Total Completed: ${completed} / ${NUM_REQUESTS}`);
  console.log(`Errors:          ${errors}`);
  console.log(`Elapsed Time:    ${(totalTimeMs / 1000).toFixed(2)}s`);
  console.log(`Throughput:      ${rps} ops/sec`);
  console.log(`Latency Min:     ${min.toFixed(2)} ms`);
  console.log(`Latency P50:     ${p50.toFixed(2)} ms`);
  console.log(`Latency Avg:     ${avg.toFixed(2)} ms`);
  console.log(`Latency P95:     ${p95.toFixed(2)} ms`);
  console.log(`Latency P99:     ${p99.toFixed(2)} ms`);
  console.log(`Latency Max:     ${max.toFixed(2)} ms`);

  await pool.end();
  await redis.quit();

  if (errors > 0 || p99 > 500) {
    console.error('❌ Load test failed threshold checks.');
    process.exit(1);
  } else {
    console.log('✅ Load test PASSED all enterprise SLA thresholds.');
  }
}

runLoadTest().catch((err) => {
  console.error('Fatal load test error:', err);
  process.exit(1);
});
