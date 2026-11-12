# REPORT 14: COMPLETE BUG REGISTER

Every identified defect is cataloged below with its unique finding ID, severity rating, affected file path, evidence, root cause, and concrete technical remediation.

---

## 1. Summary by Severity

| Severity Level | Definition | Total Findings |
|---|---|:---:|
| **P0 – Critical** | Direct data exposure, backdoor access, free plan exploitation, webhook failures | **7** |
| **P1 – High** | RLS gaps on 18 tables, IDOR vulnerabilities, broken Prometheus scrapers, unverified middleware | **8** |
| **P2 – Medium** | Missing UI routes (404), unauthenticated telemetry endpoints, omitted settings modal tabs | **11** |
| **P3 – Low** | Inconsistent branding copy, dead code imports, font rendering edge cases | **9** |
| **P4 – Informational**| Architectural monolithic files, missing HNSW vector index optimization | **6** |
| **Total** | | **41** |

---

## 2. P0 (Critical) Findings Register

### BUG-P0-01 / SEC-001: Hardcoded Backdoor Credentials in Admin Panel Login
- **Category:** SECURITY
- **Severity:** P0
- **Location:** `admin-panel/app/api/auth/login/route.ts`, Lines 82-86
- **Evidence:**
  ```typescript
  const isDevAdminPass =
    (user.role === 'superadmin' || user.role === 'admin') &&
    (password === 'Surendra@999080' || password === 'Admin@1234' || password === 'Admin@neurovalt@2620');
  if (!matches && !isDevAdminPass) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  ```
- **Root Cause:** Hardcoded bypass left in development route to assist manual testing.
- **Business Impact:** Any attacker knowing an admin's email can seize superadmin control.
- **Remediation:** Remove `isDevAdminPass` check completely. Enforce bcrypt comparison exclusively.

### BUG-P0-02 / FIN-001: Unauthenticated Free Upgrade to Enterprise Plan & Fake Paid Invoices
- **Category:** FINANCIAL / SECURITY
- **Severity:** P0
- **Location:** `harikson/tenant-api/src/routes/billing.routes.ts`, Lines 608-624; `services/prorationService.ts`, Lines 94-219
- **Evidence:** `POST /api/billing/change-plan` has no `req.user` check. `executePlanChange` immediately sets `tenants.plan = 'ENTERPRISE'` and inserts an invoice marked `'paid'` without contacting any payment gateway.
- **Root Cause:** Proration service was implemented as a mock without verifying successful gateway charges before mutating database records.
- **Business Impact:** Instantaneous revenue leakage; users can obtain Enterprise access for free.
- **Remediation:** Protect endpoint with `requireAuth`. Generate a pending checkout session order instead of immediately mutating the tenant's plan.

### BUG-P0-03 / SEC-003: Unauthenticated Access to Workflow Engine & Credentials
- **Category:** SECURITY
- **Severity:** P0
- **Location:** `harikson/tenant-api/src/routes/workflow.routes.ts`, Lines 21-750
- **Evidence:** Entire router has no `requireAuth` or JWT middleware. Endpoints only check `req.tenant?.id`, which auto-resolves to the default tenant or takes arbitrary `x-tenant-slug` headers.
- **Root Cause:** Developer omitted router-level authentication when migrating to Workflow Engine v2.
- **Business Impact:** Anonymous users can inspect third-party API credentials, create, update, trigger, and delete workflows.
- **Remediation:** Add `router.use(requireAuth)` at the top of `workflow.routes.ts`.

### BUG-P0-04 / API-001: Incoming Payment Webhooks Return HTTP 404 Not Found
- **Category:** ARCHITECTURE / ROUTING
- **Severity:** P0
- **Location:** `user-portal/next.config.js`, Line 63 vs `harikson/tenant-api/src/index.ts`
- **Evidence:** Reverse proxy sends `/webhooks/:path*` to `tenant-api:3008/webhooks/:path*`. `billingRoutes` is only mounted at `/api/billing` and `/api/v1/billing`. There is no `app.use('/webhooks', billingRoutes)` mount in `tenant-api/src/index.ts`.
- **Root Cause:** Route mounting mismatch between Next.js rewrites and Express app router.
- **Business Impact:** External payment callbacks from Stripe, Razorpay, PhonePe, and Cashfree return 404, preventing automatic subscription activations.
- **Remediation:** Add `app.use('/webhooks', billingRoutes)` in `tenant-api/src/index.ts`.

### BUG-P0-05 / SEC-004: ScopeAuth Middleware Authentication Bypass
- **Category:** SECURITY
- **Severity:** P0
- **Location:** `harikson/tenant-api/src/middleware/scopeAuth.ts`, Line 21
- **Evidence:** `if (!user || !user.isDeveloperKey) return next();`
- **Root Cause:** Assumed `requireAuth` had already executed. When used as sole middleware on `document.routes.ts`, `agent.routes.ts`, and `pdf.routes.ts`, unauthenticated requests call `next()` unconditionally.
- **Business Impact:** Unauthenticated users can access, search, and delete confidential tenant documents and execute agent tasks.
- **Remediation:** If `!user`, return HTTP 401 Unauthorized immediately.

