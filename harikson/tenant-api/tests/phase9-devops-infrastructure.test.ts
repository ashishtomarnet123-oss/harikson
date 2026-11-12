import http from 'http';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import express from 'express';
import crypto from 'crypto';
import metrics from '../src/observability/metrics.js';
import { metricsAuthGuard } from '../src/middleware/metricsAuth.js';

const require = createRequire(import.meta.url);
const yaml = require('../../../node_modules/js-yaml');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Phase 9 — DevOps & Infrastructure Test Suite', () => {
  const rootDir = path.resolve(__dirname, '../../..');
  const composePath = path.join(rootDir, 'docker-compose.yml');
  const prometheusPath = path.join(rootDir, 'monitoring/prometheus.yml');
  const alertRulesPath = path.join(rootDir, 'monitoring/alert_rules.yml');
  const dynamicTraefikPath = path.join(rootDir, 'traefik/dynamic.yml');
  const helmValuesPath = path.join(rootDir, 'k8s/helm/harikson/values.yaml');
  const helmSecretsPath = path.join(rootDir, 'k8s/helm/harikson/templates/secrets.yaml');
  const helmDeploymentPath = path.join(rootDir, 'k8s/helm/harikson/templates/deployment-tenant-api.yaml');

  // ─── 1. Prometheus Configuration & Target Accuracy ─────────────────────────────
  it('1. Prometheus Scrape Targets: targets admin-api on port 4000 and tenant-api on port 3008', () => {
    const rawYaml = fs.readFileSync(prometheusPath, 'utf8');
    const doc = yaml.load(rawYaml) as any;

    const jobs = doc.scrape_configs || [];
    const adminJob = jobs.find((j: any) => j.job_name === 'harikson-admin-api');
    const tenantJob = jobs.find((j: any) => j.job_name === 'harikson-tenant-api');
    const cadvisorJob = jobs.find((j: any) => j.job_name === 'cadvisor');

    assert.ok(adminJob, 'harikson-admin-api job must exist in prometheus.yml');
    assert.strictEqual(adminJob.static_configs[0].targets[0], 'admin-api:4000', 'admin-api must be scraped on port 4000');
    assert.strictEqual(adminJob.metrics_path, '/admin/metrics');

    assert.ok(tenantJob, 'harikson-tenant-api job must exist in prometheus.yml');
    assert.strictEqual(tenantJob.static_configs[0].targets[0], 'tenant-api:3008', 'tenant-api must be scraped on port 3008');
    assert.strictEqual(tenantJob.metrics_path, '/metrics');

    assert.strictEqual(cadvisorJob, undefined, 'Stale nv-cadvisor:8080 target must be eliminated');
  });

  it('2. Prometheus Bearer Token File: exists on disk and is configured for authenticated scrapers', () => {
    const rawYaml = fs.readFileSync(prometheusPath, 'utf8');
    const doc = yaml.load(rawYaml) as any;

    const jobs = doc.scrape_configs || [];
    const tenantJob = jobs.find((j: any) => j.job_name === 'harikson-tenant-api');
    assert.strictEqual(tenantJob.bearer_token_file, '/etc/prometheus/metrics_token');

    const tokenPath = path.join(rootDir, 'monitoring/metrics_token');
    assert.ok(fs.existsSync(tokenPath), 'monitoring/metrics_token file must exist');
    const tokenContent = fs.readFileSync(tokenPath, 'utf8').trim();
    assert.ok(tokenContent.length >= 32, 'Metrics bearer token must be at least 32 characters');
  });

  // ─── 2. Metrics Endpoint Authentication & Scrape Guard ─────────────────────────
  it('3. Metrics Endpoint Auth: blocks unauthorized requests and allows Bearer token / internal secret', async () => {
    const testSecret = 'test-secret-devops-infra-metrics-32-chars-long';
    process.env.METRICS_BEARER_TOKEN = testSecret;
    process.env.INTERNAL_API_SECRET = testSecret;

    const testApp = express();
    testApp.use((req, _res, next) => {
      // Mock simulated external non-internal IP unless explicitly testing internal IP
      if (!req.headers['x-test-internal-ip']) {
        Object.defineProperty(req.socket, 'remoteAddress', { value: '203.0.113.195', configurable: true });
      }
      next();
    });
    testApp.get('/metrics', metricsAuthGuard, (_req, res) => {
      res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.status(200).send(metrics.getPrometheusFormat());
    });

    const server = http.createServer(testApp);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      // 1. Unauthorized from external IP without credentials
      const extBlocked = await fetch(`${baseUrl}/metrics`);
      assert.strictEqual(extBlocked.status, 403, 'External IP without auth must return 403 Forbidden');

      // 2. Authorized via Bearer token
      const bearerAllowed = await fetch(`${baseUrl}/metrics`, {
        headers: { Authorization: `Bearer ${testSecret}` },
      });
      assert.strictEqual(bearerAllowed.status, 200);
      const bearerText = await bearerAllowed.text();
      assert.ok(bearerText.includes('harikson_token_usage_total'));

      // 3. Authorized via x-internal-secret header
      const secretAllowed = await fetch(`${baseUrl}/metrics`, {
        headers: { 'x-internal-secret': testSecret },
      });
      assert.strictEqual(secretAllowed.status, 200);
      const secretText = await secretAllowed.text();
      assert.ok(secretText.includes('harikson_token_usage_total'));
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // ─── 3. Traefik TLS & Router Configuration ─────────────────────────────────────
  it('4. Traefik Routing & TLS: all public routers use Let\'s Encrypt resolver and TLS options enforce TLS 1.2+', () => {
    const composeContent = fs.readFileSync(composePath, 'utf8');
    const composeDoc = (yaml.load(composeContent) as any);

    const services = composeDoc.services;
    const routerLabels = [
      services['tenant-api'].labels,
      services['admin-api'].labels,
      services['admin-panel'].labels,
      services['user-portal'].labels,
      services['grafana'].labels,
    ];

    for (const labels of routerLabels) {
      const hasResolver = labels.some((l: string) => l.includes('tls.certresolver=letsencrypt'));
      assert.ok(hasResolver, 'All public services must configure tls.certresolver=letsencrypt');
    }

    // Validate dynamic TLS options
    const dynamicContent = fs.readFileSync(dynamicTraefikPath, 'utf8');
    const dynamicDoc = (yaml.load(dynamicContent) as any);

    assert.ok(dynamicDoc.tls?.options?.default, 'default TLS options must be defined in traefik/dynamic.yml');
    assert.strictEqual(dynamicDoc.tls.options.default.minVersion, 'VersionTLS12');
    assert.strictEqual(dynamicDoc.tls.options.default.sniStrict, true);
    assert.ok(dynamicDoc.tls.options.default.cipherSuites.length >= 5);
  });

  // ─── 4. Resource Limits & Cgroup Constraints ───────────────────────────────────
  it('5. Resource Limits: all containers define explicit CPU and memory cgroup limits', () => {
    const composeContent = fs.readFileSync(composePath, 'utf8');
    const composeDoc = (yaml.load(composeContent) as any);

    const requiredServices = [
      'traefik',
      'ollama',
      'postgres',
      'redis',
      'orchestrator',
      'tenant-api',
      'admin-api',
      'admin-panel',
      'user-portal',
      'prometheus',
      'grafana',
    ];

    for (const svcName of requiredServices) {
      const svc = composeDoc.services[svcName];
      assert.ok(svc, `Service ${svcName} must exist in docker-compose.yml`);
      const limits = svc.deploy?.resources?.limits;
      assert.ok(limits, `Service ${svcName} must define deploy.resources.limits`);
      assert.ok(limits.memory, `Service ${svcName} must define memory limit`);
      assert.ok(limits.cpus, `Service ${svcName} must define cpu limit`);
    }
  });

  // ─── 5. Healthcheck Coverage ───────────────────────────────────────────────────
  it('6. Container Health Checks: all services declare automated healthchecks with intervals and timeouts', () => {
    const composeContent = fs.readFileSync(composePath, 'utf8');
    const composeDoc = (yaml.load(composeContent) as any);

    const healthCheckedServices = [
      'traefik',
      'ollama',
      'postgres',
      'redis',
      'orchestrator',
      'tenant-api',
      'admin-api',
      'admin-panel',
      'user-portal',
      'prometheus',
      'grafana',
    ];

    for (const svcName of healthCheckedServices) {
      const svc = composeDoc.services[svcName];
      assert.ok(svc.healthcheck, `Service ${svcName} must define a healthcheck`);
      assert.ok(svc.healthcheck.test, `Service ${svcName} healthcheck must declare test command`);
      assert.ok(svc.healthcheck.interval, `Service ${svcName} healthcheck must declare interval`);
      assert.ok(svc.healthcheck.timeout, `Service ${svcName} healthcheck must declare timeout`);
    }
  });

  // ─── 6. Redis Memory Policy & BullMQ Protection ────────────────────────────────
  it('7. Redis Eviction & Memory: protects BullMQ jobs using maxmemory ceiling and volatile-lru eviction', () => {
    const composeContent = fs.readFileSync(composePath, 'utf8');
    const composeDoc = (yaml.load(composeContent) as any);

    const redisCmd = composeDoc.services.redis.command;
    assert.ok(redisCmd.includes('--maxmemory'), 'Redis must specify --maxmemory to prevent OOM termination');
    assert.ok(redisCmd.includes('--maxmemory-policy noeviction') || redisCmd.includes('--maxmemory-policy volatile-lru'), 'Redis must use noeviction or volatile-lru to prevent BullMQ job eviction');
    assert.ok(redisCmd.includes('--appendonly yes'), 'Redis must enable AOF persistence');
  });

  // ─── 7. Host Port Exposure Hardening ───────────────────────────────────────────
  it('8. Port Exposure: internal microservices are isolated from public 0.0.0.0 host binding', () => {
    const composeContent = fs.readFileSync(composePath, 'utf8');
    const composeDoc = (yaml.load(composeContent) as any);

    // Only Traefik is permitted public host port exposure (80, 443)
    const publicServices: string[] = [];
    for (const [name, svc] of Object.entries<any>(composeDoc.services)) {
      if (svc.ports) {
        for (const port of svc.ports) {
          if (!port.startsWith('127.0.0.1:')) {
            publicServices.push(`${name}:${port}`);
          }
        }
      }
    }

    assert.deepStrictEqual(
      publicServices.sort(),
      ['traefik:443:443', 'traefik:80:80'],
      'Only Traefik ports 80 and 443 may be exposed on public host interfaces'
    );
  });

  // ─── 8. Kubernetes & Helm Manifest Consistency ─────────────────────────────────
  it('9. Kubernetes Consistency: Helm values and templates align with production ports, secrets, and limits', () => {
    const helmValues = (yaml.load(fs.readFileSync(helmValuesPath, 'utf8')) as any);
    assert.strictEqual(helmValues.tenantApi.service.port, 3008, 'K8s tenantApi port must align to 3008');
    assert.strictEqual(helmValues.adminApi.service.port, 4000, 'K8s adminApi port must align to 4000');
    assert.strictEqual(helmValues.userPortal.service.port, 3002, 'K8s userPortal port must align to 3002');
    assert.strictEqual(helmValues.adminPanel.service.port, 3001, 'K8s adminPanel port must align to 3001');

    const secretsContent = fs.readFileSync(helmSecretsPath, 'utf8');
    assert.ok(secretsContent.includes('tenant-master-key:'), 'K8s secrets must contain tenant-master-key');
    assert.ok(secretsContent.includes('internal-api-secret:'), 'K8s secrets must contain internal-api-secret');

    const deployContent = fs.readFileSync(helmDeploymentPath, 'utf8');
    assert.ok(deployContent.includes('name: TENANT_MASTER_KEY'), 'tenant-api deployment must map TENANT_MASTER_KEY');
    assert.ok(deployContent.includes('name: INTERNAL_API_SECRET'), 'tenant-api deployment must map INTERNAL_API_SECRET');
  });

  // ─── 9. Alerting Rules Integrity ───────────────────────────────────────────────
  it('10. Alerting Rules: monitoring/alert_rules.yml contains syntax-valid rules matching real metrics', () => {
    const rulesContent = fs.readFileSync(alertRulesPath, 'utf8');
    const doc = (yaml.load(rulesContent) as any);

    assert.ok(doc.groups && doc.groups.length >= 4, 'alert_rules.yml must define at least 4 rule groups');
    const ruleNames = doc.groups.flatMap((g: any) => g.rules.map((r: any) => r.alert));

    assert.ok(ruleNames.includes('ServiceDown'));
    assert.ok(ruleNames.includes('PostgresDown'));
    assert.ok(ruleNames.includes('HighDatabaseConnections'));
    assert.ok(ruleNames.includes('HighErrorRate'));
    assert.ok(ruleNames.includes('SustainedWebhookFailures'));
    assert.ok(ruleNames.includes('BillingReconciliationMismatchDetected'));
  });

  // ─── 10. Backup Scripts & Disaster Recovery ────────────────────────────────────
  it('11. Disaster Recovery & Backup Integrity: backup scripts verify SHA-256 and validate dump headers', () => {
    const backupScript = fs.readFileSync(path.join(rootDir, 'scripts/backup.sh'), 'utf8');
    const verifyScript = fs.readFileSync(path.join(rootDir, 'scripts/verify_backup.sh'), 'utf8');

    assert.ok(backupScript.includes('.sha256'), 'backup.sh must produce cryptographic sha256 checksum');
    assert.ok(backupScript.includes('gzip'), 'backup.sh must compress database dumps');

    assert.ok(verifyScript.includes('PostgreSQL database dump'), 'verify_backup.sh must validate dump header');
    assert.ok(verifyScript.includes('ACTUAL_HASH'), 'verify_backup.sh must verify checksum');
    assert.ok(verifyScript.includes('STAGING_DB='), 'verify_backup.sh must execute isolated staging restore drill');
    assert.ok(verifyScript.includes('TABLE_COUNT='), 'verify_backup.sh must audit restored table counts');
  });
});
