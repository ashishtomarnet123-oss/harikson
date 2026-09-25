# Xarwiz AI Platform — Workflow Automation Engine Audit

**Document:** `WORKFLOW_ENGINE_AUDIT.md`  
**Status:** Complete  
**Date:** September 23, 2026  
**Auditor:** Principal Software Architect & AI Platform Engineering  

---

## Executive Summary

This document performs an exhaustive 30-point codebase audit of the **Xarwiz AI Platform** (formerly Harikson/Neuravolt) to establish the architectural, operational, and security baseline for building the **Xarwiz Native Visual Workflow Automation & AI Automation Engine**.

The target system is an enterprise-grade, visual DAG automation engine comparable in utility to **n8n / Make.com**, natively embedded into Xarwiz's multi-tenant Next.js frontend, Express/PostgreSQL/RLS backend, Redis/BullMQ distributed scheduler, and local/cloud AI inference pipeline.

---

## Table of Contents
1. [Repository Architecture](#1-repository-architecture)
2. [Applications](#2-applications)
3. [Services](#3-services)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Architecture](#6-database-architecture)
7. [Authentication](#7-authentication)
8. [Authorization / RBAC](#8-authorization--rbac)
9. [Multi-Tenancy](#9-multi-tenancy)
10. [PostgreSQL Row-Level Security (RLS)](#10-postgresql-row-level-security-rls)
11. [Redis Architecture](#11-redis-architecture)
12. [BullMQ Distributed Queue Architecture](#12-bullmq-distributed-queue-architecture)
13. [Existing Workflow System Analysis](#13-existing-workflow-system-analysis)
14. [AI Infrastructure](#14-ai-infrastructure)
15. [LLM Infrastructure](#15-llm-infrastructure)
16. [RAG Infrastructure](#16-rag-infrastructure)
17. [Agent Infrastructure](#17-agent-infrastructure)
18. [Existing Integrations](#18-existing-integrations)
19. [API Architecture & Conventions](#19-api-architecture--conventions)
20. [WebSocket / SSE Real-time Infrastructure](#20-websocket--sse-real-time-infrastructure)
21. [Logging Infrastructure](#21-logging-infrastructure)
22. [Monitoring & Telemetry](#22-monitoring--telemetry)
23. [Billing System Integration](#23-billing-system-integration)
24. [Usage Metering](#24-usage-metering)
25. [Existing Test Suites](#25-existing-test-suites)
26. [Deployment & Container Architecture](#26-deployment--container-architecture)
27. [Environment Variables & Configuration](#27-environment-variables--configuration)
28. [Security Risks & Vulnerability Analysis](#28-security-risks--vulnerability-analysis)
29. [Technical Debt & Architectural Bottlenecks](#29-technical-debt--architectural-bottlenecks)
30. [Recommended Integration Points](#30-recommended-integration-points)
31. [Existing Workflow Implementation Catalog](#31-existing-workflow-implementation-catalog)

---

## 1. Repository Architecture

The repository is structured as a multi-tier mono-repository with modular backend microservices, Next.js frontend applications, and shared configurations:

```text
/
├── docker-compose.yml              # Central multi-container orchestration
├── traefik/                        # Traefik v2.11 reverse proxy & dynamic configs
├── harikson/
│   ├── tenant-api/                 # Core multi-tenant backend (TypeScript/Express)
│   ├── backend/                    # Legacy/Prisma service & database migrations
│   └── ide-extension/              # VSCode / IDE bridge extension
├── admin-api/                      # Control plane management service (Node.js ESM)
├── user-portal/                    # End-user SaaS dashboard (Next.js 14 Pages Router)
├── admin-panel/                    # Platform administration dashboard (Next.js 14 App Router)
├── orchestrator/                   # Container & worker lifecycle management API
├── monitoring/                     # Prometheus rules, Loki & Promtail configs
└── scripts/                        # Database backup, restore, migration & deploy scripts
```

## 2. Applications

1. **User Portal (`user-portal`)**:
   - Next.js 14.2 (Pages router), React 18, Tailwind CSS, `@xyflow/react`.
   - Runs on port 3002 (internal) / 3028 (host port).
   - Domain: `https://xarwiz.com` / `https://www.xarwiz.com`.
   - Target audience: Tenant owners, developers, team members.

2. **Admin Panel (`admin-panel`)**:
   - Next.js 14.2 (App router), React 18, Tailwind CSS, Lucide icons, `@xyflow/react`.
   - Runs on port 3001 (internal) / 3018 (host port).
   - Domain: `https://admin.xarwiz.com`.
   - Target audience: Platform Superadmins, Support Engineers, Ops.

3. **IDE Extension & Bridge (`ide-extension`, `ide-bridge`)**:
   - Desktop and developer environment extensions communicating via `tenant-api`.

## 3. Services

1. **Traefik (`harikson-traefik`)**:
   - Edge reverse proxy terminating TLS (Let's Encrypt), rate limiting, security headers, host routing.
2. **Tenant API (`harikson-tenant-api`)**:
   - Main multi-tenant REST API gateway on port 3008 (`api.xarwiz.com`).
   - Owns tenant authentication, BullMQ queues, Ollama client, RAG vector retrieval, and workflow execution.
3. **Admin API (`harikson-admin-api`)**:
   - Internal administrative service on port 4000 (`admin-api.xarwiz.com`).
   - Manages tenant lifecycle, operations, subscriptions, and platform-wide monitoring.
4. **Ollama (`harikson-ollama`)**:
   - Local AI inference engine on port 11434 with dedicated resource allocations (7 CPUs, 12 GB RAM).
5. **PostgreSQL (`harikson-postgres`)**:
   - PostgreSQL 15 with `pgvector` extension (`pgvector/pgvector:pg15`) on port 5432.
6. **Redis (`harikson-redis`)**:
   - Redis 7 Alpine with Append-Only File (AOF) persistence on port 6379.
7. **Orchestrator (`harikson-orchestrator`)**:
   - Node service on port 5001 interfacing with Docker socket for container control.
8. **Prometheus & Grafana**:
   - System monitoring on ports 9090 and 3003 (`monitor.xarwiz.com`).

## 4. Frontend Architecture

- **User Portal (`user-portal`)**:
  - Pages: `/workflows`, `/chat`, `/knowledge`, `/agents`, `/billing`, `/settings`.
  - Architecture: React state hooks, modular component trees, Axios API client configured with tenant JWT tokens in session/cookies.
  - Workflow UI: Implements `components/workflow/VisualWorkflowEditor.js` using `@xyflow/react` v12 with custom node rendering, node inspector drawer, and variable insertion helpers.
- **Admin Panel (`admin-panel`)**:
  - Routes: `app/admin/workflows/page.tsx`, `app/admin/tenants`, `app/admin/voice`, `app/admin/operations`.
  - Architecture: Next.js 14 App Router, Server Components + Client Boundary components (`"use client"`), Tailwind glassmorphism styling.
  - Workflow UI: Implements `app/admin/workflows/VisualWorkflowEditor.tsx` with admin-level override controls and graph inspection.

## 5. Backend Architecture

- **`harikson/tenant-api`**:
  - Language: TypeScript (compiled to ES2022 via `tsc`).
  - Web framework: Express 4.x with CORS, helmet, compression, json body parser (10MB limit).
  - Persistence Layer: Direct connection pool (`pg.Pool`), `executeTenantQuery` helper setting PostgreSQL transaction-level tenant context (`SET LOCAL app.current_tenant = $1`).
  - Background Job Architecture: BullMQ `Queue` and `Worker` instances managed via `HariksonScheduler`.

- **`admin-api`**:
  - Language: Node.js (ESM modules).
  - Framework: Express 4.x, Joi schema validation (`operations.schema.js`), direct `pg.Pool` access for cross-tenant administrative reporting.

## 6. Database Architecture

- Database name: `neuravolt`
- Extensions installed: `uuid-ossp`, `pgcrypto`, `vector` (pgvector 15).
- Total migrations: 52 SQL migrations in `harikson/tenant-api/src/migrations/`.
- Key workflow tables:
  1. `workflows`:
     - Primary Key: `id UUID DEFAULT uuid_generate_v4()`.
     - Foreign Key: `tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE`.
     - Columns: `name`, `description`, `definition JSONB`, `steps JSONB`, `trigger_type`, `status`, `cron_expression`, `webhook_secret`, `execution_count`, `last_execution_at`, `avg_duration_ms`, `success_rate`, `created_at`, `updated_at`.
     - Indexes: `idx_workflows_tenant_status (tenant_id, status)`, `idx_workflows_cron (trigger_type, status) WHERE trigger_type = 'cron'`, `idx_workflows_tenant_id (tenant_id)`.
  2. `workflow_executions`:
     - Primary Key: `id UUID DEFAULT uuid_generate_v4()`.
     - Foreign Keys: `workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE`, `tenant_id UUID REFERENCES tenants(id)`.
     - Columns: `status` ('running'|'completed'|'failed'|'canceled'), `started_at`, `completed_at`, `duration_ms`, `logs TEXT`, `error_message TEXT`, `step_results JSONB`, `trigger_payload JSONB`, `trigger_type VARCHAR(50)`, `created_at`.
     - Indexes: `idx_workflow_executions_wf_started (workflow_id, started_at DESC)`, `idx_workflow_executions_tenant (tenant_id, started_at DESC)`.

## 7. Authentication

- **User Authentication**:
  - JWT Tokens signed with `JWT_SECRET` (RS256/HS256).
  - Refresh token rotation with device fingerprint binding (`refresh_tokens` table with `family_id`).
  - 2FA/TOTP verification using `otplib` with hashed backup recovery codes (`users.two_factor_secret`, `users.two_factor_backup_codes`).
  - Google OAuth2 authentication (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
- **Admin Authentication**:
  - Superadmin role verification via `admin-api/src/middleware/auth.js`.
  - 2FA verification enforced for sensitive platform administration.
- **Service-to-Service Authentication**:
  - `INTERNAL_API_SECRET` passed in `X-Internal-Secret` header between `admin-api` and `tenant-api`.

## 8. Authorization / RBAC

- Roles: `superadmin`, `admin`, `member`, `viewer`.
- Middleware: `requireRole(['admin', 'member'])` in `harikson/tenant-api/src/middleware/auth.ts`.
- Workflow permission boundaries: Currently all authenticated tenant members can view workflows; admins can create/update/execute.
- Target RBAC requirement: Granular workflow permissions (`workflow.read`, `workflow.create`, `workflow.update`, `workflow.delete`, `workflow.execute`, `workflow.publish`, `workflow.credentials.manage`).

## 9. Multi-Tenancy

- Architecture: Logical multi-tenancy in shared PostgreSQL database isolated by `tenant_id` UUID column.
- Every tenant resource (`users`, `workflows`, `workflow_executions`, `knowledge_bases`, `documents`, `agents`) explicitly references `tenants(id)`.
- Request pipeline: Authenticated JWT extracts `tenant_id` from claims, verified against `tenants` table.

## 10. PostgreSQL Row-Level Security (RLS)

- Migration `044_phase4_rls_indexes_schema.sql` enforces RLS:
  ```sql
  ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
  ALTER TABLE workflows FORCE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation_policy ON workflows 
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
  ```
- Connection wrapper: `executeTenantQuery(tenantId, callback)` sets `set_config('app.current_tenant', tenantId, false)` and clears it in a `finally` block.
- Result: Any query running inside `executeTenantQuery` cannot read or modify another tenant's workflow or execution rows even if an application bug omits `WHERE tenant_id = ...`.

## 11. Redis Architecture

- Single Redis 7 Alpine instance in Docker with password protection (`REDIS_PASSWORD`).
- Mode: Standalone with AOF (`appendonly yes`) and LRU eviction policy (`allkeys-lru`).
- Connection: Handled via `ioredis` with `maxRetriesPerRequest: null` (required for BullMQ blocking commands).
- Namespacing: Queues use default BullMQ keys (`bull:workflowQueue:*`, `bull:memoryQueue:*`, etc.), caching keys use prefixes (`tenant:cache:*`, `ratelimit:*`).

## 12. BullMQ Distributed Queue Architecture

- Queues configured in `HariksonScheduler`:
  1. `workflowQueue`: Processes workflow runs (concurrency: 3).
  2. `memoryQueue`: Conversation memory extraction poller (repeat: every 10s).
  3. `summarizerQueue`: Conversation summarizer (repeat: every 15s, concurrency: 5).
  4. `cacheQueue`: Vector cache warmer.
  5. `cleanupQueue`: Daily database cleanup job (cron: `0 3 * * *`).
  6. `failedQueue`: Dead-Letter Queue (DLQ) receiving exhausted jobs after max retry attempts.
- Worker Error Handling: Exponential backoff with retry tracking and DLQ ingestion logging to `activity_logs`.

## 13. Existing Workflow System Analysis

- **Current Capabilities**:
  - `harikson/tenant-api/src/services/workflow/engine.ts` supports both linear pipeline execution (`steps: []`) and directed graph traversal (`definition: { nodes: [], edges: [] }`).
  - Supported step/node types: `prompt` (Ollama), `rag_search` (vector cosine similarity), `webhook` (HTTP fetch), `email` (dispatch simulation), `slack` (HTTP POST), `router`/`filter` (condition router with `true`/`false` source handles), `code` (Function constructor), `agent` (Ollama task generator).
  - Expression interpolation: `WorkflowEngine.interpolate` handles `{{$node["id"].output.field}}`, `{{node_id.output}}`, and `{{trigger.payload.key}}`.
- **Architectural Gaps & Deficiencies**:
  1. *No Workflow Versioning*: Workflows are edited in-place; running workflows can be corrupted during drafting.
  2. *Naive Code Sandbox*: The `code` node uses `new Function('input', 'context', codeSnippet)` which executes directly within the Express backend thread without resource limits or memory isolation.
  3. *No Dedicated Node Schema Registry*: Node metadata and schemas are hardcoded across multiple files.
  4. *Unprotected HTTP Node*: Webhook/HTTP node lacks SSRF prevention (internal IP ranges like `127.0.0.1`, `10.0.0.0/8`, `169.254.169.254` are not filtered).
  5. *Synchronous Node Execution Inside Worker*: Long-running node jobs block BullMQ concurrency; no durable node-level pause/resume state.
  6. *Plaintext Secrets in Node Configurations*: Webhook tokens and API keys are stored directly inside JSONB configs rather than referenced by encrypted `credential_id`.

## 14. AI Infrastructure

- Local inference: Ollama container (`harikson-ollama`) running models such as `llama3`, `mistral`, `nomic-embed-text`.
- Resource limits: Dedicated 7 CPU cores, 12 GB RAM, max 1 loaded model concurrently (`OLLAMA_MAX_LOADED_MODELS=1`).
- Fallback & external provider support: Needs clean abstraction for OpenAI and Anthropic cloud providers when high-reasoning tasks or structured outputs are required.

## 15. LLM Infrastructure

- `harikson/tenant-api/src/services/ollama.service.ts` provides `generate(prompt, systemPrompt)` and `chat(messages)`.
- Client class: `harikson/tenant-api/src/llm/ollama.ts` provides embedding generations via `OllamaClient.embed(text)`.
- Missing capability: Streaming output handling for workflow nodes, token usage telemetry tracking, and fallback provider failover.

## 16. RAG Infrastructure

- Storage: PostgreSQL `document_embeddings` table with `embedding vector(1536)` (or 768/4096 depending on model).
- Service: `harikson/tenant-api/src/services/rag.service.ts` performs cosine distance vector search (`<=>`) scoped to `tenant_id` and `knowledge_base_id`.
- Hybrid search: Migration `025_add_hybrid_search.sql` combines vector similarity with PostgreSQL full-text search (`tsvector` / `tsquery`).

## 17. Agent Infrastructure

- Tables: `agents`, `agent_sessions`, `agent_tasks`, `tool_executions`.
- Service: `harikson/tenant-api/src/services/agent.service.ts` coordinates autonomous agent execution loops with tool dispatches.
- Integration: Workflow engine can trigger an agent run as a single atomic node and ingest its structured resolution.

## 18. Existing Integrations

- Google Drive (`src/services/googleDriveSyncService.ts`): OAuth2 token refresh and document synchronization.
- Razorpay (`src/routes/billing.routes.ts`): Subscriptions, invoices, webhook payment verification.
- Slack / Discord Webhooks: Simple HTTP POST in `WorkflowEngine`.
- SMTP / Email: Configured via `smtp_configs` and `email_logs` tables.

## 19. API Architecture & Conventions

- Routing pattern: `/api/v1/:resource` in `tenant-api`.
- Request lifecycle:
  1. `cors` + `helmet`
  2. `authenticateToken` middleware (populates `req.user` and `req.tenant`)
  3. `validate(schema)` Joi/Zod request validation
  4. Handler calling `executeTenantQuery`
  5. JSON envelope response: `{ success: true, data: ... }` or `{ error: ... }`.

## 20. WebSocket / SSE Real-time Infrastructure

- Existing real-time channels:
  - User portal and voice sessions use WebSocket streams on `/ws` or Server-Sent Events (SSE) for chat tokens.
- Workflow requirement: SSE/WebSocket stream for real-time node execution status (`node.started`, `node.completed`, `node.failed`) to power visual canvas debugging.

## 21. Logging Infrastructure

- Logger: `harikson/tenant-api/src/observability/logger.ts` wrapping structured JSON output.
- Retention: Docker logs handled by `json-file` driver with 10MB rotation (max 3 files).
- Activity logs: `activity_logs` table records tenant user actions and system events.

## 22. Monitoring & Telemetry

- Prometheus scrapes `harikson-tenant-api` metrics on `/metrics`.
- Grafana renders dashboards for HTTP latency, queue depth, and memory consumption.
- Health checks: `/health` endpoints in all services verified by Traefik and Docker health checks every 30 seconds.

## 23. Billing System Integration

- Database tables: `subscriptions`, `invoices`, `plan_limits_and_features`.
- Metering: Plan tiers (`free`, `starter`, `professional`, `enterprise`) define execution caps and token limits.
- Enforcement: Workflow execution must check tenant subscription limits before queuing.

## 24. Usage Metering

- Tables: `token_usage`, `voice_usage`, `infrastructure_costs`.
- Target workflow metering: Must track workflow executions, node execution counts, LLM tokens consumed, and duration per tenant.

## 25. Existing Test Suites

- Framework: Jest (`ts-jest`) in `harikson/tenant-api`.
- Key existing tests:
  - `tests/workflow-engine.test.ts` (verifies variable interpolation and step types).
  - `tests/rls.test.ts` (verifies PostgreSQL tenant data isolation).
  - `tests/billing.test.ts`, `tests/auth.test.ts`, `tests/agents.test.ts`.

## 26. Deployment & Container Architecture

- Orchestration: Docker Compose v3.8 bridge network `harikson-network`.
- Reverse Proxy: Traefik routing domains with automatic TLS:
  - `xarwiz.com` -> `user-portal:3002`
  - `admin.xarwiz.com` -> `admin-panel:3001`
  - `api.xarwiz.com` -> `tenant-api:3008`
  - `admin-api.xarwiz.com` -> `admin-api:4000`
  - `monitor.xarwiz.com` -> `grafana:3003`

## 27. Environment Variables & Configuration

- Secret management: Environment variables passed via `.env` file and Docker Compose:
  - `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`, `TENANT_MASTER_KEY`, `INTERNAL_API_SECRET`, `PAYMENT_ENCRYPTION_KEY`.
- Missing for workflow engine: `WORKFLOW_CREDENTIAL_KEY` (AES-256 key for encrypted credential storage).

## 28. Security Risks & Vulnerability Analysis

1. **SSRF via HTTP Node**: The webhook/HTTP node currently allows sending HTTP requests to any arbitrary URL. If a tenant enters `http://169.254.169.254/latest/meta-data` or `http://postgres:5432`, the server could expose cloud metadata or internal services. *Mitigation: Implement strict IP whitelisting/blacklisting forbidding private RFC-1918 / loopback / link-local addresses.*
2. **Code Node Arbitrary Execution**: Using `new Function(...)` can block the Node.js event loop or leak global process variables. *Mitigation: Sandbox code execution using QuickJS or an isolated worker process.*
3. **Secret Leakage in Workflow JSON**: If users put API keys directly into node properties, they are visible in logs and exports. *Mitigation: Separate credential manager with AES-256-GCM encryption.*

## 29. Technical Debt & Architectural Bottlenecks

1. Monolithic `workflowQueue` executing full workflows without durable checkpointing per node. If the worker restarts during a 10-node flow, earlier completed steps might be re-executed.
2. Lack of versioning schema: modifying an active workflow immediately impacts webhooks triggered during editing.
3. Absence of schema validation on node configurations before saving.

## 30. Recommended Integration Points

1. **Database Schema**: Introduce `workflow_versions`, `workflow_node_executions`, and `workflow_credentials` tables with PostgreSQL RLS.
2. **Backend Engine**: Refactor `harikson/tenant-api/src/services/workflow/` into a modular compiler, DAG scheduler, and Node runtime library with BullMQ per-node job distribution.
3. **Frontend Editor**: Consolidate `VisualWorkflowEditor` in `user-portal` and `admin-panel` around a shared `@xyflow/react` component architecture with live SSE execution telemetry.

---

## 31. Existing Workflow Implementation Catalog

| Component | File / Location | Class / Function / Table | Current Behavior | Deficiencies / Problems | Recommended Modification |
|---|---|---|---|---|---|
| **Engine Core** | `harikson/tenant-api/src/services/workflow/engine.ts` | `WorkflowEngine.executeWorkflow` | Traverses graph queue sequentially in memory | If worker crashes, execution cannot resume; no durable node checkpointing | Refactor to durable DAG execution model with state stored per node execution |
| **Step Runner** | `harikson/tenant-api/src/services/workflow/engine.ts` | `WorkflowEngine.executeStep` | Big switch-case statement for 9 step types | Hard to extend; no isolated node contract; no standard validation schema | Implement `INodeHandler` interface with `NodeRegistry` |
| **Expression Parser** | `harikson/tenant-api/src/services/workflow/engine.ts` | `WorkflowEngine.interpolate` | Regex replacement `\{\{...\}\}` | Naive string replace; cannot evaluate complex conditions or method calls safely | Implement safe AST expression resolver |
| **Code Runner** | `harikson/tenant-api/src/services/workflow/engine.ts` | `case 'code'` | `new Function('input', 'context', codeSnippet)` | Insecure: runs in main process, no CPU/memory caps, can DOS event loop | Replace with sandboxed QuickJS runtime |
| **BullMQ Worker** | `harikson/tenant-api/src/workers/scheduler.ts` | `HariksonScheduler.workflowWorker` | Listens on `workflowQueue`, runs `executeWorkflow` | Single queue for entire workflow; concurrency 3; no pause/resume | Implement granular job distribution (`workflow-node`) |
| **Database Schema** | `harikson/tenant-api/src/migrations/042_*.sql` | `workflows`, `workflow_executions` | Single JSONB `definition` and `steps` | No versioning table; cannot rollback; draft overwrites production | Add `workflow_versions` and `workflow_node_executions` |
| **Tenant API Route** | `harikson/tenant-api/src/routes/workflow.routes.ts` | Express router (`/api/v1/workflows`) | CRUD + execute endpoint | Lacks validation endpoint, version publish endpoint, and credential manager | Add `/publish`, `/validate`, `/versions`, `/credentials` routes |
| **Admin API Route** | `admin-api/src/routers/operations.js` | Express router (`/admin/operations/workflows`) | Basic CRUD and manual trigger | No multi-tenant execution inspection or queue health control | Add queue pause/resume, DLQ retry, and cross-tenant audit controls |
| **User Canvas UI** | `user-portal/components/workflow/VisualWorkflowEditor.js` | React Component | Basic React Flow canvas with custom nodes | Missing variable autocomplete picker, undo/redo, minimap layout | Upgrade to complete production visual builder with live debugger |
| **Admin Canvas UI** | `admin-panel/app/admin/workflows/VisualWorkflowEditor.tsx` | React Component | Basic React Flow canvas | Missing real-time node execution telemetry and retry controls | Integrate live execution overlays and JSON inspector |
