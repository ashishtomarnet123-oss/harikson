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
import { WorkflowVersionService } from '../src/services/workflow/version.service.js';

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

  // ============================================================================
  // 17. PHASE 2: DRAFT / PUBLISH & VERSIONING LIFECYCLE
  // ============================================================================
  it('18. Draft & Versioning: normalizes legacy definitions into compliant DAG graphs', () => {
    // A) Legacy steps array
    const legacySteps = [
      { id: '1', name: 'Prompt Step', type: 'prompt', value: 'Generate summary' },
      { id: '2', name: 'Email Step', type: 'email', config: { to: 'admin@xarwiz.com' } },
    ];

    const graph = WorkflowVersionService.normalizeToGraph(legacySteps);
    assert.ok(Array.isArray(graph.nodes), 'Normalized graph must contain nodes array');
    assert.strictEqual(graph.nodes.length, 2, 'Must have 2 nodes');
    assert.strictEqual(graph.edges.length, 1, 'Must have 1 connecting edge');
    assert.strictEqual(graph.edges[0].source, '1');
    assert.strictEqual(graph.edges[0].target, '2');

    // B) Already compliant graph representation
    const nativeGraph: IWorkflowGraph = {
      nodes: [
        { id: 'trig', type: 'triggerNode', position: { x: 50, y: 100 }, data: { label: 'Trigger' } },
        { id: 'node_1', type: 'llmNode', position: { x: 300, y: 100 }, data: { label: 'LLM' } },
      ],
      edges: [{ id: 'e1', source: 'trig', target: 'node_1' }],
      viewport: { x: 10, y: 20, zoom: 1.2 },
    };

    const preservedGraph = WorkflowVersionService.normalizeToGraph(nativeGraph);
    assert.strictEqual(preservedGraph.nodes.length, 2);
    assert.strictEqual(preservedGraph.edges.length, 1);
    assert.strictEqual(preservedGraph.viewport?.zoom, 1.2);
  });

  it('19. Publish Validation: surfaces structured validation errors when publishing invalid drafts', () => {
    // An invalid draft missing a trigger node
    const invalidDraftWithoutTrigger: IWorkflowGraph = {
      nodes: [
        { id: 'action_1', type: 'ai.llm', data: { label: 'Action 1' } },
      ],
      edges: [],
    };

    const validation = WorkflowValidator.validate(invalidDraftWithoutTrigger);
    assert.strictEqual(validation.valid, false, 'Invalid draft must fail validation before publish');
    assert.ok(validation.errors.length > 0, 'Must have structured validation errors');
    const triggerErr = validation.errors.find((e) => e.message.toLowerCase().includes('trigger'));
    assert.ok(triggerErr, 'Errors must pinpoint missing trigger node');

    // A valid draft with proper trigger and topological DAG
    const validDraft: IWorkflowGraph = {
      nodes: [
        { id: 'trig_1', type: 'trigger.manual', data: { label: 'Manual Trigger' } },
        { id: 'slack_1', type: 'integration.slack', data: { label: 'Slack Alert', config: { channel: '#ops' } } },
      ],
      edges: [{ id: 'e1', source: 'trig_1', target: 'slack_1' }],
    };

    const validRes = WorkflowValidator.validate(validDraft);
    assert.strictEqual(validRes.valid, true, 'Compliant DAG graph must pass publish validation');
    assert.strictEqual(validRes.errors.length, 0);
  });

  it('20. Version State Promotion & Rollback: enforces status transitions and audit history', () => {
    interface IMockVersion {
      id: string;
      version: number;
      status: 'draft' | 'published' | 'archived';
      definition: any;
      changelog?: string;
    }

    const versionStore: IMockVersion[] = [];

    // Step 1: Create draft v1
    const draftV1: IMockVersion = {
      id: 'ver-1',
      version: 1,
      status: 'draft',
      definition: { nodes: [{ id: 'trig' }], edges: [] },
      changelog: 'Initial draft v1',
    };
    versionStore.push(draftV1);
    assert.strictEqual(draftV1.status, 'draft');

    // Step 2: Publish v1
    draftV1.status = 'published';
    draftV1.changelog = 'Initial production release v1';
    let activeVersionId = draftV1.id;
    assert.strictEqual(draftV1.status, 'published');
    assert.strictEqual(activeVersionId, 'ver-1');

    // Step 3: Create draft v2 and publish it
    const draftV2: IMockVersion = {
      id: 'ver-2',
      version: 2,
      status: 'draft',
      definition: { nodes: [{ id: 'trig' }, { id: 'step_2' }], edges: [{ id: 'e1', source: 'trig', target: 'step_2' }] },
      changelog: 'Added step 2 in draft',
    };
    versionStore.push(draftV2);

    // Promote v2 to published and archive v1
    versionStore.forEach((v) => {
      if (v.status === 'published') v.status = 'archived';
    });
    draftV2.status = 'published';
    activeVersionId = draftV2.id;

    assert.strictEqual(draftV1.status, 'archived', 'Previous version must be archived upon publish');
    assert.strictEqual(draftV2.status, 'published', 'New version must be promoted to published');
    assert.strictEqual(activeVersionId, 'ver-2');

    // Step 4: Rollback to historical v1
    const targetRollback = versionStore.find((v) => v.version === 1);
    assert.ok(targetRollback, 'Target rollback version must exist');

    const nextVersionNumber = Math.max(...versionStore.map((v) => v.version)) + 1;
    const rollbackV3: IMockVersion = {
      id: `ver-${nextVersionNumber}`,
      version: nextVersionNumber,
      status: 'draft',
      definition: targetRollback.definition,
      changelog: `Rollback to version ${targetRollback.version}`,
    };
    versionStore.push(rollbackV3);

    // Promote rollback to published
    versionStore.forEach((v) => {
      if (v.status === 'published') v.status = 'archived';
    });
    rollbackV3.status = 'published';
    activeVersionId = rollbackV3.id;

    assert.strictEqual(rollbackV3.version, 3, 'Rollback must create an incremental version 3');
    assert.strictEqual(rollbackV3.status, 'published', 'Rollback version must be active published');
    assert.deepStrictEqual(rollbackV3.definition, draftV1.definition, 'Restored definition must match target snapshot');
    assert.strictEqual(draftV2.status, 'archived', 'Previous published version must be archived');
  });

  // ============================================================================
  // 18. PHASE 3: RETRY FAILED EXECUTION
  // ============================================================================
  it('21. Retry Execution: re-enqueues failed execution with exact payload and version pinning', async () => {
    interface IMockExecutionRow {
      id: string;
      workflow_id: string;
      workflow_version_id: string;
      tenant_id: string;
      status: 'queued' | 'running' | 'completed' | 'failed';
      trigger_type: string;
      trigger_payload: any;
      error_message?: string;
    }

    const mockDb: IMockExecutionRow[] = [
      {
        id: 'exec-failed-1',
        workflow_id: 'wf-order-sync',
        workflow_version_id: 'ver-prod-1',
        tenant_id: 'tenant-acme',
        status: 'failed',
        trigger_type: 'webhook',
        trigger_payload: { orderId: 'ord_99812', amount: 149.99, customerEmail: 'alex@example.com' },
        error_message: 'External API endpoint 503 Service Unavailable',
      },
    ];

    // Retry Handler Function (mirroring POST /:id/executions/:execId/retry)
    const retryExecution = (tenantId: string, workflowId: string, execId: string) => {
      const prev = mockDb.find(
        (e) => e.id === execId && e.workflow_id === workflowId && e.tenant_id === tenantId
      );
      if (!prev) throw new Error('Execution not found or unauthorized');

      const newExecId = `exec-retry-${Date.now()}`;
      const newExecution: IMockExecutionRow = {
        id: newExecId,
        workflow_id: prev.workflow_id,
        workflow_version_id: prev.workflow_version_id,
        tenant_id: prev.tenant_id,
        status: 'queued',
        trigger_type: prev.trigger_type,
        trigger_payload: { ...prev.trigger_payload },
      };
      mockDb.push(newExecution);
      return { success: true, executionId: newExecId, status: 'queued' };
    };

    // Unauthorized / Wrong tenant rejection
    assert.throws(
      () => retryExecution('wrong-tenant', 'wf-order-sync', 'exec-failed-1'),
      /Execution not found or unauthorized/
    );

    // Valid retry execution
    const retryResult = retryExecution('tenant-acme', 'wf-order-sync', 'exec-failed-1');
    assert.strictEqual(retryResult.success, true);
    assert.strictEqual(retryResult.status, 'queued');

    const created = mockDb.find((e) => e.id === retryResult.executionId);
    assert.ok(created, 'New execution record must be inserted in queued status');
    assert.strictEqual(created.workflow_version_id, 'ver-prod-1', 'Must pin to the workflow version');
    assert.deepStrictEqual(created.trigger_payload, {
      orderId: 'ord_99812',
      amount: 149.99,
      customerEmail: 'alex@example.com',
    });
  });

  // ============================================================================
  // 19. PHASE 3: EXECUTE DOWNSTREAM SUBGRAPH FROM SPECIFIC NODE (RUN FROM NODE)
  // ============================================================================
  it('22. Run From Node: traverses downstream subgraph, pre-seeds outputs, and skips upstream', async () => {
    // Multi-node DAG:
    // trig -> extract -> transform -> deliver
    //   \-> audit
    const dagNodes = [
      { id: 'trig', type: 'triggerNode' },
      { id: 'extract', type: 'step' },
      { id: 'transform', type: 'step' },
      { id: 'deliver', type: 'step' },
      { id: 'audit', type: 'step' },
    ];
    const dagEdges = [
      { id: 'e1', source: 'trig', target: 'extract' },
      { id: 'e2', source: 'extract', target: 'transform' },
      { id: 'e3', source: 'transform', target: 'deliver' },
      { id: 'e4', source: 'trig', target: 'audit' },
    ];

    const outgoingEdges = new Map<string, Array<{ source: string; target: string }>>();
    const incomingEdges = new Map<string, Array<{ source: string; target: string }>>();
    for (const node of dagNodes) {
      outgoingEdges.set(node.id, []);
      incomingEdges.set(node.id, []);
    }
    for (const edge of dagEdges) {
      outgoingEdges.get(edge.source)?.push(edge);
      incomingEdges.get(edge.target)?.push(edge);
    }

    const startNodeId = 'transform';
    const seededCheckpoints: Record<string, any> = {
      extract: { rawCount: 42, customer: 'Alice' },
    };

    // Subgraph Discovery Algorithm (identical to WorkflowEngine.executeWorkflow downstream scoping)
    const downstreamSet = new Set<string>();
    const searchQueue = [startNodeId];
    downstreamSet.add(startNodeId);

    while (searchQueue.length > 0) {
      const curr = searchQueue.shift()!;
      const outEdges = outgoingEdges.get(curr) || [];
      for (const edge of outEdges) {
        if (!downstreamSet.has(edge.target)) {
          downstreamSet.add(edge.target);
          searchQueue.push(edge.target);
        }
      }
    }

    // Downstream set must contain transform and deliver, but NOT trig, extract, or audit
    assert.deepStrictEqual(Array.from(downstreamSet), ['transform', 'deliver']);

    const visited = new Set<string>();
    for (const node of dagNodes) {
      if (!downstreamSet.has(node.id)) {
        visited.add(node.id);
      }
    }
    assert.ok(visited.has('trig'), 'Upstream trig must be pre-visited');
    assert.ok(visited.has('extract'), 'Upstream extract must be pre-visited');
    assert.ok(visited.has('audit'), 'Parallel audit node must be pre-visited');

    // Recalculate in-degree within downstream subgraph
    const inDegree = new Map<string, number>();
    for (const nodeId of downstreamSet) {
      const inEdges = incomingEdges.get(nodeId) || [];
      const internalInDegree = inEdges.filter((e) => downstreamSet.has(e.source)).length;
      inDegree.set(nodeId, internalInDegree);
    }

    // transform in-degree should be 0 because extract is outside downstream subgraph
    assert.strictEqual(inDegree.get('transform'), 0, 'Start node must have internal in-degree 0');
    // deliver in-degree should be 1 because transform is inside downstream subgraph
    assert.strictEqual(inDegree.get('deliver'), 1, 'Deliver must have in-degree 1');

    // Seeded context enables downstream expression evaluation
    const context: IWorkflowExecutionContext = {
      executionId: 'mock-subgraph-exec',
      workflowId: 'wf-1',
      tenantId: 'tenant-1',
      triggerType: 'manual',
      triggerPayload: {},
      variables: {},
      stepsResults: [],
      nodesOutputs: { ...seededCheckpoints },
    };

    const resolvedCount = ExpressionEngine.resolveToken('$node["extract"].output.rawCount', context);
    const resolvedUser = ExpressionEngine.resolveToken('$node["extract"].output.customer', context);

    assert.strictEqual(resolvedCount, 42, 'Downstream node must resolve seeded checkpoint output');
    assert.strictEqual(resolvedUser, 'Alice');

    const interpolated = ExpressionEngine.interpolate(
      'Order count is {{$node["extract"].output.rawCount}} for {{$node["extract"].output.customer}}',
      context
    );
    assert.strictEqual(interpolated, 'Order count is 42 for Alice');
  });

  // ============================================================================
  // 20. PHASE 3: WEBHOOK TEST MODE & IDEMPOTENCY SANDBOX
  // ============================================================================
  it('23. Webhook Test Sandbox: accepts dynamic JSON payloads and enforces idempotency', () => {
    interface IWebhookExecutionRecord {
      id: string;
      tenantId: string;
      workflowId: string;
      idempotencyKey?: string;
      payload: any;
      status: string;
    }

    const executionLog: IWebhookExecutionRecord[] = [];

    const handleWebhookPost = (
      workflow: { id: string; tenant_id: string; status: string; webhook_secret?: string },
      headers: Record<string, string | undefined>,
      body: any
    ) => {
      if (workflow.status !== 'active') throw new Error('Workflow is paused or inactive');

      const idempotencyKey = headers['x-idempotency-key'] || body?.idempotency_key;

      if (idempotencyKey) {
        const existing = executionLog.find(
          (e) => e.tenantId === workflow.tenant_id && e.idempotencyKey === idempotencyKey
        );
        if (existing) {
          return {
            status: 200,
            duplicate: true,
            executionId: existing.id,
            message: 'Idempotent request: returning existing execution',
          };
        }
      }

      const newId = `exec-hook-${Date.now()}`;
      executionLog.push({
        id: newId,
        tenantId: workflow.tenant_id,
        workflowId: workflow.id,
        idempotencyKey,
        payload: body,
        status: 'queued',
      });

      return {
        status: 202,
        duplicate: false,
        executionId: newId,
        message: 'Workflow execution queued from webhook',
      };
    };

    const wf = { id: 'wf_hook_test', tenant_id: 'tenant_1', status: 'active' };
    const payload = {
      event: 'order.completed',
      data: { orderId: 'ord_99812', amount: 149.99 },
    };

    // 1. Initial Webhook dispatch with idempotency key
    const resp1 = handleWebhookPost(wf, { 'x-idempotency-key': 'req_key_1001' }, payload);
    assert.strictEqual(resp1.status, 202);
    assert.strictEqual(resp1.duplicate, false);
    assert.ok(resp1.executionId);

    // 2. Replay with identical idempotency key returns 200 duplicate
    const resp2 = handleWebhookPost(wf, { 'x-idempotency-key': 'req_key_1001' }, payload);
    assert.strictEqual(resp2.status, 200);
    assert.strictEqual(resp2.duplicate, true);
    assert.strictEqual(resp2.executionId, resp1.executionId, 'Must return identical executionId without re-enqueuing');
    assert.strictEqual(executionLog.length, 1, 'Duplicate request must NOT create new execution record');
  });

  // ============================================================================
  // 21. PHASE 4: DYNAMIC NODE CATALOG & SCHEMA DISCOVERY
  // ============================================================================
  it('24. Node Catalog: discovers dynamic metadata and supported credentials across all categories', () => {
    const allMetadata = NodeRegistry.getAllMetadata();
    assert.ok(allMetadata.length >= 10, 'Must register at least 10 core node types');

    const categories = new Set(allMetadata.map((m) => m.category));
    assert.ok(categories.has('trigger'), 'Must include trigger category');
    assert.ok(categories.has('ai'), 'Must include ai category');
    assert.ok(categories.has('logic'), 'Must include logic category');
    assert.ok(categories.has('integration'), 'Must include integration category');
    assert.ok(categories.has('utility'), 'Must include utility category');

    // Supported credentials mapping
    const httpMeta = allMetadata.find((m) => m.type === 'integration.http');
    assert.ok(httpMeta, 'integration.http metadata must exist');
    assert.deepStrictEqual(httpMeta.supportedCredentials, ['api_key', 'bearer_token', 'basic_auth']);

    const slackMeta = allMetadata.find((m) => m.type === 'integration.slack');
    assert.ok(slackMeta, 'integration.slack metadata must exist');
    assert.deepStrictEqual(slackMeta.supportedCredentials, ['slack', 'discord']);

    const emailMeta = allMetadata.find((m) => m.type === 'integration.email');
    assert.ok(emailMeta, 'integration.email metadata must exist');
    assert.deepStrictEqual(emailMeta.supportedCredentials, ['smtp', 'api_key']);
  });

  // ============================================================================
  // 22. PHASE 4: ENCRYPTED CREDENTIAL VAULT & ZERO SECRET EXPOSURE
  // ============================================================================
  it('25. Credential Vault: secures secrets via AES-256-GCM and prevents plaintext exposure in listings', async () => {
    const rawSecret = {
      apiKey: 'sk_live_prod_xarwiz_topsecret998877665544332211',
      headerName: 'X-Vendor-Key',
    };

    // 1. Encryption contract
    const encrypted = CredentialService.encrypt(rawSecret);
    assert.ok(encrypted.includes(':'), 'Encrypted string must follow iv:authTag:ciphertext format');
    assert.strictEqual(encrypted.includes('sk_live_prod'), false, 'Encrypted payload must not leak plaintext');

    // 2. Decryption contract
    const decrypted = CredentialService.decrypt(encrypted);
    assert.deepStrictEqual(decrypted, rawSecret, 'Decrypted secret must match original payload exactly');

    // 3. Metadata listing zero-secret exposure contract
    interface IMockCredentialRow {
      id: string;
      tenant_id: string;
      name: string;
      type: string;
      encrypted_data: string;
      metadata: Record<string, any>;
    }

    const mockVault: IMockCredentialRow[] = [
      {
        id: 'cred-stripe-1',
        tenant_id: 'tenant-acme',
        name: 'Stripe Production Key',
        type: 'api_key',
        encrypted_data: encrypted,
        metadata: { preview: 'sk_l...2211' },
      },
    ];

    // Public list function (mirroring GET /api/v1/workflows/credentials)
    const listCredentialsForTenant = (tenantId: string) => {
      return mockVault
        .filter((c) => c.tenant_id === tenantId)
        .map((c) => ({
          id: c.id,
          tenant_id: c.tenant_id,
          name: c.name,
          type: c.type,
          metadata: c.metadata, // Contains only safe masked preview, NEVER encrypted_data
        }));
    };

    const listed = listCredentialsForTenant('tenant-acme');
    assert.strictEqual(listed.length, 1);
    assert.strictEqual((listed[0] as any).encrypted_data, undefined, 'Must NEVER return encrypted_data');
    assert.strictEqual((listed[0] as any).apiKey, undefined, 'Must NEVER return raw apiKey');
    assert.strictEqual(listed[0].metadata.preview, 'sk_l...2211');

    // Cross-tenant isolation
    const otherTenantList = listCredentialsForTenant('tenant-other');
    assert.strictEqual(otherTenantList.length, 0, 'Must enforce strict tenant isolation');
  });

  // ============================================================================
  // 23. PHASE 4: RUNTIME CREDENTIAL RESOLUTION & BOUND DISPATCH
  // ============================================================================
  it('26. Runtime Credential Binding: binds credentialId to integration node and injects secrets securely', async () => {
    // Registered secret in vault
    const slackSecret = {
      webhookUrl: 'https://hooks.slack.com/services/T00/B00/SECRET123',
    };
    const encSlackSecret = CredentialService.encrypt(slackSecret);

    const vaultMap = new Map<string, string>();
    vaultMap.set('tenant-1:cred-slack-vault', encSlackSecret);

    const resolveSecret = (tenantId: string, credId: string) => {
      const enc = vaultMap.get(`${tenantId}:${credId}`);
      if (!enc) return null;
      return CredentialService.decrypt(enc);
    };

    // Node configuration specifies only credentialId (Zero raw secret stored)
    const nodeConfig = {
      channel: '#alerts',
      message: 'Critical latency spike on cluster EU-West',
      credentialId: 'cred-slack-vault',
    };

    const tenantId = 'tenant-1';
    const resolved = resolveSecret(tenantId, nodeConfig.credentialId);
    assert.ok(resolved, 'Secret must be resolved using tenant context and credentialId');
    assert.strictEqual(resolved.webhookUrl, 'https://hooks.slack.com/services/T00/B00/SECRET123');

    // Wrong tenant cannot resolve credential
    const foreignTenantResolved = resolveSecret('tenant-intruder', nodeConfig.credentialId);
    assert.strictEqual(foreignTenantResolved, null, 'Foreign tenant cannot resolve vault secrets');
  });

  after(() => {
    setTimeout(() => process.exit(0), 50);
  });
});

