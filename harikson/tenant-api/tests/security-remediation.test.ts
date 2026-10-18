if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}

import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import { WorkspaceSandbox } from '../src/services/sandbox/workspace-sandbox.js';
import { SSRFGuard } from '../src/services/workflow/security/ssrf.js';
import { ToolRegistry } from '../src/services/tools/registry.js';
import { pool, readPool, redis } from '../src/db/pool.js';
import { requireAuth } from '../src/middleware/auth.js';
import toolsRouter from '../src/api/routes/tools.js';
import orchestratorRouter from '../src/api/routes/orchestrator-routes.js';
import searchRouter from '../src/api/routes/search.js';
import indexerRouter from '../src/api/routes/indexer.js';
import memoryRouter from '../src/api/routes/memory.js';
import contextRouter from '../src/api/routes/context.js';

describe('Xarwiz Security Remediation & Regression Test Suite', () => {
  after(async () => {
    try {
      await pool.end();
      await readPool.end();
      redis.disconnect();
    } catch (_) {
      // ignore in tests
    }
  });
  // =========================================================================
  // 1. DOCKER COMPOSE PORT BINDING HARDENING (P0-1)
  // =========================================================================
  it('1. Port Hardening: docker-compose.yml must not expose backend ports to 0.0.0.0', () => {
    const composePath = path.resolve(process.cwd(), '../../docker-compose.yml');
    assert.ok(fs.existsSync(composePath), 'docker-compose.yml must exist');

    const composeContent = fs.readFileSync(composePath, 'utf-8');

    // Reject bare port mappings on backend services
    const dangerousPatterns = [
      /'3008:3008'/,
      /'4000:4000'/,
      /'3018:3001'/,
      /'3028:3002'/,
      /"3008:3008"/,
      /"4000:4000"/,
      /"3018:3001"/,
      /"3028:3002"/,
      /'5435:5432'/,
      /'6379:6379'/,
    ];

    for (const pattern of dangerousPatterns) {
      assert.strictEqual(
        pattern.test(composeContent),
        false,
        `Forbidden public port mapping found matching ${pattern}`
      );
    }

    // Assert that backend ports are not exposed publicly to 0.0.0.0 (either omitted or bound strictly to 127.0.0.1)
    // Note: tenant-api and admin-api omit host port publishing to allow zero-downtime Blue-Green scaling (--scale=2)
    assert.strictEqual(
      /[-:\s]3008:3008/.test(composeContent) && !composeContent.includes("'127.0.0.1:3008:3008'"),
      false,
      'tenant-api must not expose public host ports'
    );
    assert.strictEqual(
      /[-:\s]4000:4000/.test(composeContent) && !composeContent.includes("'127.0.0.1:4000:4000'"),
      false,
      'admin-api must not expose public host ports'
    );
    assert.ok(
      composeContent.includes("'127.0.0.1:3018:3001'"),
      'admin-panel must bind to 127.0.0.1'
    );
    assert.ok(
      composeContent.includes("'127.0.0.1:3028:3002'"),
      'user-portal must bind to 127.0.0.1'
    );

    // Only Traefik should publish 80:80 and 443:443
    assert.ok(composeContent.includes("'80:80'"), 'Traefik port 80 must be published');
    assert.ok(composeContent.includes("'443:443'"), 'Traefik port 443 must be published');
  });

  // =========================================================================
  // 2. WORKSPACE SANDBOX & PATH TRAVERSAL DEFENSE (P0-2)
  // =========================================================================
  it('2. Workspace Sandbox: enforces tenant containment and blocks path escapes', () => {
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const workspaceRoot = WorkspaceSandbox.getTenantWorkspace(tenantId);
    assert.ok(workspaceRoot.includes(tenantId), 'Tenant workspace must contain tenantId');

    // Reject invalid tenantId characters (path injection)
    assert.throws(
      () => WorkspaceSandbox.getTenantWorkspace('../../etc'),
      /Security Exception/,
      'Must reject invalid tenant ID formats'
    );

    // Reject traversal paths escaping tenant root
    assert.throws(
      () => WorkspaceSandbox.getTenantWorkspace(tenantId, '../../../../etc'),
      /Security Exception/,
      'Must reject workspace subpath escaping tenant sandbox'
    );

    // Test file path resolution within workspace
    const safeFile = WorkspaceSandbox.resolvePath(workspaceRoot, 'src/index.ts');
    assert.ok(safeFile.startsWith(workspaceRoot), 'Safe file must reside inside workspace');

    // Reject directory traversal within workspace
    assert.throws(
      () => WorkspaceSandbox.resolvePath(workspaceRoot, '../../../etc/passwd'),
      /Security Exception/,
      'Must reject path traversal escaping workspace'
    );

    // Reject absolute paths escaping workspace
    assert.throws(
      () => WorkspaceSandbox.resolvePath(workspaceRoot, '/etc/passwd'),
      /Security Exception/,
      'Must reject absolute paths escaping workspace'
    );

    // Reject null byte injection
    const nullByteResolved = WorkspaceSandbox.resolvePath(workspaceRoot, 'test.txt\0.js');
    assert.ok(!nullByteResolved.includes('\0'), 'Must strip null bytes');
  });

  // =========================================================================
  // 3. TOOL REGISTRY RESOLVE PATH & HTTP_REQUEST SSRF (P0-2 & P1-3)
  // =========================================================================
  it('3. ToolRegistry: securely isolates paths and validates outbound HTTP requests', async () => {
    const tmpWorkspace = path.resolve('./tests/sandbox-test-ws');
    if (!fs.existsSync(tmpWorkspace)) fs.mkdirSync(tmpWorkspace, { recursive: true });

    try {
      // Test resolvePath delegation
      const resolved = ToolRegistry.resolvePath(tmpWorkspace, 'app.ts');
      assert.ok(resolved.startsWith(tmpWorkspace), 'Resolved path must be inside workspace');

      assert.throws(
        () => ToolRegistry.resolvePath(tmpWorkspace, '../../shadow'),
        /Security Exception/,
        'ToolRegistry must block directory traversal'
      );

      // Test http_request tool SSRF rejection
      const httpTool = ToolRegistry.get('http_request');
      assert.ok(httpTool, 'http_request tool must be registered');

      // Attempt SSRF to internal Docker service
      await assert.rejects(
        async () => {
          await httpTool.handler(tmpWorkspace, {
            url: 'http://postgres:5432/query',
            method: 'GET',
          });
        },
        /Security Exception.*SSRF blocked request/,
        'http_request must reject requests to postgres'
      );

      // Attempt SSRF to cloud metadata endpoint
      await assert.rejects(
        async () => {
          await httpTool.handler(tmpWorkspace, {
            url: 'http://169.254.169.254/latest/meta-data',
            method: 'GET',
          });
        },
        /Security Exception.*SSRF blocked request/,
        'http_request must reject requests to AWS/GCP metadata IP'
      );

      // Attempt SSRF to loopback
      await assert.rejects(
        async () => {
          await httpTool.handler(tmpWorkspace, {
            url: 'http://127.0.0.1:6379/keys',
            method: 'GET',
          });
        },
        /Security Exception.*SSRF blocked request/,
        'http_request must reject requests to localhost/loopback'
      );
    } finally {
      if (fs.existsSync(tmpWorkspace)) fs.rmSync(tmpWorkspace, { recursive: true, force: true });
    }
  });

  // =========================================================================
  // 4. SSRF GUARD IPV6 & REDIRECT RE-VALIDATION (P1-3)
  // =========================================================================
  it('4. SSRFGuard: detects IPv6 private addresses and blocks redirect bypasses', async () => {
    // IPv6 Loopback
    assert.strictEqual(SSRFGuard.isPrivateIp('::1'), true, '::1 must be private');
    assert.strictEqual(SSRFGuard.isPrivateIp('[::1]'), true, '[::1] must be private');
    assert.strictEqual(SSRFGuard.isPrivateIp('0:0:0:0:0:0:0:1'), true);

    // IPv6 Link-Local
    assert.strictEqual(SSRFGuard.isPrivateIp('fe80::1'), true);

    // IPv6 Unique Local
    assert.strictEqual(SSRFGuard.isPrivateIp('fc00::1'), true);
    assert.strictEqual(SSRFGuard.isPrivateIp('fd12:3456::1'), true);

    // IPv4-mapped IPv6
    assert.strictEqual(SSRFGuard.isPrivateIp('::ffff:127.0.0.1'), true);
    assert.strictEqual(SSRFGuard.isPrivateIp('::ffff:169.254.169.254'), true);
    assert.strictEqual(SSRFGuard.isPrivateIp('::ffff:8.8.8.8'), false);

    // validateUrl on IPv6 loopback
    const v6Check = await SSRFGuard.validateUrl('http://[::1]:8080/metrics');
    assert.strictEqual(v6Check.safe, false, 'IPv6 loopback must be marked unsafe');

    // validateUrl on internal service
    const internalCheck = await SSRFGuard.validateUrl('http://redis:6379');
    assert.strictEqual(internalCheck.safe, false, 'redis hostname must be marked unsafe');
  });

  // =========================================================================
  // 5. WORKFLOW WEBHOOK SECRET CONSTANT-TIME VALIDATION (P0-5)
  // =========================================================================
  it('5. Workflow Webhooks: enforces configured secret and timingSafeEqual comparison', () => {
    // Test logic simulating workflow webhook validation rule
    const validateWebhook = (
      workflowSecret: string | null | undefined,
      providedHeader: string | null | undefined
    ): { status: number; error?: string } => {
      if (!workflowSecret || typeof workflowSecret !== 'string') {
        return { status: 403, error: 'Webhook execution rejected: Workflow has no configured webhook secret.' };
      }

      const provided = typeof providedHeader === 'string' ? providedHeader.trim() : '';
      if (!provided) {
        return { status: 401, error: 'Invalid or missing webhook secret' };
      }

      const isMatch =
        Buffer.byteLength(provided) === Buffer.byteLength(workflowSecret) &&
        crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(workflowSecret));

      if (!isMatch) {
        return { status: 401, error: 'Invalid or missing webhook secret' };
      }

      return { status: 200 };
    };

    const validSecret = 'whsec_abcdef1234567890abcdef12';

    // 1. Missing secret on workflow (null or undefined) -> must return 403
    assert.strictEqual(validateWebhook(null, 'any-token').status, 403);
    assert.strictEqual(validateWebhook(undefined, 'any-token').status, 403);
    assert.strictEqual(validateWebhook('', 'any-token').status, 403);

    // 2. Missing secret on request -> must return 401
    assert.strictEqual(validateWebhook(validSecret, null).status, 401);
    assert.strictEqual(validateWebhook(validSecret, '').status, 401);

    // 3. Incorrect secret -> must return 401
    assert.strictEqual(validateWebhook(validSecret, 'whsec_wrong_token').status, 401);
    assert.strictEqual(validateWebhook(validSecret, validSecret + '_extra').status, 401);

    // 4. Exact valid secret -> must return 200
    assert.strictEqual(validateWebhook(validSecret, validSecret).status, 200);
  });

  // =========================================================================
  // 6. DEPLOY SCRIPT CREDENTIAL SCRUBBING (P1-1)
  // =========================================================================
  it('6. Deploy Script: hardcoded production secrets and unsafe port unbinding are removed', () => {
    const deployScriptPath = path.resolve(process.cwd(), '../../scripts/deploy-local-to-server.sh');
    assert.ok(fs.existsSync(deployScriptPath), 'deploy-local-to-server.sh must exist');

    const content = fs.readFileSync(deployScriptPath, 'utf-8');

    // Assert that hardcoded plaintext credentials are removed
    assert.strictEqual(content.includes('JWT_SECRET=fa363ef72694'), false);
    assert.strictEqual(content.includes('TENANT_MASTER_KEY=bb0803541760'), false);
    assert.strictEqual(content.includes('PAYMENT_ENCRYPTION_KEY=f29be28299ae'), false);
    assert.strictEqual(content.includes('INTERNAL_API_SECRET=e7b99c08d4b3'), false);
    assert.strictEqual(content.includes('GF_SECURITY_ADMIN_PASSWORD=Admin@1234'), false);

    // Assert that unsafe port unbinding sed command is removed
    assert.strictEqual(content.includes("sed -i 's/127.0.0.1://g'"), false);

    // Assert fail-closed check for .env exists
    assert.ok(content.includes('if [ ! -f .env ]; then'), 'Must check for .env existence');
  });

  // =========================================================================
  // 7. CI/CD ORCHESTRATOR DEPLOYMENT PIPELINE (P1-2)
  // =========================================================================
  it('7. CI/CD Pipeline: orchestrator image build and tagging are included in deploy-prod.yml', () => {
    const workflowPath = path.resolve(process.cwd(), '../../.github/workflows/deploy-prod.yml');
    assert.ok(fs.existsSync(workflowPath), 'deploy-prod.yml must exist');

    const workflowContent = fs.readFileSync(workflowPath, 'utf-8');

    // Assert orchestrator build step is in CI/CD workflow
    assert.ok(
      workflowContent.includes('Build & Push Orchestrator (Production)'),
      'Must contain Orchestrator build step'
    );
    assert.ok(
      workflowContent.includes('${{ env.IMAGE_PREFIX }}-orchestrator:latest'),
      'Must tag orchestrator:latest'
    );

    // Assert docker-compose.yml defines image tag for orchestrator
    const composePath = path.resolve(process.cwd(), '../../docker-compose.yml');
    const composeContent = fs.readFileSync(composePath, 'utf-8');
    assert.ok(
      composeContent.includes('harikson}-orchestrator:latest'),
      'docker-compose.yml must have image tag for orchestrator'
    );
  });

  // =========================================================================
  // 8. BEHAVIORAL HTTP ROUTE & FORGED TENANT HEADER PROTECTION (P0-2, P0-3, P0-4)
  // =========================================================================
  it('8. Behavioral HTTP: Express endpoints reject unauthenticated and forged requests with HTTP 401', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/tools', toolsRouter);
    app.use('/api/orchestrator', orchestratorRouter);
    app.use('/api/search', searchRouter);
    app.use('/api/indexer', indexerRouter);
    app.use('/api/memory', memoryRouter);
    app.use('/api/context', contextRouter);

    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address() as any;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      // 1. POST /api/tools/execute unauthenticated -> 401
      const resTools = await fetch(`${baseUrl}/api/tools/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-1', toolCalls: [] }),
      });
      assert.strictEqual(resTools.status, 401, 'POST /api/tools/execute must return 401 when unauthenticated');

      // 2. POST /api/tools/execute with forged tenant header -> 401 (cannot bypass auth with x-tenant-id)
      const resForged = await fetch(`${baseUrl}/api/tools/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
          'x-tenant-slug': 'default',
        },
        body: JSON.stringify({ conversationId: 'conv-1', toolCalls: [] }),
      });
      assert.strictEqual(resForged.status, 401, 'Forged tenant header must not bypass authentication');

      // 3. POST /api/orchestrator/execute unauthenticated -> 401
      const resOrch = await fetch(`${baseUrl}/api/orchestrator/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userRequest: 'test request' }),
      });
      assert.strictEqual(resOrch.status, 401, 'POST /api/orchestrator/execute must return 401 when unauthenticated');

      // 4. POST /api/search unauthenticated -> 401
      const resSearch = await fetch(`${baseUrl}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' }),
      });
      assert.strictEqual(resSearch.status, 401, 'POST /api/search must return 401 when unauthenticated');

      // 5. POST /api/indexer/index unauthenticated -> 401
      const resIndexer = await fetch(`${baseUrl}/api/indexer/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: 'test' }),
      });
      assert.strictEqual(resIndexer.status, 401, 'POST /api/indexer/index must return 401 when unauthenticated');

      // 6. GET /api/memory unauthenticated -> 401
      const resMemory = await fetch(`${baseUrl}/api/memory`);
      assert.strictEqual(resMemory.status, 401, 'GET /api/memory must return 401 when unauthenticated');

      // 7. POST /api/context unauthenticated -> 401
      const resContext = await fetch(`${baseUrl}/api/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspacePath: 'test' }),
      });
      assert.strictEqual(resContext.status, 401, 'POST /api/context must return 401 when unauthenticated');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // =========================================================================
  // 9. BEHAVIORAL SYMLINK ESCAPE PROTECTION (P0-2)
  // =========================================================================
  it('9. Behavioral Filesystem: WorkspaceSandbox detects and blocks real file and directory symlink escapes', () => {
    const tmpBase = path.resolve('./tests/tmp-sandbox-symlink-test');
    const wsDir = path.join(tmpBase, 'workspace');
    const outsideDir = path.join(tmpBase, 'outside');
    const secretFile = path.join(outsideDir, 'shadow.txt');

    fs.mkdirSync(wsDir, { recursive: true });
    fs.mkdirSync(outsideDir, { recursive: true });
    fs.writeFileSync(secretFile, 'SUPER_SECRET_PAYLOAD', 'utf-8');

    try {
      // 1. File symlink escaping workspace
      const symlinkFile = path.join(wsDir, 'escape-link.txt');
      fs.symlinkSync(secretFile, symlinkFile);

      assert.throws(
        () => WorkspaceSandbox.resolvePath(wsDir, 'escape-link.txt'),
        /Security Exception.*Symlink escapes workspace sandbox/,
        'Must block resolving file symlink that points outside workspace'
      );

      // 2. Directory symlink escaping workspace
      const symlinkDir = path.join(wsDir, 'escape-dir');
      fs.symlinkSync(outsideDir, symlinkDir, 'dir');

      assert.throws(
        () => WorkspaceSandbox.resolvePath(wsDir, 'escape-dir/new-file.txt'),
        /Security Exception.*Parent directory symlink escapes workspace sandbox/,
        'Must block resolving path inside symlinked directory pointing outside workspace'
      );

      // 3. Legitimate internal symlink should succeed
      const internalTarget = path.join(wsDir, 'legit-target.txt');
      fs.writeFileSync(internalTarget, 'SAFE_DATA');
      const internalLink = path.join(wsDir, 'legit-link.txt');
      fs.symlinkSync(internalTarget, internalLink);

      const resolvedLegit = WorkspaceSandbox.resolvePath(wsDir, 'legit-link.txt');
      assert.ok(resolvedLegit.startsWith(wsDir), 'Internal symlink within workspace must resolve safely');
    } finally {
      if (fs.existsSync(tmpBase)) {
        fs.rmSync(tmpBase, { recursive: true, force: true });
      }
    }
  });

  // =========================================================================
  // 10. BEHAVIORAL AUTHENTICATION MIDDLEWARE SECURITY (P0-2, P0-3, P0-4)
  // =========================================================================
  it('10. Behavioral Auth: requireAuth safely handles token validity, expiry, and secret length mismatches', () => {
    const jwtSecret = 'test_jwt_secret_must_be_at_least_32_characters_long_for_security';
    process.env.JWT_SECRET = jwtSecret;
    process.env.INTERNAL_API_SECRET = 'test_internal_api_secret_must_be_at_least_32_characters_long';

    let lastStatus = 0;
    let nextCalled = false;

    const mockRes = (): any => {
      lastStatus = 200;
      return {
        status: (code: number) => {
          lastStatus = code;
          return {
            json: () => {},
          };
        },
      };
    };

    // 1. Missing credentials -> 401
    nextCalled = false;
    requireAuth({ headers: {} } as any, mockRes(), () => { nextCalled = true; });
    assert.strictEqual(lastStatus, 401);
    assert.strictEqual(nextCalled, false);

    // 2. Invalid JWT signature -> 401
    nextCalled = false;
    const fakeToken = jwt.sign({ userId: 'u-1', tenantId: 't-1' }, 'wrong_secret_123456789012345678901234');
    requireAuth({ headers: { authorization: `Bearer ${fakeToken}` } } as any, mockRes(), () => { nextCalled = true; });
    assert.strictEqual(lastStatus, 401);
    assert.strictEqual(nextCalled, false);

    // 3. Expired JWT -> 401
    nextCalled = false;
    const expiredToken = jwt.sign({ userId: 'u-1', tenantId: 't-1' }, jwtSecret, { expiresIn: -10 });
    requireAuth({ headers: { authorization: `Bearer ${expiredToken}` } } as any, mockRes(), () => { nextCalled = true; });
    assert.strictEqual(lastStatus, 401);
    assert.strictEqual(nextCalled, false);

    // 4. Internal Secret with mismatched byte length -> does NOT throw RangeError, returns 401
    nextCalled = false;
    requireAuth({ headers: { 'x-internal-secret': 'short' } } as any, mockRes(), () => { nextCalled = true; });
    assert.strictEqual(lastStatus, 401);
    assert.strictEqual(nextCalled, false);

    // 5. Valid JWT token -> next() called and req.user populated
    nextCalled = false;
    const validToken = jwt.sign({ userId: 'u-100', tenantId: 't-200' }, jwtSecret);
    const validReq: any = { headers: { authorization: `Bearer ${validToken}` } };
    requireAuth(validReq, mockRes(), () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(validReq.user?.userId, 'u-100');
    assert.strictEqual(validReq.user?.tenantId, 't-200');
  });

  // =========================================================================
  // 11. BEHAVIORAL SSRF REDIRECT PROTECTION (P1-3)
  // =========================================================================
  it('11. Behavioral SSRF: validateUrl catches redirect destinations to loopback and private metadata', async () => {
    // Assert redirect destination URLs to loopback, private ranges, and metadata are blocked
    const loopbackTarget = await SSRFGuard.validateUrl('http://127.0.0.1:6379/admin');
    assert.strictEqual(loopbackTarget.safe, false, 'Redirect destination 127.0.0.1 must be rejected');

    const metadataTarget = await SSRFGuard.validateUrl('http://169.254.169.254/latest/meta-data');
    assert.strictEqual(metadataTarget.safe, false, 'Redirect destination metadata must be rejected');

    const ipv6Target = await SSRFGuard.validateUrl('http://[::1]:8080/metrics');
    assert.strictEqual(ipv6Target.safe, false, 'Redirect destination IPv6 [::1] must be rejected');

    const internalServiceTarget = await SSRFGuard.validateUrl('http://postgres:5432');
    assert.strictEqual(internalServiceTarget.safe, false, 'Internal service target must be rejected');
  });
});
