# REPORT 4: COMPLETE BACKEND AUDIT

**Target Backend Services:**  
1. `harikson/tenant-api` (Express + TypeScript, 352 files)  
2. `admin-api` (Express + JavaScript, 35 files)  
3. `orchestrator` (Express + TypeScript + Dockerode, 7 files)  

---

## 1. Application & Service Architecture

The backend architecture is structured around a multi-tier modular pattern:
- **Tenant Context Isolation:** Handled at request entry in `harikson/tenant-api/src/index.ts` via tenant subdomain parsing or `x-tenant-slug` headers. Query isolation is executed via `executeTenantQuery()` in `src/db/pool.ts` which injects `SET app.current_tenant = $1` into PostgreSQL connections before releasing them to the client.
- **Microservices Separation:**
  - `tenant-api` handles consumer-facing operations (chat, document search, voice sessions, user workflows).
  - `admin-api` functions as the out-of-band control plane (tenant provisioning, database migrations, financial reconciliation, SMTP queuing).
  - `orchestrator` acts as a privileged daemon managing Docker container lifecycle for agent task execution.

---

## 2. Architectural Weaknesses & Code Smells

### A. Monolithic Controller Files
- **`admin-api/src/admin.js` (7,240 Lines):**
  Contains direct database connection pools, admin login endpoints, impersonation tokens, Stripe/Razorpay/PhonePe/Cashfree/NeuraCollect webhook handlers, email template renderers, system health diagnostics, plan pricing logic, and backup verification routines all in a single source file.
  - *Risk:* Extremely high regression risk during updates. Difficult to test in isolation without spinning up entire infrastructure.
- **Routing Duplication in `tenant-api`:**
  The service contains duplicate route files:
  - `harikson/tenant-api/src/routes/chat.routes.ts` (modern, active) vs `harikson/tenant-api/src/routes/chat.ts` (legacy, mounted at `/api/routes/chat`).
  - `harikson/tenant-api/src/routes/document.routes.ts` (modern, active) vs `harikson/tenant-api/src/routes/documents.ts` (legacy, mounted at `/api/routes/documents`).
  - `harikson/tenant-api/src/routes/widget.routes.ts` (modern stub) vs `harikson/tenant-api/src/routes/widget.ts` (legacy full widget).
  - *Vulnerability:* The legacy routers (`chat.ts`, `documents.ts`) trust arbitrary `x-user-id` and `x-tenant-id` HTTP headers directly without verifying JWT signatures!

---

## 3. Business Logic & Critical Functional Defects

### A. Broken Authorization in Workflow Engine (`workflow.routes.ts`)
- **Location:** `harikson/tenant-api/src/routes/workflow.routes.ts`, Lines 21-750
- **Analysis:**
  Unlike `chat.routes.ts` and `voice.routes.ts` which enforce `requireAuth` or JWT decoding at the router level, `workflow.routes.ts` has **no authentication middleware**.
  ```typescript
  // harikson/tenant-api/src/routes/workflow.routes.ts:36
  router.get('/credentials', async (req: any, res) => {
    const tenantId = req.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });
    const credentials = await CredentialService.listCredentials(tenantId);
    res.json({ success: true, credentials });
  });
  ```
- **Exploitation:** Because `req.tenant` is populated automatically from `x-tenant-slug` (or defaults to the primary tenant if no header is supplied), **any unauthenticated internet user can list, create, edit, or delete workflows and access encrypted workflow credentials.**

### B. Unauthenticated Plan Upgrade & Invoice Forgery
- **Location:** `harikson/tenant-api/src/routes/billing.routes.ts`, Lines 608-624; `services/prorationService.ts`, Lines 94-219
- **Analysis:**
  `POST /api/billing/change-plan` does not verify `req.user`. When invoked with `{ newPlanId: "enterprise" }`, it executes `executePlanChange()` which:
  1. Inserts an invoice into the database with `status = 'paid'` immediately.
  2. Updates `tenants.plan = 'ENTERPRISE'` in the PostgreSQL database.
  3. If downgrading, it adds arbitrary credit to `tenants.metadata->>'account_credit'`.
  4. **It never communicates with any payment gateway to collect funds.**
- **Impact:** Immediate loss of revenue; any user can give their workspace an Enterprise subscription and fake paid invoice receipts for free.

### C. ScopeAuth Middleware Fall-through Vulnerability
- **Location:** `harikson/tenant-api/src/middleware/scopeAuth.ts`, Line 21
- **Code:**
  ```typescript
  export function requireScopes(...requiredScopes: Scope[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = req.user;
      if (!user || !user.isDeveloperKey) {
        return next(); // <-- CRITICAL DEFECT: Bypasses check if user is undefined!
      }
      ...
    };
  }
  ```
- **Analysis:** `requireScopes` was written under the assumption that `requireAuth` had already executed and placed `req.user` on the request. But in `agent.routes.ts`, `document.routes.ts`, and `pdf.routes.ts`, `requireScopes` was used as the **only** auth middleware. As a result, when an unauthenticated caller sends a request with no token, `!user` is true, and the middleware calls `next()` unconditionally, granting unauthenticated access to confidential documents, AI agents, and task execution!

---

## 4. Backend Performance & Concurrency

- **Database Connection Pooling:** Default max pool size is set to 20 connections in `src/db/pool.ts`. Under sustained concurrent LLM inference or vector search loads, connection contention can occur if slow queries hold connections.
- **Inference Queue Optimization:** `harikson/tenant-api/src/services/inferenceQueue.ts` implements an in-memory priority queue (`globalInferenceQueue`) to serialize LLM requests to Ollama. This prevents CPU core starvation and out-of-memory crashes on single 16GB RAM virtual machines.
- **Redis Query Caching:** `executeCachedQuery` implements caching for plans (300s TTL), tenant configs (60s TTL), and user profiles (120s TTL) with an automated Redis key invalidation system on updates (`invalidateTenantCache`, `invalidateUserCache`). Telemetry logs cache hit/miss ratios every 60 seconds.
