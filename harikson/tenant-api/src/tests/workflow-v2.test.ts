import { describe, it } from 'node:test';
import assert from 'node:assert';
import { WorkflowValidator } from '../services/workflow/compiler/validator.js';
import { WorkflowCompiler } from '../services/workflow/compiler/compiler.js';
import { ExpressionEngine } from '../services/workflow/expression/engine.js';
import { SSRFGuard } from '../services/workflow/security/ssrf.js';
import { CredentialService } from '../services/workflow/credential.service.js';
import { NodeRegistry } from '../services/workflow/nodes/index.js';
import { IWorkflowGraph } from '../services/workflow/types.js';

describe('Xarwiz Workflow V2 Engine Diagnostic Test Suite', () => {
  // ============================================================================
  // 1. DAG VALIDATOR & CYCLE DETECTION
  // ============================================================================
  it('1. Validator: detects and rejects circular dependencies (cycles)', () => {
    const cyclicGraph: IWorkflowGraph = {
      nodes: [
        { id: 'trigger_1', type: 'trigger.manual', data: { label: 'Start' } },
        { id: 'node_a', type: 'ai.llm', data: { label: 'Node A', config: { userPrompt: 'Hello' } } },
        { id: 'node_b', type: 'ai.llm', data: { label: 'Node B', config: { userPrompt: 'World' } } },
      ],
      edges: [
        { id: 'e1', source: 'trigger_1', target: 'node_a' },
        { id: 'e2', source: 'node_a', target: 'node_b' },
        { id: 'e3', source: 'node_b', target: 'node_a' }, // Cycle: A -> B -> A
      ],
    };

    const res = WorkflowValidator.validate(cyclicGraph);
    assert.strictEqual(res.valid, false, 'Cyclic graph should be marked invalid');
    const hasCycleError = res.errors.some((e) => e.message.toLowerCase().includes('cycle'));
    assert.strictEqual(hasCycleError, true, 'Validation errors should report circular dependency');
  });

  it('2. Validator: requires at least one trigger node', () => {
    const noTriggerGraph: IWorkflowGraph = {
      nodes: [
        { id: 'node_a', type: 'ai.llm', data: { label: 'Prompt', config: { userPrompt: 'Hello' } } },
      ],
      edges: [],
    };

    const res = WorkflowValidator.validate(noTriggerGraph);
    assert.strictEqual(res.valid, false);
    const hasTriggerError = res.errors.some((e) => e.message.toLowerCase().includes('trigger'));
    assert.strictEqual(hasTriggerError, true);
  });

  // ============================================================================
  // 2. DAG COMPILER & TOPOLOGICAL ORDERING
  // ============================================================================
  it('3. Compiler: compiles parallel stages in correct topological order', () => {
    // Structure:
    //         ┌─> Branch A ─┐
    // Trigger ┼             ├─> Merge Node
    //         └─> Branch B ─┘
    const diamondGraph: IWorkflowGraph = {
      nodes: [
        { id: 'trig', type: 'trigger.manual', data: { label: 'Start' } },
        { id: 'a', type: 'ai.llm', data: { label: 'Branch A', config: { userPrompt: 'A' } } },
        { id: 'b', type: 'ai.llm', data: { label: 'Branch B', config: { userPrompt: 'B' } } },
        { id: 'merge', type: 'integration.slack', data: { label: 'Merge', config: { message: 'Done' } } },
      ],
      edges: [
        { id: 'e1', source: 'trig', target: 'a' },
        { id: 'e2', source: 'trig', target: 'b' },
        { id: 'e3', source: 'a', target: 'merge' },
        { id: 'e4', source: 'b', target: 'merge' },
      ],
    };

    const compiled = WorkflowCompiler.compile(diamondGraph);
    assert.ok(compiled.executionPlan.length >= 3, 'Must contain at least 3 stages');
    // Stage 0: trigger
    assert.deepStrictEqual(compiled.executionPlan[0], ['trig']);
    // Stage 1: parallel a and b
    assert.ok(compiled.executionPlan[1].includes('a'));
    assert.ok(compiled.executionPlan[1].includes('b'));
    // Stage 2: merge
    assert.deepStrictEqual(compiled.executionPlan[2], ['merge']);
  });

  // ============================================================================
  // 3. EXPRESSION ENGINE & SANDBOXING
  // ============================================================================
  it('4. Expression Engine: safely resolves tokens and prevents prototype pollution', () => {
    const context: any = {
      tenantId: 'tenant-100',
      workflowId: 'wf-200',
      executionId: 'exec-300',
      triggerPayload: {
        customer: { email: 'sarah@example.com', tier: 'Enterprise' },
      },
      nodesOutputs: {
        sentimentNode: { sentiment: 'positive', score: 0.98 },
      },
      variables: { env: 'production' },
      stepsResults: [],
    };

    // Test token interpolation
    const template = 'Customer {{ $trigger.body.customer.email }} ({{ $trigger.customer.tier }}) has {{$node["sentimentNode"].sentiment}} sentiment in {{$variables.env}}';
    const result = ExpressionEngine.interpolate(template, context);
    assert.strictEqual(
      result,
      'Customer sarah@example.com (Enterprise) has positive sentiment in production'
    );

    // Test prototype pollution block
    const dangerousTokens = [
      '__proto__',
      'constructor.prototype',
      'process.env',
      'require("fs")',
      'globalThis',
    ];

    for (const danger of dangerousTokens) {
      const resolved = ExpressionEngine.resolveToken(danger, context);
      assert.strictEqual(resolved, undefined, `Token '${danger}' must resolve to undefined`);
    }
  });

  // ============================================================================
  // 4. SSRF GUARD & NETWORK SECURITY
  // ============================================================================
  it('5. SSRF Guard: blocks private IP ranges and internal container hostnames', async () => {
    // Test private IP block
    assert.strictEqual(SSRFGuard.isPrivateIp('127.0.0.1'), true);
    assert.strictEqual(SSRFGuard.isPrivateIp('10.0.0.5'), true);
    assert.strictEqual(SSRFGuard.isPrivateIp('172.20.0.1'), true);
    assert.strictEqual(SSRFGuard.isPrivateIp('192.168.1.100'), true);
    assert.strictEqual(SSRFGuard.isPrivateIp('169.254.169.254'), true); // Metadata
    assert.strictEqual(SSRFGuard.isPrivateIp('8.8.8.8'), false); // Public DNS

    // Test URL validator
    const blockedLocal = await SSRFGuard.validateUrl('http://localhost:5432');
    assert.strictEqual(blockedLocal.safe, false);

    const blockedPostgres = await SSRFGuard.validateUrl('http://postgres:5432');
    assert.strictEqual(blockedPostgres.safe, false);

    const blockedMetadata = await SSRFGuard.validateUrl('http://169.254.169.254/latest/meta-data');
    assert.strictEqual(blockedMetadata.safe, false);
  });

  // ============================================================================
  // 5. CREDENTIAL SERVICE (AES-256-GCM)
  // ============================================================================
  it('6. Credential Service: encrypts and decrypts secret data using AES-256-GCM', () => {
    const rawSecret = {
      apiKey: 'sk-proj-xarwiz-production-998877665544332211',
      orgId: 'org_4432',
      environment: 'prod',
    };

    const ciphertext = CredentialService.encrypt(rawSecret);
    assert.ok(ciphertext.includes(':'), 'Ciphertext must contain iv:tag:data format');

    const decrypted = CredentialService.decrypt(ciphertext);
    assert.strictEqual(decrypted.apiKey, rawSecret.apiKey);
    assert.strictEqual(decrypted.orgId, rawSecret.orgId);
    assert.strictEqual(decrypted.environment, rawSecret.environment);
  });

  // ============================================================================
  // 6. NODE REGISTRY & CATALOG DISCOVERY
  // ============================================================================
  it('7. Node Registry: discovers all core node types with metadata', () => {
    const allMetadata = NodeRegistry.getAllMetadata();
    assert.ok(allMetadata.length >= 10, 'Must have at least 10 registered nodes');

    const types = allMetadata.map((m) => m.type);
    assert.ok(types.includes('trigger.manual'));
    assert.ok(types.includes('trigger.webhook'));
    assert.ok(types.includes('trigger.cron'));
    assert.ok(types.includes('ai.llm'));
    assert.ok(types.includes('ai.rag'));
    assert.ok(types.includes('ai.agent'));
    assert.ok(types.includes('logic.if'));
    assert.ok(types.includes('integration.http'));
    assert.ok(types.includes('utility.code'));
  });

  // ============================================================================
  // 7. CONDITION & BRANCHING LOGIC EVALUATOR
  // ============================================================================
  it('8. Logic Node (If/Else): evaluates conditions accurately for true/false branching', async () => {
    const ifHandler = NodeRegistry.getHandler('logic.if');
    assert.ok(ifHandler, 'logic.if handler must exist');

    const mockContext: any = {
      tenantId: 'tenant-100',
      workflowId: 'wf-100',
      executionId: 'exec-100',
      triggerPayload: {},
      variables: {},
      nodesOutputs: {},
      stepsResults: [],
    };

    // Test 'contains' condition
    const resContains = await ifHandler.execute(
      {
        nodeId: 'if_1',
        nodeType: 'logic.if',
        config: { condition: 'contains', field: 'critical system outage', threshold: 'critical' },
        incomingData: 'critical system outage',
        previousNodesOutput: {},
        triggerPayload: {},
      },
      mockContext
    );
    assert.strictEqual(resContains.selectedBranch, 'true');

    // Test 'greater_than' condition
    const resGreater = await ifHandler.execute(
      {
        nodeId: 'if_2',
        nodeType: 'logic.if',
        config: { condition: 'greater_than', field: '499', threshold: '100' },
        incomingData: 499,
        previousNodesOutput: {},
        triggerPayload: {},
      },
      mockContext
    );
    assert.strictEqual(resGreater.selectedBranch, 'true');

    // Test 'equals' condition mismatch -> false branch
    const resEqualsFalse = await ifHandler.execute(
      {
        nodeId: 'if_3',
        nodeType: 'logic.if',
        config: { condition: 'equals', field: 'pro', threshold: 'enterprise' },
        incomingData: 'pro',
        previousNodesOutput: {},
        triggerPayload: {},
      },
      mockContext
    );
    assert.strictEqual(resEqualsFalse.selectedBranch, 'false');

    // Test 'regex' condition
    const resRegex = await ifHandler.execute(
      {
        nodeId: 'if_4',
        nodeType: 'logic.if',
        config: { condition: 'regex', field: 'INV-2026-9901', threshold: '^INV-\\d{4}-\\d+$' },
        incomingData: 'INV-2026-9901',
        previousNodesOutput: {},
        triggerPayload: {},
      },
      mockContext
    );
    assert.strictEqual(resRegex.selectedBranch, 'true');
  });

  // ============================================================================
  // 8. DATA TRANSFORM & RESTRUCTURE
  // ============================================================================
  it('9. Transform Node: maps fields from previous steps without code execution', async () => {
    const transformHandler = NodeRegistry.getHandler('utility.transform');
    assert.ok(transformHandler, 'utility.transform handler must exist');

    const mockContext: any = {
      tenantId: 'tenant-100',
      workflowId: 'wf-100',
      executionId: 'exec-100',
      triggerPayload: {
        rawCustomer: {
          user_email: 'johndoe@company.com',
          account_tier: 'Enterprise VIP',
        },
      },
      variables: {},
      nodesOutputs: {},
      stepsResults: [],
    };

    const resTransform = await transformHandler.execute(
      {
        nodeId: 'transform_1',
        nodeType: 'utility.transform',
        config: {
          mappings: [
            { from: '{{$trigger.body.rawCustomer.user_email}}', to: 'email' },
            { from: '{{$trigger.body.rawCustomer.account_tier}}', to: 'tier' },
          ],
        },
        incomingData: {},
        previousNodesOutput: {},
        triggerPayload: mockContext.triggerPayload,
      },
      mockContext
    );

    assert.strictEqual(resTransform.status, 'success');
    assert.strictEqual(resTransform.data.email, 'johndoe@company.com');
    assert.strictEqual(resTransform.data.tier, 'Enterprise VIP');
  });
});
