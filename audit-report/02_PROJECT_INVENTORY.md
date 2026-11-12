# REPORT 2: COMPLETE PROJECT INVENTORY

**Workspace Root:** `/Users/ashishpratapsinghtomar/Downloads/files`  
**Total Source Files:** 764 files  
**Total Lines of Code:** 219,263 LOC  
**Audit Coverage:** 100% of custom application source code inspected; generated build artifacts (`.next/`, `dist/`, `node_modules/`, `postgres-data/`) inventoried and excluded from line-by-line manual audit.

---

## 1. Top-Level Directory Structure & Ownership

```
/Users/ashishpratapsinghtomar/Downloads/files
├── admin/                         # Legacy Admin Next.js app (Superceded by admin-panel)
├── admin-api/                     # Control Plane Backend API (Node.js/Express, 35 files)
│   ├── src/                       # Admin routes, routers, services, validators, db pool
│   └── tests/                     # Admin unit and integration test suites
├── admin-panel/                   # Next.js 14 App Router Admin Dashboard (66 files)
│   ├── app/                       # App Router routes (/admin/*, /api/*, layout, page)
│   ├── components/                # Admin table, modal, and stats cards
│   └── context/                   # AdminAuthContext state management
├── app/                           # Legacy app wrapper / configuration
├── backend/                       # Legacy Prisma-based backend (Pre-RLS version)
├── docs/                          # Architecture guides, email system specs, navbar plans
├── harikson/                      # Monorepo Core Services (352 files)
│   ├── tenant-api/                # Primary Multi-Tenant Backend Service
│   │   ├── src/
│   │   │   ├── api/routes/        # Specialized sub-routers (tools, memory, indexer)
│   │   │   ├── db/                # Connection pooling, RLS context, Redis query cache
│   │   │   ├── middleware/        # auth, scopeAuth, entitlements, validation
│   │   │   ├── migrations/        # 77 SQL migrations (001 to 077)
│   │   │   ├── observability/     # Metrics, OpenTelemetry tracer, structured logger
│   │   │   ├── prompts/           # LLM system prompts and developer prompts
│   │   │   ├── routes/            # 22 Domain route modules (chat, billing, voice, etc.)
│   │   │   ├── services/          # Business logic engines (workflow, PDF, RAG, etc.)
│   │   │   ├── validators/        # Zod validation schemas
│   │   │   └── workers/           # Background scheduler & cron jobs
│   │   └── tests/                 # 43 automated test suites
│   ├── shared/                    # Shared configurations across modules
│   └── ide-bridge/                # Bridge proxy connecting IDE extension to tenant-api
├── ide-extension/                 # VS Code Extension for AI autocomplete & sidebar chat (10 files)
├── k8s/                           # Kubernetes manifests for cloud deployment (8 files)
├── landing/                       # Standalone static marketing site (HTML/CSS, 28 files)
├── model-builder/                 # Ollama Modelfiles for local quantized models (2 files)
├── monitoring/                    # Prometheus scrapers, Grafana dashboards, alert rules (4 files)
├── orchestrator/                  # Docker container execution manager (7 files)
├── scripts/                       # Deployment, migration, backup, and health check scripts (23 files)
├── secrets/                       # Local secret key mounts (5 files)
├── traefik/                       # Traefik reverse proxy dynamic configuration (2 files)
├── user-portal/                   # Next.js User-Facing Application (151 files)
│   ├── components/                # UI components (chat, voice, settings, marketing)
│   ├── context/                   # AuthContext, ToastContext, ThemeContext
│   ├── hooks/                     # Custom React hooks (document titles, etc.)
│   ├── lib/                       # API configuration, security utilities, analytics
│   ├── pages/                     # Pages Router screens (chat, dashboard, pricing, etc.)
│   ├── public/                    # Static assets, sitemap.xml, robots.txt, audio worker
│   └── src/voice/                 # Voice mode FSM, VAD controller, telemetry
└── tests/                         # Root test directory placeholder
```

---

## 2. File-by-File Module Inventory & Audit Status

