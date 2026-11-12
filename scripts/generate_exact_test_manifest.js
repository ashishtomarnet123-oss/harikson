#!/usr/bin/env node

/**
 * Xarwiz Machine-Readable Test Manifest Generator & Deep Reconciler
 * Executes all active test suites and outputs exact test cases, suites, files, and counts.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const testSuites = [
  { file: 'tests/phase1-admin-auth-security.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/phase2-checkout-integrity.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/phase3-multi-tenant-isolation.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/phase4-billing-financial-integrity.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/phase5-payment-gateways-webhooks.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/phase6-admin-user-panel-widget.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/phase7-api-standardization-contract.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/phase8-database-reliability-integrity.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/phase9-devops-infrastructure.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/phase10-auth-and-security.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/phase10-billing-and-payments.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/phase10-core-workflows-documents-agents.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/phase10-e2e-contracts-regression.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/phase11-ai-security-hardening.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/phase13-enterprise-readiness-acceptance.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/universal-pdf-suite.test.ts', dir: 'harikson/tenant-api', runner: 'tsx' },
  { file: 'tests/audit-trail-entitlement.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/custom-models-entitlement.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/dpdp-compliance-entitlement.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/priority-support-entitlement.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/sla-hours-entitlement.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/webhook-logging-entitlement.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/cashfree.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/phonepe.test.ts', dir: 'harikson/tenant-api' },
  { file: 'tests/admin-auth.test.js', dir: 'admin-api', runner: 'node' },
];

const manifest = {
  generatedAt: new Date().toISOString(),
  environment: {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  summary: {
    totalTestFiles: testSuites.length,
    totalSuites: 0,
    totalIndividualTests: 0,
    totalPassed: 0,
    totalFailed: 0,
    totalSkipped: 0,
  },
  suites: [],
};

console.log('========================================================================');
console.log('🧪 XARWIZ PLATFORM AUTHORITATIVE TEST RUNNER & MANIFEST BUILDER');
console.log('========================================================================\n');

for (const suiteInfo of testSuites) {
  const fullPath = path.resolve(process.cwd(), suiteInfo.dir, suiteInfo.file);
  const suiteDir = path.resolve(process.cwd(), suiteInfo.dir);
  
  let cmd = '';
  if (suiteInfo.runner === 'tsx') {
    cmd = `./node_modules/.bin/tsx ${suiteInfo.file}`;
  } else if (suiteInfo.runner === 'node') {
    cmd = `node --test ${suiteInfo.file}`;
  } else {
    cmd = `./node_modules/.bin/tsx --test ${suiteInfo.file}`;
  }

  process.stdout.write(`▶ Running: [${suiteInfo.dir}] ${suiteInfo.file}... `);

  const t0 = performance.now();
  try {
    const output = execSync(cmd, {
      cwd: suiteDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TENANT_MASTER_KEY: '01234567890123456789012345678901',
        JWT_SECRET: '01234567890123456789012345678901',
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://neuravolt:neuravolt_dev_pwd@localhost:5432/neuravolt',
        MIGRATION_DATABASE_URL: 'postgresql://xarwiz_migrator:migrator_secure_password_vault@localhost:5432/neuravolt',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const durationMs = Math.round(performance.now() - t0);

    // Extract tests and suites from native test reporter
    const passMatch = output.match(/ℹ pass (\d+)/);
    const failMatch = output.match(/ℹ fail (\d+)/);
    const skipMatch = output.match(/ℹ skipped (\d+)/);
    const suitesMatch = output.match(/ℹ suites (\d+)/);

    let passed = passMatch ? parseInt(passMatch[1], 10) : 0;
    const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
    const skipped = skipMatch ? parseInt(skipMatch[1], 10) : 0;
    const suitesCount = suitesMatch ? parseInt(suitesMatch[1], 10) : 1;

    // For universal-pdf-suite which has custom pass banner
    if (suiteInfo.file.includes('universal-pdf-suite')) {
      const pdfPassMatch = output.match(/ALL (\d+)\/(\d+) TESTS PASSED/);
      if (pdfPassMatch) {
        passed = parseInt(pdfPassMatch[1], 10);
      }
    }

    manifest.summary.totalSuites += suitesCount;
    manifest.summary.totalIndividualTests += (passed + failed + skipped);
    manifest.summary.totalPassed += passed;
    manifest.summary.totalFailed += failed;
    manifest.summary.totalSkipped += skipped;

    // Parse individual test case lines
    const testLines = [];
    const lines = output.split('\n');
    for (const l of lines) {
      const trimmed = l.trim();
      if (trimmed.startsWith('✔ ') || trimmed.startsWith('✓ [PASS]')) {
        testLines.push(trimmed.replace(/^[✔✓\s\[PASS\]]+/, '').trim());
      }
    }

    manifest.suites.push({
      file: `${suiteInfo.dir}/${suiteInfo.file}`,
      command: cmd,
      passed,
      failed,
      skipped,
      suitesCount,
      durationMs,
      testCasesCount: testLines.length,
      sampleTests: testLines.slice(0, 5),
    });

    console.log(`✅ ${passed} passed (${durationMs}ms)`);
  } catch (err) {
    console.log(`❌ FAILED`);
    manifest.summary.totalFailed += 1;
    manifest.suites.push({
      file: `${suiteInfo.dir}/${suiteInfo.file}`,
      command: cmd,
      error: err.message.slice(0, 200),
      passed: 0,
      failed: 1,
      skipped: 0,
    });
  }
}

console.log('\n========================================================================');
console.log('📊 RECONCILED TEST MANIFEST SUMMARY');
console.log('========================================================================');
console.log(`  Total Active Test Files       : ${manifest.summary.totalTestFiles}`);
console.log(`  Total Active Test Suites      : ${manifest.summary.totalSuites}`);
console.log(`  Total Individual Test Cases   : ${manifest.summary.totalIndividualTests}`);
console.log(`  Total Passing Tests           : ${manifest.summary.totalPassed}`);
console.log(`  Total Failing Tests           : ${manifest.summary.totalFailed}`);
console.log(`  Total Skipped Tests           : ${manifest.summary.totalSkipped}`);
console.log('========================================================================\n');

fs.writeFileSync('test_manifest.json', JSON.stringify(manifest, null, 2), 'utf8');
console.log('💾 Machine-readable manifest saved to: test_manifest.json\n');
