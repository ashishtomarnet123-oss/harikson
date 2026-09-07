export type StepType = 'prompt' | 'rag_search' | 'webhook' | 'email' | 'filter' | 'agent';

export type TriggerType = 'manual' | 'webhook' | 'cron' | 'event';

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'canceled';

export interface IWorkflowStep {
  id: string | number;
  type: StepType;
  value?: string;
  name?: string;
  config?: {
    // For 'prompt':
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    // For 'webhook':
    url?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    bodyTemplate?: string;
    timeoutMs?: number;
    // For 'email':
    to?: string;
    subject?: string;
    template?: string;
    // For 'rag_search':
    query?: string;
    maxResults?: number;
    // For 'filter':
    condition?: string; // e.g., 'contains', 'greater_than', 'equals'
    field?: string;
    threshold?: string | number;
    // For 'agent':
    agentId?: string;
    task?: string;
  };
}

export interface IStepExecutionResult {
  stepId: string | number;
  stepIndex: number;
  type: StepType;
  status: 'completed' | 'failed' | 'skipped';
  startedAt: string;
  completedAt: string;
  durationMs: number;
  input: any;
  output: any;
  error?: string;
}

export interface IWorkflowExecutionContext {
  tenantId: string;
  workflowId: string;
  executionId: string;
  triggerType: TriggerType;
  triggerPayload: Record<string, any>;
  variables: Record<string, any>;
  stepsResults: IStepExecutionResult[];
}
