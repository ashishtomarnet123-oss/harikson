# Xarwiz Native Visual Workflow Automation Engine

Enterprise-grade, distributed DAG workflow automation system built directly into the **Xarwiz AI Platform**, providing an **n8n / Make.com** level experience deeply integrated with PostgreSQL RLS, BullMQ, pgvector, Ollama/Cloud AI models, and autonomous agents.

---

## Key Capabilities

* **Native React Flow Visual Canvas**: Custom glassmorphic nodes, drag-and-drop node palette, inspector drawers, minimap, auto-layout, and real-time execution overlays.
* **Topological DAG Engine**: Supports sequential pipelines, parallel branches, conditional If/Else branching, multi-path Switch routing, loops, and delay timers.
* **Immutable Versioning**: Clear separation between `DRAFT` and `PUBLISHED` states with one-click rollback and execution history tied to exact version numbers.
* **Durable Execution State**: Every node checkpoint is recorded in `workflow_node_executions` for crash-recovery, auditability, and per-step telemetry.
* **Zero-Trust Security**:
  * Outbound HTTP requests guarded by `SSRFGuard` against internal networks and cloud metadata IPs.
  * Encrypted credential storage using **AES-256-GCM** via `CredentialService`.
  * Multi-tenant data isolation enforced by PostgreSQL Row-Level Security (`app.current_tenant`).
* **Deep AI & RAG Integration**:
  * `ai.llm`: Ollama local inference (`llama3`, `mistral`, `qwen`) with cloud fallback and structured JSON extraction.
  * `ai.rag`: Semantic vector retrieval via PostgreSQL pgvector cosine similarity.
  * `ai.agent`: Multi-step reasoning and autonomous tool execution via `HariksonOrchestrator`.
* **Sandboxed Expression Engine**:
  * Safe expression interpolation: `{{$trigger.body.email}}`, `{{$node["step_1"].sentiment}}`, `{{$now}}`.
  * Built-in defenses against prototype pollution and environment leaks.

---

## Directory Structure

```text
harikson/tenant-api/src/
├── services/workflow/
│   ├── types.ts                     # Core TypeScript schemas & contracts
│   ├── engine.ts                    # Durable DAG execution orchestrator
│   ├── version.service.ts           # Draft, published, and rollback version manager
│   ├── credential.service.ts        # AES-256-GCM encrypted credential vault
│   ├── compiler/
│   │   ├── validator.ts             # DFS cycle detection & schema validation
│   │   └── compiler.ts              # Dependency matrix & topological scheduler
│   ├── expression/
│   │   └── engine.ts                # Sandboxed AST expression resolver
│   ├── security/
│   │   └── ssrf.ts                  # SSRF IP/hostname protection guard
│   ├── telemetry/
│   │   └── events.ts                # Real-time SSE / WebSocket event bus
│   └── nodes/
│       ├── registry.ts              # NodeRegistry catalog
│       ├── triggers.ts              # Manual, Webhook, and Cron triggers
│       ├── ai.ts                    # LLM, RAG search, and Autonomous Agent
│       ├── logic.ts                 # If/Else, Switch, Delay, Loop
│       ├── integrations.ts          # SSRF-guarded HTTP, Transform, Code, Email, Slack
│       └── index.ts                 # Automatic node bootstrap registry
├── routes/workflow.routes.ts        # Workflow REST API & SSE telemetry endpoints
└── migrations/
    └── 053_workflow_v2_schema.sql   # Versioning, checkpoints, and credentials schema
```

---

## API Endpoints

### Workflow Operations
* `GET /api/v1/workflows` — List workflows for tenant
* `POST /api/v1/workflows` — Create workflow
* `GET /api/v1/workflows/:id` — Get workflow definition
* `PUT /api/v1/workflows/:id` — Update workflow metadata
* `DELETE /api/v1/workflows/:id` — Delete workflow
* `POST /api/v1/workflows/:id/run` — Manually trigger execution
* `POST /api/v1/workflows/:id/webhook/:token` — Inbound HTTP webhook trigger
* `POST /api/v1/workflows/:id/validate` — Validate graph topology & node configs
* `GET /api/v1/workflows/:id/versions` — List workflow versions
* `POST /api/v1/workflows/:id/draft` — Save canvas changes to draft
* `POST /api/v1/workflows/:id/publish` — Publish draft to active production
* `POST /api/v1/workflows/:id/rollback` — Rollback to past version
* `GET /api/v1/workflows/:id/executions` — List execution run history
* `GET /api/v1/workflows/:id/executions/:execId` — Get execution details & node checkpoints
* `GET /api/v1/workflows/:id/executions/:execId/events` — Server-Sent Events (SSE) telemetry stream

### Metadata & Credentials
* `GET /api/v1/workflows/metadata/nodes` — Catalog of all registered node types with schemas
* `GET /api/v1/workflows/credentials` — List encrypted credentials (masked preview)
* `POST /api/v1/workflows/credentials` — Create encrypted credential (AES-256-GCM)
* `PUT /api/v1/workflows/credentials/:credId` — Update credential
* `DELETE /api/v1/workflows/credentials/:credId` — Delete credential
* `GET /api/v1/workflows/templates` — Pre-built production templates

---

## Verification & Tests

To run the workflow test suite:
```bash
cd harikson/tenant-api
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/neuravolt" \
TENANT_MASTER_KEY="xarwiz-master-key-production-32b-secure" \
JWT_SECRET="xarwiz-jwt-secret-key-32b-secure" \
node --test --test-force-exit dist/tests/workflow-v2.test.js
```
