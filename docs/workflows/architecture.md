# Xarwiz Workflow Engine — Architecture & Execution Engine

## 1. High-Level Architecture Overview

The **Xarwiz Visual Workflow Automation Engine** is a native, multi-tenant distributed orchestration platform modeled on the DAG (Directed Acyclic Graph) paradigm. It enables complex chaining of triggers, local & cloud AI models, semantic vector searches, conditional routers, delays, transformations, and third-party SaaS integrations.

```text
               React Flow Visual Control Plane (User Portal & Admin Panel)
                                    │
                                    │ REST / SSE Stream
                                    ▼
                          Xarwiz Tenant API
                                    │
                   ┌────────────────┴────────────────┐
                   │                                 │
                   ▼                                 ▼
           Workflow Validator              Workflow Version Service
          (Cycles, schemas, ports)         (DRAFT, PUBLISHED, ARCHIVED)
                   │                                 │
                   ▼                                 ▼
           Workflow Compiler ───────────────> Execution Manager
         (Topological stages)              (Context & Checkpoints)
                                                     │
                                                     ▼
                                            Durable Node Runner
                                      (workflow_node_executions table)
                                                     │
                                                     ▼
                                        Real-Time Event Streamer
                                      (SSE / WebSocket Telemetry)
```

## 2. Core Architectural Components

### A. Graph Validator (`WorkflowValidator`)
Located at `src/services/workflow/compiler/validator.ts`.
- Validates graph topology before publishing.
- Runs Depth-First Search (DFS) with recursion stack to detect cycles.
- Identifies root triggers, unreachable orphan nodes, and unconfigured condition branch handles (`true`/`false`).
- Validates node-specific configuration schemas against `NodeRegistry`.

### B. Topological Compiler (`WorkflowCompiler`)
Located at `src/services/workflow/compiler/compiler.ts`.
- Transforms raw `{ nodes, edges }` into an indexed dependency matrix.
- Calculates in-degree and out-degree per node.
- Computes execution stages via Kahn's algorithm for parallel branch execution.

### C. Sandboxed Expression Engine (`ExpressionEngine`)
Located at `src/services/workflow/expression/engine.ts`.
- Resolves expressions: `{{$trigger.body.email}}`, `{{$node["sentiment"].output.score}}`, `{{$now}}`, `{{$workflow.id}}`.
- Hardened sandbox: Blocks prototype pollution (`__proto__`, `constructor`, `prototype`), `process`, `require`, and internal globals.
- Deep recursive interpolation for complex nested configurations.

### D. Durable Node Execution State
Stored in `workflow_node_executions` table with PostgreSQL Row-Level Security:
- Every node records its `status`, `input`, `output`, `error`, `duration_ms`, `started_at`, and `finished_at`.
- If a worker restarts, the execution manager can resume from the durable checkpoint without re-running completed side-effects.

### E. Real-Time Telemetry Stream (`WorkflowEventEmitter`)
Located at `src/services/workflow/telemetry/events.ts`.
- Dispatches execution and node state transitions (`node.started`, `node.completed`, `node.skipped`, `execution.completed`).
- Streamed live to frontend canvases via Server-Sent Events (SSE) on `/api/v1/workflows/:id/executions/:execId/events`.
