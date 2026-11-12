# REPORT 17: IMPLEMENTATION ROADMAP

This actionable engineering roadmap is organized by phase and dependency. **No code changes have been made during this read-only audit.**

---

## Phase 1: Critical Security Blockers (Day 1 - 2)

| Task ID | Task Description | Related Finding | Module | Priority | Effort | Acceptance Criteria |
|---|---|---|---|:---:|:---:|---|
| **TASK-01** | Remove hardcoded admin login passwords (`Surendra@999080`, `Admin@1234`) | `BUG-P0-01` | Admin Panel | **P0** | 2h | `admin-panel/app/api/auth/login/route.ts` only validates passwords via bcrypt; backdoor strings return 401. |
| **TASK-02** | Remove hardcoded fallback JWT secrets in Next.js analytics routes | `BUG-P0-06` | Admin Panel | **P0** | 2h | Handlers throw 500 error if `JWT_SECRET` is unset; no static string fallback. |
| **TASK-03** | Fix `scopeAuth.ts` middleware fall-through | `BUG-P0-05` | Tenant API | **P0** | 3h | Requests with no token return HTTP 401 instead of calling `next()`. |
| **TASK-04** | Enforce `requireAuth` on Workflow Engine v2 and credential routes | `BUG-P0-03` | Tenant API | **P0** | 3h | `GET /api/v1/workflows` and `/credentials` return 401 without valid Bearer token. |
| **TASK-05** | Fix unauthenticated plan change exploit (`POST /api/billing/change-plan`) | `BUG-P0-02` | Tenant API | **P0** | 4h | Endpoint requires auth; creates pending checkout order instead of marking invoice paid for free. |

---

## Phase 2: Core Routing & Webhook Integrity (Day 3 - 5)

| Task ID | Task Description | Related Finding | Module | Priority | Effort | Acceptance Criteria |
|---|---|---|---|:---:|:---:|---|
| **TASK-06** | Mount `/webhooks` router in `tenant-api/src/index.ts` | `BUG-P0-04` | Tenant API | **P0** | 2h | Callbacks to `https://xarwiz.com/webhooks/stripe` resolve to webhook handler instead of 404. |
| **TASK-07** | Add Cashfree and NeuraCollect webhook receivers to `billing.routes.ts` | `BUG-P1-07` | Tenant API | **P1** | 4h | Cashfree & NeuraCollect webhooks verify signatures and record paid status in `invoices`. |
| **TASK-08** | Enforce tenant isolation on image viewing and downloads | `BUG-P1-02` | Tenant API | **P1** | 2h | `GET /:id/view` requires tenant ownership or valid signed token. |
| **TASK-09** | Add cryptographic JWT verification to Next.js `admin-panel/middleware.ts` | `BUG-P1-03` | Admin Panel | **P1** | 3h | Tampered or dummy cookies redirect to `/admin/login`. |

---

## Phase 3: Database & Multi-Tenancy Hardening (Day 6 - 8)

| Task ID | Task Description | Related Finding | Module | Priority | Effort | Acceptance Criteria |
|---|---|---|---|:---:|:---:|---|
| **TASK-10** | Apply Migration 078: Enable & Force RLS on 18 unconfigured tables | `BUG-P1-01` | Database | **P1** | 6h | All 18 tables have `FORCE ROW LEVEL SECURITY` and `tenant_isolation_policy`. |
| **TASK-11** | Require internal secret or adminAuth on `POST /api/admin/rotate-keys` | `BUG-P1-08` | Tenant API | **P1** | 2h | Key rotation returns 401/403 without authorization. |
| **TASK-12** | Deprecate and remove legacy unauthenticated routers (`chat.ts`, `documents.ts`)| `BUG-P1-06` | Tenant API | **P1** | 4h | Remove unmounted routes that trust `x-user-id` header. |

---

## Phase 4: UI/UX & Frontend Remediation (Day 9 - 12)

| Task ID | Task Description | Related Finding | Module | Priority | Effort | Acceptance Criteria |
|---|---|---|---|:---:|:---:|---|
| **TASK-13** | Implement missing `/grievance` page for DPDP compliance | `BUG-P2-01` | User Portal | **P2** | 6h | Navigating to `/grievance` renders functional grievance submission form. |
| **TASK-14** | Connect Appearance, Language, and Help tabs in `SettingsModal.js` | `BUG-P2-03` | User Portal | **P2** | 3h | Settings sidebar includes all 14 settings categories. |
| **TASK-15** | Fix broken `/settings/billing` link in `activity.js` | `BUG-P2-02` | User Portal | **P2** | 1h | Link triggers `settings:navigate` custom event opening Billing modal tab. |
| **TASK-16** | Serve compiled interactive widget bundle at `/api/widget/script.js` | `BUG-P2-04` | Tenant API | **P2** | 6h | Embed script injects functioning chat drawer. |

---

## Phase 5: Monitoring & DevOps Realignment (Day 13 - 15)

| Task ID | Task Description | Related Finding | Module | Priority | Effort | Acceptance Criteria |
|---|---|---|---|:---:|:---:|---|
| **TASK-17** | Correct Prometheus scrape targets in `monitoring/prometheus.yml` | `BUG-P1-04` | Monitoring | **P1** | 2h | `admin-api` scraped on port 4000; `tenant-api` added on port 3008; dead cadvisor removed. |
| **TASK-18** | Fix missing test runner dependencies (`@jest/globals`) | `BUG-P2-05` | QA / Tests | **P2** | 3h | All 43 tenant API tests execute cleanly without `MODULE_NOT_FOUND` errors. |
