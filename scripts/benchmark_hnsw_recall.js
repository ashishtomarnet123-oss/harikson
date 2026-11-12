import pg from '../admin-api/node_modules/pg/lib/index.js';
import { performance } from 'perf_hooks';

const DB_URL = process.env.DATABASE_URL || 'postgresql://neuravolt:neuravolt_dev_pwd@localhost:5432/neuravolt';

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

async function main() {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();

  console.log('========================================================================');
  console.log('🔬 Xarwiz Deep Vector Search Ground Truth & HNSW Recall Evaluation');
  console.log('========================================================================');

  const NUM_VECTORS = 1500;
  const DIM = 1536;
  const NUM_QUERIES = 25;

  await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
  await client.query('DROP TABLE IF EXISTS bench_vector_eval;');
  await client.query(`
    CREATE TABLE bench_vector_eval (
      id SERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      embedding VECTOR(${DIM}) NOT NULL
    );
  `);

  console.log(`📦 Generating and inserting ${NUM_VECTORS} vectors (dim: ${DIM})...`);
  const tenantId = '00000000-0000-0000-0000-000000000001';
  
  for (let b = 0; b < NUM_VECTORS / 100; b++) {
    const rows = [];
    for (let j = 0; j < 100; j++) {
      const raw = Array.from({ length: DIM }, () => (Math.random() - 0.5) * 2);
      const norm = Math.sqrt(raw.reduce((s, v) => s + v * v, 0));
      const unit = raw.map(v => (v / norm).toFixed(5));
      rows.push(`('${tenantId}', '[${unit.join(',')}]')`);
    }
    await client.query(`INSERT INTO bench_vector_eval (tenant_id, embedding) VALUES ${rows.join(',')};`);
  }

  // Pre-generate query vectors
  const queryVectors = [];
  for (let q = 0; q < NUM_QUERIES; q++) {
    const raw = Array.from({ length: DIM }, () => (Math.random() - 0.5) * 2);
    const norm = Math.sqrt(raw.reduce((s, v) => s + v * v, 0));
    queryVectors.push(`[${raw.map(v => (v / norm).toFixed(5)).join(',')}]`);
  }

  // 1. Compute Exact Ground Truth for Recall@5 and Recall@10
  console.log('🎯 Computing exact brute-force ground truth (enable_indexscan = OFF)...');
  await client.query('SET enable_indexscan = OFF;');
  const groundTruth10 = [];
  const groundTruth5 = [];
  const flatLatencies = [];

  for (let q = 0; q < NUM_QUERIES; q++) {
    const t0 = performance.now();
    const res = await client.query('SELECT id FROM bench_vector_eval WHERE tenant_id = $1 ORDER BY embedding <=> $2 LIMIT 10;', [tenantId, queryVectors[q]]);
    flatLatencies.push(performance.now() - t0);
    const ids = res.rows.map(r => r.id);
    groundTruth10.push(new Set(ids));
    groundTruth5.push(new Set(ids.slice(0, 5)));
  }

  const flatP50 = percentile(flatLatencies, 50).toFixed(2);
  const flatP95 = percentile(flatLatencies, 95).toFixed(2);
  const flatMean = (flatLatencies.reduce((s, v) => s + v, 0) / NUM_QUERIES).toFixed(2);
  console.log(`   └─ Exact Brute Force: Mean: ${flatMean}ms | P50: ${flatP50}ms | P95: ${flatP95}ms | Recall: 100.0% (Baseline)`);

  // 2. Build HNSW Index
  console.log('⚡ Building HNSW index (m = 16, ef_construction = 64)...');
  const tBuildStart = performance.now();
  await client.query('CREATE INDEX idx_eval_hnsw ON bench_vector_eval USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);');
  const buildTimeMs = (performance.now() - tBuildStart).toFixed(1);
  const sizeRes = await client.query("SELECT pg_size_pretty(pg_relation_size('idx_eval_hnsw')) as pretty_size, pg_relation_size('idx_eval_hnsw') as raw_bytes;");
  console.log(`   └─ HNSW Built in ${buildTimeMs}ms. On-disk size: ${sizeRes.rows[0].pretty_size}`);

  await client.query('SET enable_indexscan = ON;');

  // 3. Test across ef_search configurations: 40, 64, 100, 128, 200
  const efConfigs = [40, 64, 100, 128, 200];
  console.log('\n--- HNSW Parameter Sensitivity Benchmark ---');
  console.log('| ef_search | Recall@5  | Recall@10 | Mean Latency | P50 Latency | P95 Latency | P99 Latency |');
  console.log('|:---------:|:---------:|:---------:|:------------:|:-----------:|:-----------:|:-----------:|');

  for (const ef of efConfigs) {
    await client.query(`SET hnsw.ef_search = ${ef};`);
    let recallSum10 = 0;
    let recallSum5 = 0;
    const lats = [];

    for (let q = 0; q < NUM_QUERIES; q++) {
      const t0 = performance.now();
      const res = await client.query('SELECT id FROM bench_vector_eval WHERE tenant_id = $1 ORDER BY embedding <=> $2 LIMIT 10;', [tenantId, queryVectors[q]]);
      lats.push(performance.now() - t0);

      const returnedIds = res.rows.map(r => r.id);
      const matched10 = returnedIds.filter(id => groundTruth10[q].has(id)).length;
      const matched5 = returnedIds.slice(0, 5).filter(id => groundTruth5[q].has(id)).length;

      recallSum10 += (matched10 / 10);
      recallSum5 += (matched5 / 5);
    }

    const rec10 = ((recallSum10 / NUM_QUERIES) * 100).toFixed(1);
    const rec5 = ((recallSum5 / NUM_QUERIES) * 100).toFixed(1);
    const meanL = (lats.reduce((s, v) => s + v, 0) / NUM_QUERIES).toFixed(2);
    const p50L = percentile(lats, 50).toFixed(2);
    const p95L = percentile(lats, 95).toFixed(2);
    const p99L = percentile(lats, 99).toFixed(2);

    console.log(`| ${String(ef).padEnd(9)} | ${rec5.padEnd(9)}% | ${rec10.padEnd(9)}% | ${meanL.padEnd(12)}ms | ${p50L.padEnd(11)}ms | ${p95L.padEnd(11)}ms | ${p99L.padEnd(11)}ms |`);
  }

  await client.query('DROP TABLE IF EXISTS bench_vector_eval;');
  await client.end();
  console.log('\n========================================================================');
  console.log('✅ HNSW BENCHMARK COMPLETED');
  console.log('========================================================================');
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});

