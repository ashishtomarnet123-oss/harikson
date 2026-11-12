# REPORT 1: EXECUTIVE SUMMARY — XARWIZ.COM (JARVIS.COM)

**Audit Target:** Xarwiz Multi-Tenant AI Platform (`xarwiz.com`, `admin.xarwiz.com`, `api.xarwiz.com`)  
**Audit Type:** Enterprise Pre-Investment & Production-Readiness Codebase Audit  
**Scope:** Complete A-to-Z Full-Stack Source Inspection (Read-Only)  
**Total Source Files Audited:** 764 files  
**Total Lines of Code Inspected:** 219,263 LOC  
**Classification:** Confidential Enterprise Audit Report  

---

## 1. Overall Project Assessment

Xarwiz (formerly Harikson / NeuraVolt) is an ambitious, architecturally rich multi-tenant AI developer platform designed to run on resource-constrained Virtual Machines (e.g., 16GB RAM single-VM deployments) with scalable cloud aspirations. The platform incorporates local LLM inference (Ollama / Qwen / Llama), vector search via PostgreSQL with `pgvector`, multi-tenancy enforced by Row-Level Security (RLS), workflow graph orchestration, universal PDF generation, voice telemetry with Web Speech/VAD, multi-gateway billing (Stripe, Razorpay, PhonePe, Cashfree, NeuraCollect), and DPDP Act 2023 compliance modules.

However, the codebase displays severe symptoms of **rapid, fragmented iterations across multiple brand names and AI generations**, leaving critical security vulnerabilities, broken authentication boundaries, billing bypasses, and architectural disconnects between the admin panel, user portal, and backend services.

While core modules (such as the Universal PDF Engine, Token Counting, and DPDP grievance ledger) are engineered with high craftsmanship, **critical security and financial bypasses currently render the platform unsafe for enterprise launch or financial transactions without remediation.**

---

## 2. Key Architecture Summary

The platform operates across four primary planes:
1. **Tenant API (`harikson/tenant-api`, Port 3008):** Express + TypeScript microservice handling user authentication, chat inference, vector search, document intelligence, voice telemetry, workflow engine v2, and image generation.
2. **Admin API (`admin-api`, Port 4000):** Express + JavaScript control plane handling tenant provisioning, administrator authentication, billing reconciliation, SMTP/email queuing, and legal holds.
3. **Admin Panel (`admin-panel`, Port 3001):** Next.js 14 App Router dashboard interface for platform operators.
4. **User Portal (`user-portal`, Port 3002):** Next.js Pages Router application for workspace users, containing the chat interface, documents drive, workflows canvas, and settings.
5. **Shared Infrastructure:** Traefik v2.11 (reverse proxy), PostgreSQL 15 + pgvector, Redis 7 (cache & rate limiter), Ollama (LLM engine), and Prometheus/Grafana (observability).

---

## 3. Critical Blockers & Major Findings (P0 Summary)

| Finding ID | Severity | Category | Title | Location | Business & Security Impact |
|---|:---:|:---:|---|---|---|
| **SEC-001** | **P0** | SECURITY | Hardcoded Backdoor Credentials in Admin Login | `admin-panel/app/api/auth/login/route.ts:82-86` | Complete administrative account takeover. Any admin account can be accessed using static passwords (`Surendra@999080`, `Admin@1234`, `Admin@neurovalt@2620`) bypassing bcrypt. |
| **SEC-002** | **P0** | SECURITY | Hardcoded Default JWT Secret in Production Routes | `admin-panel/app/api/admin/analytics/*/route.ts:11` | Forgery of administrative session tokens if environment variables default to fallback strings. |
| **SEC-003** | **P0** | SECURITY | Complete Unauthenticated Access to Workflows & Secrets | `harikson/tenant-api/src/routes/workflow.routes.ts:21-750` | Anonymous callers can list, create, update, delete, trigger workflows, and access encrypted credential metadata without any JWT token. |
| **FIN-001** | **P0** | FINANCIAL | Unauthenticated Instant Upgrade to Enterprise & Fake Invoices | `harikson/tenant-api/src/routes/billing.routes.ts:608-624` | `POST /api/billing/change-plan` is unauthenticated and immediately marks invoices as `'paid'` and assigns Enterprise plan without payment. |
| **API-001** | **P0** | ARCHITECTURE | External Payment Webhooks Return HTTP 404 | `user-portal/next.config.js:63` vs `tenant-api/src/index.ts` | Incoming Stripe, Razorpay, PhonePe webhooks sent to `xarwiz.com/webhooks/*` proxy to unmounted routes, causing 404 errors and broken subscription activations. |
| **SEC-004** | **P0** | SECURITY | ScopeAuth Middleware Authentication Bypass | `harikson/tenant-api/src/middleware/scopeAuth.ts:21` | `if (!user || !user.isDeveloperKey) return next()` allows unauthenticated callers to bypass checks on documents, agents, and PDF endpoints. |

---

## 4. Production Readiness Assessment

- **Overall Production Readiness Rating:** **NOT PRODUCTION READY (3.8 / 10)**
- **Immediate Deployment Recommendation:** **BLOCK PRODUCTION DEPLOYMENT** until Phase 1 and Phase 2 remediation items are applied and verified.
- **Enterprise Pre-Investment Verdict:** The intellectual property and feature foundation are strong (especially the voice telemetry, document intelligence, and DPDP compliance architecture), but the platform requires **approximately 18-24 developer-days of technical hardening** to close security backdoors, enforce multi-tenant isolation across all 78 tables, and fix the billing webhook pipelines.

---

## 5. Most Urgent Recommendations (Next 72 Hours)

1. **Remove Admin Backdoor Immediately:** Delete lines 82-86 in `admin-panel/app/api/auth/login/route.ts` and require database bcrypt comparison exclusively.
2. **Mount `requireAuth` on Workflow & Document Routes:** Insert strict JWT verification on `workflow.routes.ts`, `agent.routes.ts`, `document.routes.ts`, and `pdf.routes.ts`.
3. **Fix `scopeAuth.ts` Fall-through:** Ensure unauthenticated requests without `req.user` return HTTP 401 Unauthorized immediately.
4. **Secure `POST /api/billing/change-plan`:** Require user authentication and initiate actual gateway checkout sessions instead of marking invoices as paid for free.
5. **Mount `/webhooks` in Tenant API:** Add `app.use('/webhooks', billingRoutes)` in `harikson/tenant-api/src/index.ts` so payment gateway callbacks resolve.
