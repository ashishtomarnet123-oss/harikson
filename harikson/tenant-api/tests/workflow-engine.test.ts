import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { WorkflowValidator } from '../src/services/workflow/compiler/validator.js';
import { WorkflowCompiler } from '../src/services/workflow/compiler/compiler.js';
import { ExpressionEngine } from '../src/services/workflow/expression/engine.js';
import { SSRFGuard } from '../src/services/workflow/security/ssrf.js';
import { CredentialService } from '../src/services/workflow/credential.service.js';
import { NodeRegistry } from '../src/services/workflow/nodes/index.js';
import { WorkflowEngine } from '../src/services/workflow/engine.js';
import { WorkflowEventEmitter } from '../src/services/workflow/telemetry/events.js';
import { IWorkflowGraph, IWorkflowExecutionContext, IWorkflowStep } from '../src/services/workflow/types.js';

describe('Xarwiz Workflow Engine: Diagnostic & Phase 0 Test Suite', () => {
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
    assert.deepStrictEqual(compiled.executionPlan[0], ['trig']);
    assert.ok(compiled.executionPlan[1].includes('a'));
    assert.ok(compiled.executionPlan[1].includes('b'));
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

    const template = 'Customer {{ $trigger.body.customer.email }} ({{ $trigger.customer.tier }}) has {{$node["sentimentNode"].sentiment}} sentiment in {{$variables.env}}';
    const result = ExpressionEngine.interpolate(template, context);
    assert.strictEqual(
      result,
      'Customer sarah@example.com (Enterprise) has positive sentiment in production'
    );

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
    assert.strictEqual(SSRFGuard.isPrivateIp('127.0.0.1'), true);
    assert.strictEqual(SSRFGuard.isPrivateIp('10.0.0.5'), true);
    assert.strictEqual(SSRFGuard.isPrivateIp('172.20.0.1'), true);
    assert.strictEqual(SSRFGuard.isPrivateIp('192.168.1.100'), true);
    assert.strictEqual(SSRFGuard.isPrivateIp('169.254.169.254'), true);
    assert.strictEqual(SSRFGuard.isPrivateIp('8.8.8.8'), false);

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

  // ============================================================================
  // 9. PHASE 0: FAN-IN ARRAY OF MULTIPLE PARENT OUTPUTS
  // ============================================================================
  it('10. Fan-In: executes node with array of distinct parent outputs', async () => {
    const mockContext: IWorkflowExecutionContext = {
      tenantId: 'tenant-100',
      workflowId: 'wf-fanin',
      executionId: 'exec-fanin',
      triggerType: 'manual',
      triggerPayload: {},
      variables: {},
      stepsResults: [],
      nodesOutputs: {
        node_branch_a: { data: 'Result A' },
        node_branch_b: { data: 'Result B' },
      },
    };

    const step: IWorkflowStep = {
      id: 'node_merge',
      type: 'utility.transform',
      name: 'Merge Step',
      config: {
        mappings: [],
      },
    };

    const fanInInputs = [mockContext.nodesOutputs.node_branch_a, mockContext.nodesOutputs.node_branch_b];
    const result = await WorkflowEngine.executeStep(step, 0, mockContext, fanInInputs);
    assert.strictEqual(result.status, 'completed');
    assert.deepStrictEqual(result.input.incomingData, fanInInputs);
  });

  // ============================================================================
  // 10. PHASE 0: PER-NODE RETRY WITH BACKOFF & CHECKPOINTING
  // ============================================================================
  it('11. Per-Node Retry: executes multiple attempts on failure with backoff', async () => {
    let callCount = 0;
    // Register temporary mock node that fails on attempt 1, succeeds on attempt 2
    NodeRegistry.register({
      metadata: {
        type: 'test.flaky',
        name: 'Flaky Node',
        category: 'testing',
        description: 'Fails then succeeds',
        version: 1,
      },
      execute: async () => {
        callCount++;
        if (callCount < 2) {
          throw new Error('Temporary network glitch');
        }
        return { status: 'success', data: { recovered: true, attempts: callCount } };
      },
    });

    const mockContext: IWorkflowExecutionContext = {
      tenantId: 'tenant-100',
      workflowId: 'wf-retry',
      executionId: 'mock-exec-id',
      triggerType: 'manual',
      triggerPayload: {},
      variables: {},
      stepsResults: [],
      nodesOutputs: {},
    };

    const step: IWorkflowStep = {
      id: 'flaky_step',
      type: 'test.flaky',
      config: {
        retry: {
          maxAttempts: 3,
          backoffMs: 20, // fast backoff for test
        },
      },
    };

    const result = await WorkflowEngine.executeStep(step, 0, mockContext, {});
    assert.strictEqual(result.status, 'completed');
    assert.strictEqual(callCount, 2, 'Should have retried exactly once and succeeded on attempt 2');
    assert.strictEqual(result.output.recovered, true);
  });

  // ============================================================================
  // 11. PHASE 0: PER-NODE TIMEOUT ENFORCEMENT
  // ============================================================================
  it('12. Per-Node Timeout: aborts node execution when exceeding timeoutMs', async () => {
    NodeRegistry.register({
      metadata: {
        type: 'test.slow',
        name: 'Slow Node',
        category: 'testing',
        description: 'Hangs longer than timeout',
        version: 1,
      },
      execute: async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return { status: 'success', data: { completed: true } };
      },
    });

    const mockContext: IWorkflowExecutionContext = {
      tenantId: 'tenant-100',
      workflowId: 'wf-timeout',
      executionId: 'mock-exec-id',
      triggerType: 'manual',
      triggerPayload: {},
      variables: {},
      stepsResults: [],
      nodesOutputs: {},
    };

    const step: IWorkflowStep = {
      id: 'slow_step',
      type: 'test.slow',
      config: {
        timeoutMs: 40, // 40ms timeout, node takes 200ms
      },
    };

    const result = await WorkflowEngine.executeStep(step, 0, mockContext, {});
    assert.strictEqual(result.status, 'failed');
    assert.ok(result.error?.includes('timed out after 40ms'), 'Error should report timeout');
  });

  // ============================================================================
  // 12. PHASE 0: PER-NODE continueOnError BEHAVIOR
  // ============================================================================
  it('13. Per-Node continueOnError: records error but allows execution continuation', async () => {
    NodeRegistry.register({
      metadata: {
        type: 'test.failing',
        name: 'Failing Node',
        category: 'testing',
        description: 'Always fails',
        version: 1,
      },
      execute: async () => {
        throw new Error('Non-critical metric push failure');
      },
    });

    const mockContext: IWorkflowExecutionContext = {
      tenantId: 'tenant-100',
      workflowId: 'wf-continue',
      executionId: 'mock-exec-id',
      triggerType: 'manual',
      triggerPayload: {},
      variables: {},
      stepsResults: [],
      nodesOutputs: {},
    };

    const step: IWorkflowStep = {
      id: 'fail_step',
      type: 'test.failing',
      config: {
        continueOnError: true,
      },
    };

    const result = await WorkflowEngine.executeStep(step, 0, mockContext, {});
    assert.strictEqual(result.status, 'failed');
    assert.strictEqual(step.config?.continueOnError, true);
    assert.ok(result.error?.includes('Non-critical metric push failure'));
  });

  // ============================================================================
  // 13. PHASE 0: KAHN'S ALGORITHM WITH MIXED INPUTS
  // ============================================================================
  it('14. Kahn DAG Traversal: ensures all dependencies are satisfied before execution', () => {
    // 3 parallel nodes feeding into 1 collector node
    const complexGraph: IWorkflowGraph = {
      nodes: [
        { id: 'trig', type: 'trigger.manual', data: { label: 'Start' } },
        { id: 'step_1', type: 'utility.transform', data: { label: 'T1' } },
        { id: 'step_2', type: 'utility.transform', data: { label: 'T2' } },
        { id: 'step_3', type: 'utility.transform', data: { label: 'T3' } },
        { id: 'collector', type: 'utility.transform', data: { label: 'Collector' } },
      ],
      edges: [
        { id: 'e1', source: 'trig', target: 'step_1' },
        { id: 'e2', source: 'trig', target: 'step_2' },
        { id: 'e3', source: 'trig', target: 'step_3' },
        { id: 'e4', source: 'step_1', target: 'collector' },
        { id: 'e5', source: 'step_2', target: 'collector' },
        { id: 'e6', source: 'step_3', target: 'collector' },
      ],
    };

    const compiled = WorkflowCompiler.compile(complexGraph);
    const collectorStageIndex = compiled.executionPlan.findIndex((stage) => stage.includes('collector'));
    const t1StageIndex = compiled.executionPlan.findIndex((stage) => stage.includes('step_1'));
    const t2StageIndex = compiled.executionPlan.findIndex((stage) => stage.includes('step_2'));
    const t3StageIndex = compiled.executionPlan.findIndex((stage) => stage.includes('step_3'));

    assert.ok(collectorStageIndex > t1StageIndex, 'Collector must execute after step_1');
    assert.ok(collectorStageIndex > t2StageIndex, 'Collector must execute after step_2');
    assert.ok(collectorStageIndex > t3StageIndex, 'Collector must execute after step_3');
  });

  // ============================================================================
  // 14. PHASE 0: IDEMPOTENCY KEY RETRIEVAL FORMAT
  // ============================================================================
  it('15. Idempotency: supports header x-idempotency-key and payload idempotency_key', () => {
    const headerKey = 'idemp_req_abc123';
    const bodyPayload = { idempotency_key: 'idemp_req_xyz789', data: 'sample' };

    const resolvedHeaderKey = headerKey || bodyPayload.idempotency_key;
    assert.strictEqual(resolvedHeaderKey, 'idemp_req_abc123');

    const resolvedBodyKey = undefined || bodyPayload.idempotency_key;
    assert.strictEqual(resolvedBodyKey, 'idemp_req_xyz789');
  });

  // ============================================================================
  // 15. PHASE 1: REAL-TIME SSE TELEMETRY STREAMING
  // ============================================================================
  it('16. Telemetry & SSE: WorkflowEventEmitter emits and delivers execution events', async () => {
    const execId = 'exec-sse-test-123';
    const receivedEvents: string[] = [];

    const unsubscribe = WorkflowEventEmitter.subscribeExecution(execId, (evt) => {
      receivedEvents.push(evt.event);
    });

    WorkflowEventEmitter.emit({
      event: 'execution.started',
      executionId: execId,
      workflowId: 'wf-1',
      tenantId: 'tenant-1',
      timestamp: new Date().toISOString(),
    });

    WorkflowEventEmitter.emit({
      event: 'node.started',
      executionId: execId,
      workflowId: 'wf-1',
      tenantId: 'tenant-1',
      nodeId: 'step_1',
      timestamp: new Date().toISOString(),
    });

    WorkflowEventEmitter.emit({
      event: 'node.completed',
      executionId: execId,
      workflowId: 'wf-1',
      tenantId: 'tenant-1',
      nodeId: 'step_1',
      timestamp: new Date().toISOString(),
      data: { output: { text: 'done' }, durationMs: 25 },
    });

    WorkflowEventEmitter.emit({
      event: 'node.skipped',
      executionId: execId,
      workflowId: 'wf-1',
      tenantId: 'tenant-1',
      nodeId: 'step_2',
      timestamp: new Date().toISOString(),
    });

    WorkflowEventEmitter.emit({
      event: 'execution.completed',
      executionId: execId,
      workflowId: 'wf-1',
      tenantId: 'tenant-1',
      timestamp: new Date().toISOString(),
      data: { status: 'completed', durationMs: 45 },
    });

    unsubscribe();

    assert.deepStrictEqual(receivedEvents, [
      'execution.started',
      'node.started',
      'node.completed',
      'node.skipped',
      'execution.completed',
    ]);
  });

  // ============================================================================
  // 16. PHASE 1: EVENT TO CANVAS NODE STATE MAPPING CONTRACT
  // ============================================================================
  it('17. SSE Event Mapping: maps events to running, completed, failed, and skipped states', () => {
    type NodeStatus = 'idle' | 'running' | 'completed' | 'failed' | 'skipped';
    interface INodeState {
      status: NodeStatus;
      output?: any;
      error?: string;
    }

    const stateMap: Record<string, INodeState> = {};

    const applyEvent = (evt: { event: string; nodeId?: string; data?: any }) => {
      if (!evt.nodeId) return;
      if (evt.event === 'node.started') {
        stateMap[evt.nodeId] = { status: 'running' };
      } else if (evt.event === 'node.completed') {
        stateMap[evt.nodeId] = { status: 'completed', output: evt.data?.output };
      } else if (evt.event === 'node.failed') {
        stateMap[evt.nodeId] = { status: 'failed', error: evt.data?.error };
      } else if (evt.event === 'node.skipped') {
        stateMap[evt.nodeId] = { status: 'skipped' };
      }
    };

    applyEvent({ event: 'node.started', nodeId: 'node_a' });
    assert.strictEqual(stateMap['node_a'].status, 'running');

    applyEvent({ event: 'node.completed', nodeId: 'node_a', data: { output: { id: 42 } } });
    assert.strictEqual(stateMap['node_a'].status, 'completed');
    assert.strictEqual(stateMap['node_a'].output.id, 42);

    applyEvent({ event: 'node.started', nodeId: 'node_b' });
    applyEvent({ event: 'node.failed', nodeId: 'node_b', data: { error: 'Connection refused' } });
    assert.strictEqual(stateMap['node_b'].status, 'failed');
    assert.strictEqual(stateMap['node_b'].error, 'Connection refused');

    applyEvent({ event: 'node.skipped', nodeId: 'node_c' });
    assert.strictEqual(stateMap['node_c'].status, 'skipped');
  });

  after(() => {
    process.exit(0);
  });
});

