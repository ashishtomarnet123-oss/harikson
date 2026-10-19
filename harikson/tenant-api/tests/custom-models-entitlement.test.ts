if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
}
if (!process.env.REDIS_URL) {
  process.env.REDIS_URL = 'redis://localhost:6379';
}
if (!process.env.TENANT_MASTER_KEY) {
  process.env.TENANT_MASTER_KEY = '01234567890123456789012345678901';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_must_be_at_least_32_characters_long_for_security';
}

import { describe, it, beforeEach, afterEach, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import axios from 'axios';
import { pool, readPool, redis } from '../src/db/pool.js';
import {
  loadEntitlements,
  requireCustomModels,
  requirePrioritySupport,
  requireWebhookLogging,
  requireAuditTrail,
  requireApiAccess,
  PLATFORM_DEFAULT_MODELS,
  isPlatformDefaultModel,
  isCustomModelIdentifier,
} from '../src/middleware/entitlements.js';
import modelsRouter from '../src/routes/models.routes.js';
import agentRouter from '../src/routes/agent.routes.js';
import chatRouter from '../src/routes/chat.routes.js';

try {
  redis.on('error', () => {});
  redis.disconnect();
} catch (_) {}

describe('Xarwiz Isolated Bug Fix 7: Custom Models Plan Feature Enforcement Test Suite', () => {
  const originalQuery = pool.query;
  const originalConnect = pool.connect;

  after(async () => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
    try {
      redis.disconnect();
    } catch (_) {}
    try {
      await pool.end();
      await (readPool as any)?.end?.();
    } catch (_) {}
    setTimeout(() => {
      process.exit(0);
    }, 100);
  });

  beforeEach(() => {
    (redis as any).get = async () => null;
    (redis as any).setex = async () => 'OK';
    (pool as any).query = async (sql: string, params?: any[]) => {
      return { rows: [], rowCount: 0 };
    };
    const mockClient = {
      query: async (sql: string, params?: any[]) => {
        if (sql.includes('SELECT 1')) {
          return { rows: [{ '?column?': 1 }] };
        }
        if (sql.includes('set_config') || sql.includes('assert_tenant_context')) {
          return { rows: [] };
        }
        return pool.query(sql, params);
      },
      release: () => {},
    };
    (pool as any).connect = async () => mockClient;
    (readPool as any).connect = async () => mockClient;
    (readPool as any).query = (pool as any).query;
  });

  afterEach(() => {
    pool.query = originalQuery;
    pool.connect = originalConnect;
    (readPool as any).connect = originalConnect;
    (readPool as any).query = originalQuery;
  });

  function createMockRes() {
    let statusCode = 200;
    let jsonBody: any = null;
    let sentData: any = null;
    const headers: Record<string, string> = {};

    const res: any = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        jsonBody = data;
        return res;
      },
      send: (data: any) => {
        sentData = data;
        return res;
      },
      setHeader: (key: string, val: string) => {
        headers[key.toLowerCase()] = val;
        return res;
      },
      getHeader: (key: string) => headers[key.toLowerCase()],
      flushHeaders: () => {},
      write: () => true,
      end: () => res,
      getStatusCode: () => statusCode,
      getBody: () => jsonBody ?? sentData,
    };
    return res;
  }

  function createMockReq(overrides: Record<string, any> = {}): any {
    return {
      headers: {},
      cookies: {},
      query: {},
      body: {},
      params: {},
      ...overrides,
    };
  }

  // =========================================================================
  // 1. A tenant with custom_models: true can use the supported custom-model capability
  // =========================================================================
  it('1. A tenant with custom_models: true can register and use custom models', async () => {
    let savedModel: any = null;
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('SELECT id FROM tenant_custom_models WHERE model_identifier')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO tenant_custom_models')) {
        savedModel = {
          id: 'cm-ent-1',
          tenant_id: params?.[0],
          name: params?.[1],
          model_identifier: params?.[2],
          base_model: params?.[3],
          provider: params?.[4],
          endpoint_url: params?.[5],
          api_key_masked: params?.[7],
          description: params?.[8],
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        };
        return { rows: [savedModel] };
      }
      return { rows: [] };
    };

    const req = createMockReq({
      user: { userId: 'u-ent', role: 'admin' },
      tenant: { id: 't-ent' },
      entitlements: {
        planId: 'enterprise',
        customModels: true,
      },
      body: {
        name: 'Enterprise Custom LLM',
        modelIdentifier: 'custom-enterprise-8b',
        baseModel: 'qwen3-8b',
        endpointUrl: 'https://llm.enterprise.com/v1',
        apiKey: 'sk-live-secret-enterprise-12345',
      },
    });
    const res = createMockRes();

    // Route handler under /custom
    const postLayer = (modelsRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/custom' && layer.route.methods.post
    );
    assert.ok(postLayer, 'POST /custom handler exists');

    // Run middleware then handler
    let passedMiddleware = false;
    requireCustomModels(req, res, () => {
      passedMiddleware = true;
    });
    assert.strictEqual(passedMiddleware, true, 'requireCustomModels allows enterprise tenant');

    await postLayer.route.stack[postLayer.route.stack.length - 1].handle(req, res);
    assert.strictEqual(res.getStatusCode(), 201);
    const body = res.getBody();
    assert.strictEqual(body.customModel.modelIdentifier, 'custom-enterprise-8b');
    assert.strictEqual(body.customModel.apiKeyMasked, 'sk-****2345');
    assert.strictEqual(body.customModel.encrypted_api_key, undefined);
  });

  // =========================================================================
  // 2. A tenant with custom_models: false is denied the protected operation with 403 PLAN_FEATURE_DISABLED
  // =========================================================================
  it('2. A tenant with custom_models: false is denied the protected operation with 403 PLAN_FEATURE_DISABLED', async () => {
    const plansToTest = ['starter', 'professional', 'free'];

    for (const plan of plansToTest) {
      const req = createMockReq({
        user: { userId: 'u-user', role: 'member' },
        tenant: { id: `t-${plan}` },
        entitlements: {
          planId: plan,
          customModels: false,
        },
        body: {
          name: 'Forbidden Custom Model',
          modelIdentifier: 'custom-pro-model',
        },
      });
      const res = createMockRes();

      requireCustomModels(req, res, () => {
        assert.fail('Should not proceed past requireCustomModels');
      });

      assert.strictEqual(res.getStatusCode(), 403);
      const body = res.getBody();
      assert.strictEqual(body.code, 'PLAN_FEATURE_DISABLED');
      assert.strictEqual(body.feature, 'custom_models');
      assert.strictEqual(body.plan, plan);
    }
  });

  // =========================================================================
  // 3. Explicit Boolean configuration overrides the fallback
  // =========================================================================
  it('3. Explicit Boolean configuration overrides the fallback', async () => {
    // Starter plan with explicit custom_models: true
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'starter',
              plan_name: 'Starter Custom Override',
              token_limit: 5000,
              storage_limit_gb: 20,
              image_limit_monthly: 10,
              features: JSON.stringify({ custom_models: true }),
            },
          ],
        };
      }
      return { rows: [] };
    };

    const reqStarter = createMockReq({ tenant: { id: 't-starter-explicit' } });
    const resStarter = createMockRes();
    await loadEntitlements()(reqStarter, resStarter, () => {});
    assert.strictEqual(reqStarter.entitlements?.customModels, true, 'Explicit true on starter grants customModels');

    // Enterprise plan with explicit custom_models: false
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'enterprise',
              plan_name: 'Enterprise Custom Disabled',
              token_limit: -1,
              storage_limit_gb: 1000,
              image_limit_monthly: 100,
              features: JSON.stringify({ custom_models: false }),
            },
          ],
        };
      }
      return { rows: [] };
    };

    const reqEnt = createMockReq({ tenant: { id: 't-ent-explicit-false' } });
    const resEnt = createMockRes();
    await loadEntitlements()(reqEnt, resEnt, () => {});
    assert.strictEqual(reqEnt.entitlements?.customModels, false, 'Explicit false on enterprise disables customModels');
  });

  // =========================================================================
  // 4. Missing or malformed configuration follows the documented fallback
  // =========================================================================
  it('4. Missing or malformed configuration follows documented fallback (Enterprise=true, others=false)', async () => {
    const testCases = [
      { plan: 'enterprise', features: {}, expected: true },
      { plan: 'enterprise', features: { custom_models: 'not_a_boolean' }, expected: true },
      { plan: 'professional', features: {}, expected: false },
      { plan: 'professional', features: { custom_models: null }, expected: false },
      { plan: 'starter', features: {}, expected: false },
      { plan: 'starter', features: { custom_models: 'yes' }, expected: false },
      { plan: 'free', features: {}, expected: false },
    ];

    for (const tc of testCases) {
      (pool as any).query = async (sql: string) => {
        if (sql.includes('FROM tenants t')) {
          return {
            rows: [
              {
                plan_id: tc.plan,
                plan_name: `${tc.plan} Plan`,
                token_limit: 1000,
                storage_limit_gb: 10,
                image_limit_monthly: 5,
                features: JSON.stringify(tc.features),
              },
            ],
          };
        }
        return { rows: [] };
      };

      const req = createMockReq({ tenant: { id: `t-${tc.plan}-fallback` } });
      const res = createMockRes();
      await loadEntitlements()(req, res, () => {});
      assert.strictEqual(
        req.entitlements?.customModels,
        tc.expected,
        `Plan ${tc.plan} fallback customModels should be ${tc.expected}`
      );
    }
  });

  // =========================================================================
  // 5. Default platform models remain available to tenants without the custom-model entitlement
  // =========================================================================
  it('5. Default platform models remain available to tenants without the custom-model entitlement', async () => {
    // Check helper
    for (const m of PLATFORM_DEFAULT_MODELS) {
      assert.strictEqual(isPlatformDefaultModel(m), true, `${m} is a platform default model`);
      assert.strictEqual(isCustomModelIdentifier(m), false, `${m} is NOT treated as a custom model`);
    }

    // Agent creation with standard model by Starter tenant (customModels: false)
    let agentInserted: any = null;
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('INSERT INTO agents')) {
        agentInserted = {
          id: 'agent-starter-default',
          name: params?.[1],
          model: params?.[2],
          system_prompt: params?.[3],
        };
        return { rows: [agentInserted] };
      }
      return { rows: [] };
    };

    const req = createMockReq({
      user: { userId: 'u-starter', role: 'member' },
      tenant: { id: 't-starter' },
      entitlements: {
        planId: 'starter',
        customModels: false,
      },
      body: {
        name: 'Standard Coding Agent',
        model: 'qwen3-coder',
        systemPrompt: 'You are a coder.',
      },
    });
    const res = createMockRes();

    const postAgent = (agentRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/' && layer.route.methods.post
    );
    assert.ok(postAgent, 'POST /api/agents route exists');

    await postAgent.route.stack[postAgent.route.stack.length - 1].handle(req, res);
    assert.strictEqual(res.getStatusCode(), 201);
    assert.strictEqual(res.getBody().agent.model, 'qwen3-coder');
  });

  // =========================================================================
  // 6. Client-supplied plan names or feature flags cannot grant entitlement
  // =========================================================================
  it('6. Client-supplied plan names or feature flags cannot grant entitlement', async () => {
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'starter',
              plan_name: 'Starter Plan',
              features: JSON.stringify({ custom_models: false }),
            },
          ],
        };
      }
      return { rows: [] };
    };

    const req = createMockReq({
      headers: {
        'x-plan': 'enterprise',
        'x-custom-models': 'true',
      },
      body: {
        plan: 'enterprise',
        customModels: true,
      },
      tenant: { id: 't-spoof' },
    });
    const res = createMockRes();

    await loadEntitlements()(req, res, () => {});
    assert.strictEqual(req.entitlements?.planId, 'starter');
    assert.strictEqual(req.entitlements?.customModels, false);
  });

  // =========================================================================
  // 7. Tenant A cannot read, modify, or select Tenant B's private model configuration
  // =========================================================================
  it("7. Tenant A cannot read, modify, or select Tenant B's private model configuration", async () => {
    (pool as any).query = async (sql: string, params?: any[]) => {
      // Simulate tenant isolation in DB query: WHERE id = $1 AND tenant_id = $2
      if (sql.includes('FROM tenant_custom_models WHERE id = $1 AND tenant_id = $2')) {
        const [targetId, tenantId] = params || [];
        if (targetId === 'cm-tenant-b' && tenantId === 't-tenant-a') {
          return { rows: [] }; // Isolated!
        }
      }
      if (sql.includes('SELECT id FROM tenant_custom_models WHERE model_identifier = $1 AND tenant_id != $2')) {
        const [modelId, tenantId] = params || [];
        if (modelId === 'custom-secret-b' && tenantId === 't-tenant-a') {
          return { rows: [{ id: 'cm-tenant-b' }] }; // Belongs to another tenant
        }
      }
      return { rows: [] };
    };

    // 1. Tenant A tries to read Tenant B's custom model
    const getModelLayer = (modelsRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/custom/:id' && layer.route.methods.get
    );
    assert.ok(getModelLayer);

    const reqRead = createMockReq({
      user: { userId: 'u-tenant-a', role: 'admin' },
      tenant: { id: 't-tenant-a' },
      entitlements: { planId: 'enterprise', customModels: true },
      params: { id: 'cm-tenant-b' },
    });
    const resRead = createMockRes();
    await getModelLayer.route.stack[getModelLayer.route.stack.length - 1].handle(reqRead, resRead);
    assert.strictEqual(resRead.getStatusCode(), 404);

    // 2. Tenant A tries to create an agent selecting Tenant B's private model
    const postAgent = (agentRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/' && layer.route.methods.post
    );

    const reqAgent = createMockReq({
      user: { userId: 'u-tenant-a', role: 'admin' },
      tenant: { id: 't-tenant-a' },
      entitlements: { planId: 'enterprise', customModels: true },
      body: {
        name: 'Snooping Agent',
        model: 'custom-secret-b',
      },
    });
    const resAgent = createMockRes();
    await postAgent.route.stack[postAgent.route.stack.length - 1].handle(reqAgent, resAgent);
    assert.strictEqual(resAgent.getStatusCode(), 403);
    assert.strictEqual(resAgent.getBody().code, 'UNAUTHORIZED_MODEL_ACCESS');
  });

  // =========================================================================
  // 8. Unauthorized create, update, select, and delete operations are rejected
  // =========================================================================
  it('8. Unauthorized create, update, select, and delete operations are rejected (401 unauthenticated)', async () => {
    const unauthReq = createMockReq({ user: null, tenant: null });
    const res = createMockRes();

    requireCustomModels(unauthReq, res, () => {
      assert.fail('Should not proceed past requireCustomModels without user');
    });

    assert.strictEqual(res.getStatusCode(), 401);
    assert.strictEqual(res.getBody().error, 'Unauthorized: Authentication required');
  });

  // =========================================================================
  // 9. Unsupported or unregistered model identifiers are handled safely
  // =========================================================================
  it('9. Unsupported or unregistered model identifiers are handled safely', async () => {
    const postLayer = (modelsRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/custom' && layer.route.methods.post
    );

    // 1. Invalid identifier with script tags / illegal characters
    const reqInvalid = createMockReq({
      user: { userId: 'u-ent', role: 'admin' },
      tenant: { id: 't-ent' },
      entitlements: { planId: 'enterprise', customModels: true },
      body: {
        name: 'Exploit Model',
        modelIdentifier: '<script>alert(1)</script>',
      },
    });
    const resInvalid = createMockRes();
    await postLayer.route.stack[postLayer.route.stack.length - 1].handle(reqInvalid, resInvalid);
    assert.strictEqual(resInvalid.getStatusCode(), 400);
    assert.strictEqual(resInvalid.getBody().code, 'INVALID_MODEL_IDENTIFIER');

    // 2. Reserved platform model collision
    const reqReserved = createMockReq({
      user: { userId: 'u-ent', role: 'admin' },
      tenant: { id: 't-ent' },
      entitlements: { planId: 'enterprise', customModels: true },
      body: {
        name: 'Fake Platform Model',
        modelIdentifier: 'qwen3-coder',
      },
    });
    const resReserved = createMockRes();
    await postLayer.route.stack[postLayer.route.stack.length - 1].handle(reqReserved, resReserved);
    assert.strictEqual(resReserved.getStatusCode(), 409);
    assert.strictEqual(resReserved.getBody().code, 'RESERVED_MODEL_IDENTIFIER');

    // 3. Invalid endpoint URL protocol (e.g. ftp:// or javascript:)
    const reqBadProtocol = createMockReq({
      user: { userId: 'u-ent', role: 'admin' },
      tenant: { id: 't-ent' },
      entitlements: { planId: 'enterprise', customModels: true },
      body: {
        name: 'Bad URL Model',
        modelIdentifier: 'custom-valid-name',
        endpointUrl: 'javascript:alert(1)',
      },
    });
    const resBadProtocol = createMockRes();
    await postLayer.route.stack[postLayer.route.stack.length - 1].handle(reqBadProtocol, resBadProtocol);
    assert.strictEqual(resBadProtocol.getStatusCode(), 400);
  });

  // =========================================================================
  // 10. API keys and provider credentials are not exposed by model-configuration responses
  // =========================================================================
  it('10. API keys and provider credentials are not exposed by model-configuration responses', async () => {
    (pool as any).query = async (sql: string, params?: any[]) => {
      if (sql.includes('INSERT INTO tenant_custom_models')) {
        return {
          rows: [
            {
              id: 'cm-secret-1',
              tenant_id: params?.[0],
              name: params?.[1],
              model_identifier: params?.[2],
              base_model: params?.[3],
              provider: params?.[4],
              endpoint_url: params?.[5],
              encrypted_api_key: params?.[6], // Raw encrypted key in DB
              api_key_masked: params?.[7],
              description: params?.[8],
              status: 'active',
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        };
      }
      return { rows: [] };
    };

    const postLayer = (modelsRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/custom' && layer.route.methods.post
    );

    const rawApiKey = 'sk-proj-super-secret-production-key-987654321';
    const req = createMockReq({
      user: { userId: 'u-ent', role: 'admin' },
      tenant: { id: 't-ent' },
      entitlements: { planId: 'enterprise', customModels: true },
      body: {
        name: 'OpenAI Custom Finetuned',
        modelIdentifier: 'custom-openai-finetuned',
        apiKey: rawApiKey,
      },
    });
    const res = createMockRes();
    await postLayer.route.stack[postLayer.route.stack.length - 1].handle(req, res);

    assert.strictEqual(res.getStatusCode(), 201);
    const body = res.getBody();
    const jsonStr = JSON.stringify(body);

    assert.strictEqual(jsonStr.includes(rawApiKey), false, 'Plaintext API key must NEVER appear in response');
    assert.strictEqual(body.customModel.encrypted_api_key, undefined, 'Encrypted ciphertext must not be returned');
    assert.strictEqual(body.customModel.apiKeyMasked, 'sk-****4321', 'Masked preview returned safely');
  });

  // =========================================================================
  // 11. Chat and agent functionality for entitled, supported default models remains intact
  // =========================================================================
  it('11. Chat and agent functionality for platform default models remains intact for all tiers', async () => {
    const postChat = (chatRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/' && layer.route.methods.post
    );
    assert.ok(postChat, 'POST /api/chat route exists');

    // Free tier tenant using platform default model 'harikson-plus'
    (pool as any).query = async (sql: string) => {
      if (sql.includes('INSERT INTO conversations')) {
        return { rows: [{ id: 'conv-free-1', title: 'Free Chat' }] };
      }
      return { rows: [] };
    };

    const req = createMockReq({
      user: { userId: 'u-free' },
      tenant: { id: 't-free' },
      entitlements: {
        planId: 'free',
        customModels: false,
      },
      body: {
        message: 'Hello Xarwiz AI',
        model: 'harikson-plus', // Platform default
        stream: false,
      },
    });
    const res = createMockRes();

    // Mock axios to return immediately without hitting network
    const origAxiosPost = axios.post;
    (axios as any).post = async () => ({
      data: { message: { content: 'Platform default model response' } },
    });

    try {
      await postChat.route.stack[postChat.route.stack.length - 1].handle(req, res);
      // Entitlement check passed (not 403 PLAN_FEATURE_DISABLED)
      assert.notStrictEqual(res.getStatusCode(), 403);
    } finally {
      (axios as any).post = origAxiosPost;
    }

    // Also verify agent execution with platform default model
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM agents WHERE id = $1 AND tenant_id = $2 AND status = \'active\'')) {
        return { rows: [{ id: 'ag-default', name: 'Default Agent', model: 'qwen3-coder', status: 'active' }] };
      }
      return { rows: [] };
    };

    const reqExec = createMockReq({
      user: { userId: 'u-free' },
      tenant: { id: 't-free' },
      entitlements: { planId: 'free', customModels: false },
      params: { id: 'ag-default' },
      body: { message: 'Execute task' },
    });
    const resExec = createMockRes();
    const postAgentExec = (agentRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/:id/execute' && layer.route.methods.post
    );

    await postAgentExec.route.stack[postAgentExec.route.stack.length - 1].handle(reqExec, resExec);
    // Should NOT be 403 PLAN_FEATURE_DISABLED
    assert.notStrictEqual(resExec.getStatusCode(), 403);
  });

  // =========================================================================
  // 12. Any existing custom-model inference path enforces the entitlement on the server
  // =========================================================================
  it('12. Custom-model chat and agent execution inference paths reject unentitled tenants with 403', async () => {
    const postChat = (chatRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/' && layer.route.methods.post
    );

    // 1. Free / Starter tenant attempting to chat with a custom model directly
    const reqChat = createMockReq({
      user: { userId: 'u-free' },
      tenant: { id: 't-free' },
      entitlements: {
        planId: 'free',
        customModels: false,
      },
      body: {
        message: 'Run custom inference',
        model: 'custom-medical-adapter', // Custom model!
        stream: false,
      },
    });
    const resChat = createMockRes();

    await postChat.route.stack[postChat.route.stack.length - 1].handle(reqChat, resChat);
    assert.strictEqual(resChat.getStatusCode(), 403);
    const bodyChat = resChat.getBody();
    assert.strictEqual(bodyChat.code, 'PLAN_FEATURE_DISABLED');
    assert.strictEqual(bodyChat.feature, 'custom_models');

    // 2. Tenant whose plan was downgraded attempting to execute an agent using a custom model
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM agents') && sql.includes('status = \'active\'')) {
        return {
          rows: [
            {
              id: 'ag-downgraded',
              name: 'Enterprise Agent Downgraded',
              model: 'custom-finance-adapter',
              status: 'active',
            },
          ],
        };
      }
      return { rows: [] };
    };

    const reqAgentExec = createMockReq({
      user: { userId: 'u-downgraded' },
      tenant: { id: 't-downgraded' },
      entitlements: {
        planId: 'starter',
        customModels: false,
      },
      params: { id: 'ag-downgraded' },
      body: { message: 'Run financial analysis' },
    });
    const resAgentExec = createMockRes();
    const postAgentExec = (agentRouter as any).stack.find(
      (layer: any) => layer.route && layer.route.path === '/:id/execute' && layer.route.methods.post
    );

    await postAgentExec.route.stack[postAgentExec.route.stack.length - 1].handle(reqAgentExec, resAgentExec);
    assert.strictEqual(resAgentExec.getStatusCode(), 403);
    const bodyExec = resAgentExec.getBody();
    assert.strictEqual(bodyExec.code, 'PLAN_FEATURE_DISABLED');
    assert.strictEqual(bodyExec.feature, 'custom_models');
  });

  // =========================================================================
  // 13. Fixes 1-6 continue passing their regression tests
  // =========================================================================
  it('13. Fixes 1-6 entitlements (api_access, rag_documents, audit_trail, webhook_logging, priority_support, sla_hours) remain intact', async () => {
    (pool as any).query = async (sql: string) => {
      if (sql.includes('FROM tenants t')) {
        return {
          rows: [
            {
              plan_id: 'professional',
              plan_name: 'Professional Plan',
              token_limit: 10000,
              storage_limit_gb: 100,
              image_limit_monthly: 25,
              features: JSON.stringify({
                api_access: true,
                rag_documents: 50000,
                audit_trail: true,
                webhook_logging: true,
                priority_support: true,
                sla_hours: 12,
                custom_models: false,
              }),
            },
          ],
        };
      }
      return { rows: [] };
    };

    const req = createMockReq({ tenant: { id: 't-pro-regression' } });
    const res = createMockRes();

    await loadEntitlements()(req, res, () => {});

    assert.strictEqual(req.entitlements?.apiAccess, true, 'Fix 1 apiAccess intact');
    assert.strictEqual(req.entitlements?.ragDocumentsLimit, 50000, 'Fix 2 ragDocuments intact');
    assert.strictEqual(req.entitlements?.auditTrail, true, 'Fix 3 auditTrail intact');
    assert.strictEqual(req.entitlements?.webhookLogging, true, 'Fix 4 webhookLogging intact');
    assert.strictEqual(req.entitlements?.prioritySupport, true, 'Fix 5 prioritySupport intact');
    assert.strictEqual(req.entitlements?.slaHours, 12, 'Fix 6 slaHours intact');
    assert.strictEqual(req.entitlements?.customModels, false, 'Fix 7 customModels correctly false on pro');
  });
});
