# Xarwiz Workflow Engine — Execution Engine Reference

## 1. Overview

The **Xarwiz Execution Engine** orchestrates distributed workflow executions across BullMQ workers and persistent PostgreSQL states. It supports sequential execution, parallel branches, conditional branching, delays, and loops.

---

## 2. Compilation and Topological Staging

Before a workflow is dispatched, `WorkflowCompiler.compile(graph)` evaluates the graph into indexed execution stages:

```typescript
export interface ICompiledWorkflow {
  entryNodes: string[];           // Trigger node IDs
  nodeMap: Map<string, IWorkflowNode>;
  adjacencyList: Map<string, string[]>;
  reverseAdjacency: Map<string, string[]>;
  executionPlan: string[][];      // Sequential array of parallel node ID sets
}
```

### Stage Execution Logic:
1. Stage 0 executes all root triggers.
2. Subsequent stages execute in parallel where nodes have all upstream dependencies resolved.
3. Conditional branching flags skip downstream branches whose condition was not met (`status: 'skipped'`).

---

## 3. Durable Execution Checkpointing

Every node transition is persisted in PostgreSQL table `workflow_node_executions`:

```text
execution_id         UUID
node_id              TEXT
node_type            TEXT
status               'pending' | 'running' | 'success' | 'failed' | 'skipped'
input                JSONB
output               JSONB
error                TEXT
duration_ms          INTEGER
retry_count          INTEGER
started_at           TIMESTAMPTZ
finished_at          TIMESTAMPTZ
```

### Crash Recovery:
If a worker fails or restarts during a long-running workflow:
- Nodes already marked `success` in `workflow_node_executions` are skipped.
- State resumes from the last pending or waiting stage.
- Duplicate side-effects (e.g. HTTP POST or Email) are prevented.

---

## 4. Retries & Exponential Backoff

For nodes configured with a `retryPolicy`:
- Transient network or 5xx HTTP errors trigger BullMQ retry backoff:
  `delay = retryIntervalMs * (2 ^ (attempt - 1))`
- Permanent 4xx client errors (e.g. 401 Unauthorized, 403 Forbidden, 404 Not Found) fail immediately without retry.
