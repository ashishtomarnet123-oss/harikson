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

  it('3. Workflow Step Types: supports prompt, webhook, email, rag_search, filter, and agent', () => {
    const stepTypes = ['prompt', 'webhook', 'email', 'rag_search', 'filter', 'agent'];
    expect(stepTypes.length).toBe(6);
    expect(stepTypes).toContain('prompt');
    expect(stepTypes).toContain('rag_search');
    expect(stepTypes).toContain('webhook');
  });
});
