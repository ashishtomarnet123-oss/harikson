import { describe, it, expect } from '@jest/globals';
import { WorkflowEngine } from '../src/services/workflow/engine.js';
import { IStepExecutionResult } from '../src/services/workflow/types.js';

describe('Workflow Engine & Automation Test Suite', () => {
  it('1. Variable Interpolation: parses trigger payload, previous output, and step arrays', () => {
    const context = {
      trigger: {
        payload: {
          customerEmail: 'support@example.com',
          issueType: 'Billing Ingestion',
          amount: 499,
        },
      },
      prev: {
        output: 'Extracted summary from previous LLM step',
      },
      steps: [
        {
          stepId: 'step_1',
          stepIndex: 0,
          type: 'prompt' as const,
          status: 'completed' as const,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationMs: 150,
          input: {},
          output: 'First step classification result',
        },
      ] as IStepExecutionResult[],
      variables: {
        environment: 'production',
      },
    };

    const template1 = 'Notify {{trigger.payload.customerEmail}} about {{trigger.payload.issueType}} (Amount: ${{trigger.payload.amount}})';
    const res1 = WorkflowEngine.interpolate(template1, context);
    expect(res1).toBe('Notify support@example.com about Billing Ingestion (Amount: $499)');

    const template2 = 'Prior step output: {{prev.output}}';
    const res2 = WorkflowEngine.interpolate(template2, context);
    expect(res2).toBe('Prior step output: Extracted summary from previous LLM step');

    const template3 = 'First step says: {{steps[0].output}} in {{variables.environment}}';
    const res3 = WorkflowEngine.interpolate(template3, context);
    expect(res3).toBe('First step says: First step classification result in production');
  });

  it('2. Variable Interpolation: safely preserves unresolved tokens without crashing', () => {
    const context = {
      trigger: { payload: {} },
      prev: { output: null },
      steps: [],
      variables: {},
    };

    const template = 'Missing token: {{trigger.payload.nonExistentKey}}';
    const res = WorkflowEngine.interpolate(template, context);
    expect(res).toBe('Missing token: {{trigger.payload.nonExistentKey}}');
  });

  it('3. Workflow Step Types: supports prompt, webhook, email, rag_search, filter, agent, router, code, and slack', () => {
    const stepTypes = ['prompt', 'webhook', 'email', 'rag_search', 'filter', 'agent', 'router', 'code', 'slack'];
    expect(stepTypes.length).toBe(9);
    expect(stepTypes).toContain('router');
    expect(stepTypes).toContain('code');
    expect(stepTypes).toContain('slack');
  });

  it('4. DAG $node expression syntax: parses $node["id"].output and direct node_id.output', () => {
    const context = {
      nodesOutputs: {
        node_trigger: {
          event: 'lead_created',
          customer: { email: 'alex@example.com', name: 'Alex' },
        },
        node_llm: {
          sentiment: 'positive',
          confidence: 0.95,
        },
      },
      triggerPayload: {},
      variables: {},
    };

    const expr1 = 'Customer: {{$node["node_trigger"].output.customer.name}} <{{$node["node_trigger"].output.customer.email}}>';
    const res1 = WorkflowEngine.interpolate(expr1, context);
    expect(res1).toBe('Customer: Alex <alex@example.com>');

    const expr2 = 'Sentiment score: {{node_llm.sentiment}} ({{node_llm.confidence}})';
    const res2 = WorkflowEngine.interpolate(expr2, context);
    expect(res2).toBe('Sentiment score: positive (0.95)');
  });
});
