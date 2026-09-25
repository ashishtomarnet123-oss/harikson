# Xarwiz Workflow Engine — Workflow Schema Reference

## 1. Top-Level Workflow Schema

Every workflow in Xarwiz is defined as an immutable, versioned Directed Acyclic Graph (DAG) compliant with the `IWorkflowGraph` interface:

```typescript
export interface IWorkflowGraph {
  nodes: IWorkflowNode[];
  edges: IWorkflowEdge[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}
```

### Workflow Entity in Database

```typescript
export interface IWorkflowV2 {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  trigger_type: 'manual' | 'webhook' | 'cron';
  cron_expression?: string;
  definition: IWorkflowGraph; // Latest canvas draft
  current_version: number;
  published_version_id?: string;
  active_version_id?: string;
  settings: {
    timeoutMs: number;
    maxConcurrency: number;
    failurePolicy: 'stop' | 'continue' | 'retry';
  };
  created_at: string;
  updated_at: string;
}
```

---

## 2. Node Schema

Every node inside `definition.nodes` defines a visual and execution unit:

```json
{
  "id": "node_llm_101",
  "type": "ai.llm",
  "position": { "x": 420, "y": 240 },
  "data": {
    "label": "AI Classifier",
    "description": "Classifies incoming customer inquiry",
    "credentialId": "cred_openai_production",
    "config": {
      "model": "gpt-4o-mini",
      "provider": "openai",
      "systemPrompt": "Classify the ticket into Support, Sales, or Billing.",
      "userPrompt": "{{$trigger.body.message}}",
      "temperature": 0.2,
      "jsonMode": true
    },
    "retryPolicy": {
      "maxRetries": 3,
      "retryIntervalMs": 2000
    },
    "timeoutMs": 30000
  }
}
```

### Supported Properties:
- `id`: Unique identifier (string, e.g. `node_123`).
- `type`: Qualified node type from `NodeRegistry` (e.g. `trigger.manual`, `ai.rag`, `logic.if`).
- `position`: Coordinates `{ x: number, y: number }` on the visual canvas.
- `data.label`: Human-readable node display name.
- `data.config`: Configuration object specific to node type.
- `data.credentialId`: Optional foreign key reference to `workflow_credentials`.
- `data.retryPolicy`: Retry settings for transient failures.
- `data.timeoutMs`: Node execution timeout threshold.

---

## 3. Edge Schema

Every edge connects an output handle of a source node to an input handle of a target node:

```json
{
  "id": "edge_1_2",
  "source": "node_if_1",
  "sourceHandle": "true",
  "target": "node_http_post",
  "targetHandle": "input"
}
```

### Handle Conventions:
- Standard execution flow uses `sourceHandle: null` or `"output"`.
- Condition / Logic nodes (`logic.if`) expose `"true"` and `"false"` handles.
- Switch nodes (`logic.switch`) expose handles corresponding to case values or `"default"`.
