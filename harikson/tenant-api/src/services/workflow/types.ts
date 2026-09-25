export type StepType =
  | 'prompt'
  | 'rag_search'
  | 'webhook'
  | 'email'
  | 'filter'
  | 'agent'
  | 'router'
  | 'code'
  | 'slack'
  | 'discord'
  | 'telegram'
  | 'postgres'
  | 'transform'
  | 'switch'
  | 'loop'
  | 'delay'
  | 'trigger_manual'
  | 'trigger_webhook'
  | 'trigger_cron'
  | 'trigger_event'
  | string;

export type TriggerType = 'manual' | 'webhook' | 'cron' | 'event';

export type WorkflowStatus = 'draft' | 'validated' | 'published' | 'active' | 'paused' | 'archived';

export type WorkflowVersionStatus = 'draft' | 'validated' | 'published' | 'archived';

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'canceled';

export type NodeExecutionStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'waiting'
  | 'canceled';

export type FailurePolicy = 'stop' | 'continue' | 'route_error';

export interface IWorkflowSettings {
  timeoutMs?: number;
  maxConcurrency?: number;
  failurePolicy?: FailurePolicy;
  retryPolicy?: {
    maxRetries: number;
    delayMs: number;
    exponentialBackoff: boolean;
  };
}

export interface IWorkflowStepConfig {
  // For 'prompt' / LLM:
  systemPrompt?: string;
  userPrompt?: string;
  model?: string;
  provider?: 'ollama' | 'openai' | 'anthropic' | 'custom';
  temperature?: number;
  maxTokens?: number;
  structuredOutput?: boolean;
  jsonMode?: boolean;
  fallbackModel?: string;

  // For 'webhook' / HTTP:
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  bodyTemplate?: string;
  bodyType?: 'json' | 'form-data' | 'raw';
  timeoutMs?: number;
  followRedirects?: boolean;
  credentialId?: string;

  // For 'email':
  to?: string;
  subject?: string;
  template?: string;

  // For 'rag_search':
  query?: string;
  maxResults?: number;
  similarityThreshold?: number;
  knowledgeBaseId?: string;
  collectionId?: string;
  metadataFilters?: Record<string, any>;

  // For 'filter' / 'router' / 'logic.if':
  condition?:
    | 'contains'
    | 'not_contains'
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'greater_equal'
    | 'less_equal'
    | 'not_empty'
    | 'is_empty'
    | 'regex'
    | 'exists';
  field?: string;
  threshold?: string | number;

  // For 'switch':
  cases?: Array<{ value: string; handleId: string }>;
  defaultHandleId?: string;

  // For 'loop':
  itemsField?: string;
  batchSize?: number;

  // For 'delay':
  delaySeconds?: number;

  // For 'agent':
  agentId?: string;
  task?: string;
  instructions?: string;
  maxIterations?: number;

  // For 'code':
  codeSnippet?: string;

  // For 'transform':
  mappings?: Array<{ from: string; to: string }>;
  transformationType?: 'map' | 'filter' | 'extract' | 'custom';

  // For 'slack' / 'discord':
  channel?: string;
  webhookUrl?: string;
  message?: string;

  // General settings:
  timeout?: number;
  maxRetries?: number;
  retryDelayMs?: number;

  [key: string]: any;
}

export interface IWorkflowStep {
  id: string | number;
  type: StepType;
  value?: string;
  name?: string;
  config?: IWorkflowStepConfig;
}

export interface IWorkflowNodeData {
  label?: string;
  type?: StepType;
  value?: string;
  name?: string;
  description?: string;
  config?: IWorkflowStepConfig;
  credentials?: {
    credentialId?: string;
  };
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'skipped' | 'waiting';
  output?: any;
  error?: string;
  durationMs?: number;
  retryCount?: number;
  [key: string]: any;
}

export interface IWorkflowNode {
  id: string;
  type: string;
  version?: number;
  position?: { x: number; y: number };
  data: IWorkflowNodeData;
}

export interface IWorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null; // e.g. 'true' | 'false' for conditional branching
  targetHandle?: string | null;
  label?: string;
}

export interface IWorkflowGraph {
  nodes: IWorkflowNode[];
  edges: IWorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface IWorkflowDefinition {
  id?: string;
  name: string;
  version?: number;
  status?: WorkflowStatus;
  tenantId?: string;
  settings?: IWorkflowSettings;
  nodes: IWorkflowNode[];
  edges: IWorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface IWorkflowVersion {
  id: string;
  workflowId: string;
  tenantId: string;
  version: number;
  status: WorkflowVersionStatus;
  name: string;
  description?: string;
  definition: IWorkflowGraph;
  settings?: IWorkflowSettings;
  changelog?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IWorkflowNodeExecution {
  id: string;
  executionId: string;
  workflowId: string;
  workflowVersionId?: string;
  tenantId: string;
  nodeId: string;
  nodeType: string;
  status: NodeExecutionStatus;
  input: any;
  output: any;
  error?: any;
  retryCount: number;
  durationMs: number;
  startedAt?: string;
  finishedAt?: string;
  createdAt: string;
}

export interface IStepExecutionResult {
  stepId: string | number;
  nodeId?: string;
  stepIndex: number;
  type: StepType | string;
  status: 'completed' | 'failed' | 'skipped' | 'running';
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
  workflowVersionId?: string;
  executionId: string;
  triggerType: TriggerType;
  triggerPayload: Record<string, any>;
  variables: Record<string, any>;
  stepsResults: IStepExecutionResult[];
  nodesOutputs: Record<string, any>;
  metadata?: Record<string, any>;
  getCredential?: (credentialId: string) => Promise<Record<string, any> | null>;
}

export type CredentialType =
  | 'api_key'
  | 'bearer_token'
  | 'basic_auth'
  | 'oauth2'
  | 'smtp'
  | 'openai'
  | 'anthropic'
  | 'slack'
  | 'discord'
  | 'postgres';

export interface IWorkflowCredential {
  id: string;
  tenantId: string;
  name: string;
  type: CredentialType;
  metadata: {
    preview?: string;
    domainWhitelist?: string[];
    [key: string]: any;
  };
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IValidationErrorItem {
  nodeId?: string;
  field?: string;
  message: string;
}

export interface IValidationResult {
  valid: boolean;
  errors: IValidationErrorItem[];
  warnings?: IValidationErrorItem[];
}

export interface INodeMetadata {
  type: string;
  version: number;
  name: string;
  description: string;
  category: 'trigger' | 'ai' | 'logic' | 'integration' | 'utility';
  icon: string;
  color?: string;
  documentation?: string;
  supportedCredentials?: CredentialType[];
}

export interface INodeInput {
  nodeId: string;
  nodeType: string;
  config: IWorkflowStepConfig;
  incomingData: any;
  previousNodesOutput: Record<string, any>;
  triggerPayload: Record<string, any>;
}

export interface INodeOutput {
  status: 'success' | 'failed' | 'skipped' | 'waiting';
  data?: any;
  selectedBranch?: string; // e.g. 'true' | 'false' or custom switch branch
  error?: string;
  retryable?: boolean;
}

export interface INodeHandler {
  metadata: INodeMetadata;
  configSchema?: Record<string, any>;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
  validate(config: unknown): IValidationResult;
  execute(input: INodeInput, context: IWorkflowExecutionContext): Promise<INodeOutput>;
}

export interface IWorkflowTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  definition: IWorkflowGraph;
  requiredCredentials: CredentialType[];
  requiredIntegrations: string[];
  thumbnailUrl?: string;
  author: string;
  isPublic: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}