### BUG-P0-06 / SEC-002: Hardcoded Fallback JWT Secrets in Production Analytics
- **Category:** SECURITY
- **Severity:** P0
- **Location:** `admin-panel/app/api/admin/analytics/*/route.ts`, Line 11
- **Evidence:** Falls back to `'neuravolt_dev_jwt_secret_key_extremely_long_and_secure_value_12345!'`.
- **Remediation:** Refuse startup / request execution if `JWT_SECRET` is unset; fail loudly.

### BUG-P0-07 / FIN-002: Arbitrary Account Credit Generation on Plan Downgrade
- **Category:** FINANCIAL
- **Severity:** P0
- **Location:** `harikson/tenant-api/src/services/prorationService.ts`, Lines 169-178
- **Evidence:** `executePlanChange` automatically adds absolute negative amount to `tenants.metadata->'account_credit'` without verifying prior payments.
- **Remediation:** Ensure account credits can only be applied against verified paid invoices.

---

## 3. P1 (High) Findings Register

- **BUG-P1-01:** 18 Database Tables Missing Row-Level Security (`harikson/tenant-api/src/migrations/`). Newer tables from migrations 024-075 lack `ENABLE ROW LEVEL SECURITY`.
- **BUG-P1-02:** IDOR on Generated Images (`harikson/tenant-api/src/routes/image.routes.ts:44, 80`). Any user can download images of any other tenant by ID.
- **BUG-P1-03:** Edge Middleware Signature Check Omission (`admin-panel/middleware.ts:6-18`). Checks cookie presence only; any cookie value passes.
- **BUG-P1-04:** Prometheus Port Misconfiguration (`monitoring/prometheus.yml:24`). Scrapes `admin-api:3009`, but container runs on port 4000.
- **BUG-P1-05:** Dead cAdvisor Target in Prometheus (`monitoring/prometheus.yml:14`). Scrapes `nv-cadvisor:8080`, which does not exist in `docker-compose.yml`.
- **BUG-P1-06:** Legacy Routers Trusting Unvalidated HTTP Headers (`src/routes/chat.ts`, `src/routes/documents.ts`). Reads `x-user-id` and `x-tenant-id` directly.
- **BUG-P1-07:** Missing Cashfree & NeuraCollect Webhook Handlers in Tenant API (`src/routes/billing.routes.ts`). Webhooks only exist in `admin-api`.
- **BUG-P1-08:** Unauthenticated Document Key Rotation Trigger (`harikson/tenant-api/src/routes/admin.routes.ts:40`). `POST /api/admin/rotate-keys` has no auth guard.

---

## 4. P2 (Medium) Findings Register

- **BUG-P2-01:** Broken Link to `/grievance` (`user-portal/components/settings/privacy.js:387`). Page does not exist; renders 404.
- **BUG-P2-02:** Broken Link to `/settings/billing` (`user-portal/components/settings/activity.js:205`). Standalone route does not exist; renders 404.
- **BUG-P2-03:** Settings Modal Omission (`user-portal/components/SettingsModal.js`). Appearance, Language, and Help settings are imported but omitted from navigation.
- **BUG-P2-04:** Dummy Widget Script Placeholder (`harikson/tenant-api/src/routes/widget.routes.ts:41`). `GET /api/widget/script.js` returns only `console.log`.
- **BUG-P2-05:** Broken Jest Dependencies (`harikson/tenant-api/tests/*`). 6 test files fail to run due to missing `@jest/globals` package.
- **BUG-P2-06:** Unhandled JSON Syntax Error in Workflow Step Config (`user-portal/pages/workflows.js`). Entering malformed JSON crashes the editor UI.
- **BUG-P2-07:** Admin Notification Key Mismatch (`operations.js:833` vs `layout.tsx:130`). Backend sends `unread_count`, frontend expects `unreadCount`.
- **BUG-P2-08:** Missing Tenant API Target in Prometheus (`monitoring/prometheus.yml`). Tenant API performance metrics are not scraped.
- **BUG-P2-09:** Hardcoded Admin Backdoor in E2E Tests (`user-portal/tests/e2e/auth-and-chat.spec.js:12`). Uses `Admin@neurovalt@2620`.
- **BUG-P2-10:** Static Password Update in Migration 068 (`068_update_admin_password.sql`). Resets all admins to static password hash.
- **BUG-P2-11:** Unauthenticated Notification CRUD (`harikson/tenant-api/src/routes/notification.routes.ts`). Lacks JWT user check.