| Directory / File | Type | Module | Purpose | Status | Audit Status | Key Issues Identified |
|---|---|---|---|:---:|:---:|---|
| `admin-panel/app/api/auth/login/route.ts` | TS | Admin Panel | Next.js direct admin login handler | **BROKEN / VULN** | Audited | Hardcoded backdoor passwords (`Surendra@999080`, `Admin@1234`) bypass bcrypt |
| `admin-panel/app/api/admin/analytics/*/route.ts` | TS | Admin Panel | Admin revenue & user analytics API routes | **QUESTIONABLE** | Audited | Hardcoded fallback JWT secret `'neuravolt_dev_jwt_secret...'` |
| `admin-panel/middleware.ts` | TS | Admin Panel | Edge route protection for `/admin/*` | **INCOMPLETE** | Audited | Checks cookie existence only; no cryptographic signature verification |
| `admin-panel/app/admin/layout.tsx` | TSX | Admin Panel | Main administrative navigation shell & header | Working | Audited | Fetches `/v1/admin/notifications`; unread count key mismatch |
| `admin-panel/app/admin/plans/page.tsx` | TSX | Admin Panel | Plan management redirect stub | Incomplete | Audited | 6-line stub redirecting to `/admin/tenants` |
| `admin-api/src/admin.js` | JS | Admin API | Main admin control plane Express server | Working | Audited | Monolithic 7,240-line file; mixes webhooks, analytics, and business logic |
| `admin-api/src/middleware/adminAuth.js` | JS | Admin API | Admin JWT authentication & DB role guard | Working | Audited | Robust fail-closed verification, but ignored by Next.js admin routes |
| `harikson/tenant-api/src/index.ts` | TS | Tenant API | Tenant API entry point and route mounting | **BROKEN** | Audited | Missing `/webhooks` router mount; misses external billing callbacks |
| `harikson/tenant-api/src/routes/workflow.routes.ts` | TS | Tenant API | Workflow v2 CRUD, credentials, executions | **VULN** | Audited | Completely unauthenticated; any caller can manage tenant workflows & secrets |
| `harikson/tenant-api/src/routes/billing.routes.ts` | TS | Tenant API | Checkout, invoices, plans, proration | **VULN** | Audited | `POST /change-plan` unauthenticated; grants instant Enterprise plan without charging |
| `harikson/tenant-api/src/routes/agent.routes.ts` | TS | Tenant API | AI Agent management and execution | **VULN** | Audited | Relies on `requireScopes`; unauthenticated callers bypass and execute tasks |
| `harikson/tenant-api/src/routes/document.routes.ts` | TS | Tenant API | Document intelligence, upload, collections | **VULN** | Audited | Relies on `requireScopes`; unauthenticated callers bypass and access documents |
| `harikson/tenant-api/src/routes/pdf.routes.ts` | TS | Tenant API | Universal PDF generation and direct export | **VULN** | Audited | No authentication middleware applied to PDF endpoints |
| `harikson/tenant-api/src/routes/image.routes.ts` | TS | Tenant API | Multimodal image generation and viewing | **VULN** | Audited | `/:id/view` and `/:id/download` lack tenant filtering (IDOR vulnerability) |
| `harikson/tenant-api/src/routes/widget.routes.ts` | TS | Tenant API | Chat widget embed endpoints | **INCOMPLETE** | Audited | `/script.js` returns empty dummy script with a single `console.log` |
| `harikson/tenant-api/src/services/prorationService.ts` | TS | Tenant API | Mid-cycle billing calculation and execution | **BROKEN** | Audited | Marks invoices as `'paid'` and adds credit without payment gateway charge |
| `harikson/tenant-api/src/middleware/scopeAuth.ts` | TS | Tenant API | API key scope authorization | **BROKEN** | Audited | `if (!user) return next()` lets unauthenticated requests bypass authorization |
| `harikson/tenant-api/src/db/pool.ts` | TS | Tenant API | PG connection pool, RLS enforcement, Redis | Working | Audited | Excellent `executeTenantQuery` RLS wrapper, but bypassed by 18 unconfigured tables |
| `user-portal/pages/chat.js` | JS | User Portal | Primary chat application interface | Working | Audited | Monolithic 4,314-line file; lacks component decomposition |
| `user-portal/pages/workflows.js` | JS | User Portal | Visual workflow automation builder | Working | Audited | Emits unauthenticated `fetch` requests with only `x-tenant-slug` header |
| `user-portal/components/SettingsModal.js` | JS | User Portal | Central modal for user workspace settings | Incomplete | Audited | Imports Appearance, Language, and Help settings but omits them from navigation |
| `user-portal/components/settings/privacy.js` | JS | User Portal | DPDP privacy and consent controls | Incomplete | Audited | Links to `/grievance` which does not exist (404 error) |
| `user-portal/components/settings/activity.js` | JS | User Portal | Activity logs and audit trail viewer | Incomplete | Audited | Links to `/settings/billing` which does not exist (404 error) |
| `monitoring/prometheus.yml` | YML | Monitoring | Prometheus metrics collection config | **BROKEN** | Audited | Targets `admin-api:3009` (real port 4000) and nonexistent `nv-cadvisor` |
| `docker-compose.yml` | YML | DevOps | Production container layout | Working | Audited | Well-isolated host port bindings, but lacks landing container mount |

---

## 3. Inventory Exclusions and Build Artifacts

The following directories and artifacts were inventoried and excluded from manual line-by-line auditing:
- `node_modules/` (Root, user-portal, admin-panel, tenant-api, admin-api): Third-party vendor dependencies managed via npm.
- `.next/` (`admin-panel`, `user-portal`, `admin`, `app`): Next.js compiled server and client bundles.
- `dist/` (`backend`, `harikson/tenant-api`, `orchestrator`): TypeScript compilation build outputs.
- `postgres-data/` & `redis-data/`: Local database persistent storage volumes.
- `coverage/`: Test coverage reports and lcov traces.
