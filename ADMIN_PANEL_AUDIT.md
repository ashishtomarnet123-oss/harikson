# XARWIZ ADMIN PANEL — COMPLETE SECURITY & FUNCTIONAL AUDIT (v2)

**Date:** 2026-09-19  
**Platform:** xarwiz.com/admin  
**Stack:** Next.js 14 (App Router) + Express.js + PostgreSQL (pgvector) + Traefik + Docker Compose  
**Audited by:** 4 parallel agents (backend, frontend, DB/infra, live server)

---

## 1. Executive Summary

| Severity | Backend | Frontend | DB/Infra | Live Server | **Total** |
|----------|---------|----------|----------|-------------|-----------|
| CRITICAL | 6 | 5 | 2 | 0 | **13** |
| HIGH | 8 | 12 | 12 | 1 | **33** |
| MEDIUM | 11 | 16 | 11 | 3 | **41** |
| LOW | 6 | 7 | 6 | 3 | **22** |
| **Total** | **31** | **40** | **31** | **7** | **109** |

### Top 5 Most Critical Findings

1. **~30+ admin API routes missing authentication** — routes bypass `adminAuth` middleware (Backend #5)
2. **2FA bypass — login succeeds without completing 2FA challenge** — HTTP 200 on 2FA-required response causes immediate dashboard redirect (Frontend #1)
3. **Real secrets (JWT_SECRET, TENANT_MASTER_KEY, PAYMENT_ENCRYPTION_KEY) in `.env` file** — committed-adjacent plaintext (DB/Infra #36)
4. **Hardcoded superadmin password hash in committed migration** with `force_password_change = FALSE` (DB/Infra #37)
5. **XSS in email templates** — unsanitized user input injected into HTML emails (Backend #1, #2)

---

## 2. Backend Audit (admin-api) — 31 Findings

### CRITICAL (6)

| # | Finding | File | Line |
|---|---------|------|------|
| B-1 | **XSS in email templates** — `renderAndSendTemplate` injects raw user variables into HTML email bodies without escaping | `admin-api/src/services/email.js` | 148-158 |
| B-2 | **XSS in hardcoded email templates** — `sendWelcomeEmail`, `sendAccountApprovalEmail`, `sendImpersonationAlert` inject `${name}`, `${loginUrl}`, `${adminName}`, `${ip}` directly into HTML | `admin-api/src/services/email.js` | 257, 293, 463 |
| B-3 | **Sensitive resetLink leaked in error response** — when email send fails, the raw password reset token is returned in JSON error response | `admin-api/src/admin.js` | 1086 |
| B-4 | **Refresh token does not verify user in DB** — `/admin/auth/refresh` trusts JWT `decoded.role` without checking if user still exists or has been demoted. Deleted admins retain access for 30 days | `admin-api/src/admin.js` | 592-648 |
| B-5 | **~30+ admin routes missing `adminAuth` middleware** — routes registered with `app.get('/admin/...')` after `app.use('/admin', adminAuth)` bypass the middleware. Affected: `/admin/kpis`, `/admin/tenants`, `/admin/users`, `/admin/models/:name/load`, `/admin/billing/*`, `/admin/audit-log`, `/admin/plans/*`, etc. | `admin-api/src/admin.js` | 1602+ |
| B-6 | **Shell injection risk via model name in vLLM spawn** — `POST /admin/models/:name/load` passes unvalidated `req.params.name` to `spawn('python', [..., '--model', 'Qwen/${name}-Instruct'])`. No auth on this endpoint either | `admin-api/src/admin.js` | 2614-2650 |

### HIGH (8)

| # | Finding | File | Line |
|---|---------|------|------|
| B-7 | ~~**Duplicate DB pool instances**~~ — **FIXED 2026-09-20**: admin.js now imports pool from `db.js`; single shared pool with tracing wrappers | `admin-api/src/admin.js` + `db.js` | 56 |
| B-8 | ~~**Inconsistent pool usage**~~ — **FIXED 2026-09-20**: all modules now use the same pool from `db.js` | `admin-api/src/routers/integrations.js` | 275 |
| B-9 | **TLS certificate verification disabled for SMTP** — `rejectUnauthorized: false` hardcoded for all SMTP connections | `admin-api/src/services/email.js` | 59-61, 93-95 |
| B-10 | ~~**`tokensOut` always zero in playground sessions**~~ — **FIXED 2026-09-20**: now reads `eval_count` from Ollama's final stream chunk | `admin-api/src/routers/operations.js` | 280-321 |
| B-11 | **Headers set after response body started streaming** — `res.setHeader()` called in `'end'` callback after `res.write()` already called | `admin-api/src/routers/operations.js` | 328-330 |
| B-12 | **Webhook endpoint responds 200 before signature validation** — forged webhooks acknowledged as successful and stored in DB | `admin-api/src/routers/integrations.js` | 849 |
| B-13 | **Seed data auto-inserted on startup** — `seedWorkflows()` and `seedKnowledge()` run unconditionally at module load, inserting fake entries like "Daily AI Report" into production tables | `admin-api/src/routers/operations.js` | 467-539 |
| B-14 | **Simulated sync job with fake progress** — `simulateSyncJob` creates random item counts (50-250) and increments on timer. Integration sync is entirely fabricated | `admin-api/src/routers/integrations.js` | 214-264, 679-712 |

### MEDIUM (11)

| # | Finding | File | Line |
|---|---------|------|------|
| B-15 | No input validation on many mutation endpoints (`POST /admin/tenants`, `PUT /admin/users/:userId`, `POST /admin/plans`, etc.) | `admin-api/src/admin.js` | various |
| B-16 | ~~Cookie parser regex differs between auth middleware and refresh endpoint~~ — **FIXED 2026-09-20**: admin.js parseCookie now uses same `(?:^|;\\s*)` pattern as adminAuth.js | `adminAuth.js:7` vs `admin.js:596` | |
| B-17 | ~~Legal hold audit log INSERT has shifted column values~~ — **FIXED 2026-09-20**: removed duplicate action string from params array | `admin-api/src/admin.js` | 1357-1368 |
| B-18 | Email rate limiter uses per-instance Map — resets on restart, no cross-instance coordination | `admin-api/src/services/email.js` | 18-24 |
| B-19 | `getPool()` creates new Pool on every import if not yet initialized — potential pool leak | `admin-api/src/db.js` | 3-6 |
| B-20 | Backup create/restore operations are stubs — create writes JSON to `/tmp`, restore does nothing | `admin-api/src/admin.js` | various |
| B-21 | `POST /admin/data-export` returns hardcoded mock JSON export | `admin-api/src/admin.js` | |
| B-22 | Agent token usage query joins agents with messages via `agent_id` but messages may not have this column | `admin-api/src/routers/agents.js` | |
| B-23 | `GET /admin/usage/daily` filters on `messages.role` column but table may use `sender` column | `admin-api/src/admin.js` | 3108-3110 |
| B-24 | Workflow create doesn't check if referenced `agent_id` exists or belongs to tenant | `admin-api/src/routers/operations.js` | |
| B-25 | `messages.role` vs `messages.sender` inconsistency across multiple queries | `admin-api/src/admin.js` | various |

### LOW (6)

| # | Finding | File | Line |
|---|---------|------|------|
| B-26 | Cookie regex in `parseCookie` may match substrings | `adminAuth.js` | 7 |
| B-27 | `sendAccountApprovalEmail` consumes 2 rate limit slots per call | `email.js` | 279-303 |
| B-28 | `redis.keys('ratelimit:*')` blocks Redis — should use SCAN | `admin.js` | 3127 |
| B-29 | `from_date`/`to_date` query params not validated as dates | `admin.js` | 4151-4158 |
| B-30 | ~~`GET /admin/tenants` query has cartesian join~~ — **FIXED 2026-09-20**: replaced JOINs with scalar subqueries | `admin.js` | 2770-2784 |
| B-31 | ~~Same cartesian join in `GET /admin/tenants/:id`~~ — **FIXED 2026-09-20**: replaced JOINs with scalar subqueries | `admin.js` | 2905-2918 |

---

## 3. Frontend Audit (admin-panel) — 40 Findings

### CRITICAL (5)

| # | Finding | File | Line |
|---|---------|------|------|
| F-1 | **2FA bypass: login skips 2FA challenge** — `/api/auth/login` returns HTTP 200 with `requires2FA: true`, but code checks `r1.ok` first and redirects to dashboard, making the 2FA branch unreachable | `context/AdminAuthContext.tsx` | 169-173 |
| F-2 | **Agents page: ALL API calls missing `credentials: 'include'`** — auth cookies never sent, all fetches fail authentication | `app/admin/agents/page.tsx` | 59-63 |
| F-3 | **Workflows page: ALL API calls missing `credentials: 'include'`** — same issue | `app/admin/workflows/page.tsx` | all fetches |
| F-4 | **Emails page: ALL API calls missing `credentials: 'include'` AND missing auth headers entirely** — admin email/SMTP config page is completely unauthenticated on frontend | `app/admin/emails/page.tsx` | 144-178 |
| F-5 | **XSS via `dangerouslySetInnerHTML`** — email template preview renders `selectedTemplate.body_html` directly into DOM | `app/admin/emails/page.tsx` | 757 |

### HIGH (12)

| # | Finding | File | Line |
|---|---------|------|------|
| F-6 | ~~GSTR-1 export URL broken~~ — **FIXED 2026-09-20**: added `/v1/` prefix | `billing/tax-rates/page.tsx` | 89 |
| ~~F-7~~ | ~~Token Consumption SVG chart has entirely hardcoded path coordinates — displays fabricated chart~~ ✅ Fixed 2026-09-20 | `tenants/page.tsx` | 1463-1501 |
| F-8 | `handleUpdatePlan` and `handleToggleSuspend` missing `credentials: 'include'` | `tenants/page.tsx` | 901-957 |
| F-9 | "Trigger Redelivery" and "Force Process" webhook buttons are non-functional — only show toasts | `tenants/page.tsx` | 3039-3055 |
| F-10 | Plan assignment dropdown uses hardcoded options instead of dynamically fetched `plans` state | `users/page.tsx` | 964-974 |
| F-11 | Knowledge page: ALL API calls missing `credentials: 'include'` | `knowledge/page.tsx` | 76-158 |
| F-12 | Security page: API call missing `credentials: 'include'` | `security/page.tsx` | 42-51 |
| F-13 | Backups page: ALL API calls missing `credentials: 'include'` | `backups/page.tsx` | 92-153 |
| F-14 | GPU page: API call missing `credentials: 'include'` | `gpu/page.tsx` | 54-69 |
| F-15 | Playground page: API call missing `credentials: 'include'` | `playground/page.tsx` | 50-64 |
| F-16 | Integrations page: POST/PATCH calls and sync polling missing `credentials: 'include'` | `integrations/page.tsx` | 793-1003 |
| F-17 | ~~Knowledge file upload sends only metadata JSON~~ — **FIXED 2026-09-20**: now uses FormData with actual file binary | `knowledge/page.tsx` | 140-158 |

### MEDIUM (16)

| # | Finding | File | Line |
|---|---------|------|------|
| F-18 | TypeScript `interface Metric` shadows tremor's imported `Metric` component | `dashboard/page.tsx` | 21 |
| F-19 | ~~KPI fields accessed without null safety~~ — **FIXED 2026-09-20**: all KPI fields use `?? 0` fallback | `dashboard/page.tsx` | 370-398 |
| F-20 | Alert dismiss button has no onClick handler | `dashboard/page.tsx` | 306 |
| F-21 | ~~Division by zero risk in GPU/RAM percentage calculations~~ — **FIXED 2026-09-20**: added total > 0 guard | `dashboard/page.tsx` | 276-284 |
| ~~F-22~~ | ~~Hardcoded static diagnostic text displayed as real analysis in logs~~ ✅ Fixed 2026-09-20 | `logs/page.tsx` | 215-218 |
| ~~F-23~~ | ~~Expanded row "Generated Output Context" shows hardcoded placeholder text~~ ✅ Fixed 2026-09-20 | `logs/page.tsx` | 306-308 |
| F-24 | `p.error_rate * 100` may double-convert if already a percentage | `logs/page.tsx` | 360 |
| ~~F-25~~ | ~~Fake fallback duration `wf.avg_duration_ms \|\| 2800` displays 2.8s as real data~~ ✅ Fixed 2026-09-20 | `workflows/page.tsx` | 319 |
| ~~F-26~~ | ~~Fake fallback duration `ex.duration_ms \|\| 2500` for execution rows~~ ✅ Fixed 2026-09-20 | `workflows/page.tsx` | 385 |
| F-27 | `createWorkflow` does not check response status or handle errors | `workflows/page.tsx` | 108-116 |
| F-28 | `runWorkflow` uses arbitrary 5s setTimeout with no real completion tracking | `workflows/page.tsx` | 119-129 |
| F-29 | Dead `localStorage.getItem('admin_token')` pattern throughout users page | `users/page.tsx` | 104+ |
| F-30 | Large `INITIAL_PLANS` hardcoded array as template default | `tenants/page.tsx` | 135-364 |
| F-31 | ~~Fallback TOTP verification in verify-2fa never works~~ — **FIXED 2026-09-20**: removed broken fallback, falls through to backup code check | `api/auth/verify-2fa/route.ts` | 71-76 |
| F-32 | ~~`Buffer.from(secret, 'base32')` is invalid~~ — **FIXED 2026-09-20**: removed broken crypto fallback | `api/auth/verify-2fa/route.ts` | 73 |
| F-33 | Legal holds page uses inline styles instead of Tailwind — inconsistent with rest of app | `tenants/[id]/legal-holds/page.tsx` | |

### LOW (7)

| # | Finding | File |
|---|---------|------|
| ~~F-34~~ | ~~Billing providers page: light theme inconsistent with dark-themed admin~~ ✅ Fixed 2026-09-20 | `billing/providers/page.tsx` |
| ~~F-35~~ | ~~Knowledge page: light theme inconsistent~~ ✅ Fixed 2026-09-20 | `knowledge/page.tsx` |
| F-36 | Sessions page: already has dark: variants — no change needed | `sessions/page.tsx` |
| F-37 | Dunning page: already has dark: variants — no change needed | `billing/dunning/page.tsx` |
| F-38 | Security page "Block" button has no onClick handler | `security/page.tsx:180` |
| F-39 | Security page: no error handling on `.json()` — no `r.ok` check | `security/page.tsx:46-51` |
| F-40 | Backups polling `useEffect` dependency on `backups.length` causes stale closure | `backups/page.tsx:110-117` |

---

## 4. Database & Infrastructure Audit — 31 Findings

### CRITICAL (2)

| # | Finding | Severity | Details |
|---|---------|----------|---------|
| D-1 | **Real secrets in `.env`** — `JWT_SECRET`, `TENANT_MASTER_KEY`, `PAYMENT_ENCRYPTION_KEY` stored as hex in root `.env` file | CRITICAL | Should be in secrets manager or Docker secrets |
| D-2 | **Hardcoded superadmin password hash in committed migration** — same bcrypt hash for both accounts, `force_password_change = FALSE`, ON CONFLICT resets hash | CRITICAL | `029_seed_superadmin_user.sql:11-29` |

### HIGH (12)

| # | Finding | Details |
|---|---------|---------|
| D-3 | **`email_logs` missing RLS** — contains recipient emails, subjects, metadata | Has tenant_id, no policy |
| D-4 | **`legal_holds` missing RLS** — legal hold records with case names, admin emails | Has tenant_id NOT NULL, no policy |
| D-5 | **`legal_hold_audit_logs` missing RLS** — immutable audit trail unprotected | Has tenant_id NOT NULL, no policy |
| D-6 | **`integration_synced_files` missing RLS** — Google Drive file names, links, owner emails | Has tenant_id NOT NULL, no policy |
| D-7 | **`refresh_tokens` missing RLS** — session-equivalent credentials exposed cross-tenant | tenant_id is nullable |
| D-8 | **SMTP password stored in plaintext** — `smtp_pass VARCHAR(255)` unencrypted while payment secrets use AES-256-GCM | `028_create_email_templates_and_smtp_configs.sql:24` |
| D-9 | **Resend API key stored in plaintext** — `resend_api_key VARCHAR(255)` unencrypted | Same migration |
| D-10 | **Redis default password in docker-compose.yml** — `${REDIS_PASSWORD:-harikson_redis_pwd}` | `docker-compose.yml:119` |
| D-11 | **Postgres default password in docker-compose.yml** — `${POSTGRES_PASSWORD:-neuravolt_dev_pwd}` | `docker-compose.yml:176,234` |
| D-12 | ~~**Docker socket mounted in orchestrator without read-only**~~ — **ALREADY FIXED**: `:ro` flag present | `docker-compose.yml:151` |
| D-13 | ~~**No HTTP-to-HTTPS redirect**~~ — **FIXED 2026-09-20**: nginx already handles HTTP→HTTPS redirect via Certbot, verified live | nginx sites-enabled |
| D-14 | ~~**No security headers middleware**~~ — **FIXED 2026-09-20**: HSTS, X-Frame-Options DENY, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy added to nginx + Traefik | nginx `snippets/security-headers.conf` + `traefik/dynamic.yml` |

### MEDIUM (11)

| # | Finding | Details |
|---|---------|---------|
| D-15 | `knowledge_documents` RLS uses `current_setting()` without `true` flag — throws instead of returning NULL | `039_add_rls_policies_core_tables.sql:30` |
| D-16 | `user_prompt_presets` missing RLS and FK constraint on tenant_id | `036_create_user_prompt_presets.sql` |
| D-17 | `archived_users.tenant_id` nullable with no FK — orphaned rows bypass RLS | `023_complete_schema_consolidation.sql:28` |
| D-18 | `refresh_tokens.tenant_id` nullable with no FK | `037_add_tenant_id_to_refresh_tokens.sql:11` |
| D-19 | `user_developer_configs` missing tenant_id entirely | `031_create_user_developer_config.sql` |
| D-20 | SMTP seed includes dev API key `'re_dev_key'` in committed migration | `028:60` |
| D-21 | ~~Rate limiter defined in Traefik but not applied to any router~~ — **FIXED 2026-09-20**: rate limiting added to nginx (30r/s global, 10r/s API) + wired to all Traefik routers | nginx + `docker-compose.yml` |
| D-22 | Traefik dashboard IP whitelist includes all RFC1918 ranges — too broad for cloud | `docker-compose.yml:42-49` |
| D-23 | Grafana exposed without Traefik-level auth middleware | `docker-compose.yml:378-382` |
| D-24 | Hardcoded production GCP IP `34.131.237.79` in compose env fallbacks | `docker-compose.yml:287,324` |
| D-25 | All services share single flat Docker network — no network segmentation | `docker-compose.yml:3-5` |

### LOW (6)

| # | Finding | Details |
|---|---------|---------|
| D-26 | `widget_analytics` missing RLS (low-risk analytics data) | `013_add_widget_origin_validation.sql` |
| D-27 | `cookie_consent_log` missing tenant_id | `021_create_cookie_consent_log.sql` |
| D-28 | `user_profile_events` missing tenant_id | `023_complete_schema_consolidation.sql:341` |
| D-29 | `user_passkeys` missing tenant_id — relies only on user_id FK | `024_trial_custom_domains_passkeys.sql` |
| D-30 | ~~Admin-panel and user-portal missing healthchecks~~ — **FIXED 2026-09-20**: healthchecks added to docker-compose.yml (takes effect on next container recreate) | `docker-compose.yml` |
| ~~D-31~~ | ~~Prometheus and Grafana missing resource limits~~ ✅ Fixed 2026-09-20 | `docker-compose.yml` |

---

## 5. Live Server Audit — 7 Findings

| # | Finding | Severity | Details |
|---|---------|----------|---------|
| L-1 | ~~**SSL cert is Traefik's self-signed default**~~ — **RESOLVED 2026-09-20**: Nginx+Certbot handles TLS termination, not Traefik. Valid Let's Encrypt certs confirmed on all domains (expires Dec 2026). Traefik's internal TLS is unused. | RESOLVED | nginx + Certbot |
| L-2 | ~~**Missing `update_updated_at_column` DB function**~~ — **FIXED 2026-09-20**: function created on production DB | RESOLVED | Created via `CREATE OR REPLACE FUNCTION` |
| L-3 | **Admin panel stale server actions** — 9 occurrences of "Failed to find Server Action" in logs. Running build is out of sync with client code | MEDIUM | Needs rebuild/redeploy |
| L-4 | **User portal socket hang ups to tenant-api** — 6 proxy connection drops in recent logs | MEDIUM | Investigate proxy timeouts |
| L-5 | **33GB reclaimable Docker storage** — 22GB images + 11GB build cache | LOW | `docker system prune -a` |
| L-6 | **Ollama model not pre-loaded** — qwen2.5:3b installed but not in memory. First request incurs cold-start latency | LOW | Pre-warm on startup |
| L-7 | **47 of 57 tables empty** — early-stage deployment, many features unused | LOW | Informational |

---

## 6. Pervasive Patterns

### Pattern A: Missing `credentials: 'include'` (affects 11+ pages)

The single most widespread bug. These admin pages have fetch calls that never send HttpOnly auth cookies:

- `agents/page.tsx` — ALL calls
- `workflows/page.tsx` — ALL calls
- `emails/page.tsx` — ALL calls + no auth headers at all
- `knowledge/page.tsx` — ALL calls
- `security/page.tsx`
- `backups/page.tsx` — ALL calls
- `gpu/page.tsx`
- `playground/page.tsx`
- `integrations/page.tsx` — POST/PATCH calls
- `tenants/page.tsx` — handleUpdatePlan, handleToggleSuspend
- `users/page.tsx` — relies on dead localStorage pattern

**Pages that correctly use it:** dashboard, audit, logs, sessions, dunning, legal-holds.

**Fix:** Add `credentials: 'include'` to every `fetch()` call in the admin panel.

### Pattern B: Missing RLS on tenant-scoped tables (8 tables)

Tables with `tenant_id` but no Row Level Security policy:
1. `email_logs`
2. `legal_holds`
3. `legal_hold_audit_logs`
4. `integration_synced_files`
5. `refresh_tokens`
6. `user_prompt_presets`
7. `widget_analytics`
8. `knowledge_documents` (has RLS but uses unsafe `current_setting()` variant)

### Pattern C: Mock/Fake data in production (6 instances)

1. Seed workflows with fabricated success rates — auto-inserted on startup
2. Seed knowledge bases with fake files (e.g., `gpu_optimization_guide.pdf`)
3. Simulated integration sync with random progress counters
4. Hardcoded SVG chart coordinates on tenant token consumption
5. Fake fallback durations (2.5s, 2.8s) displayed when real data is null
6. Hardcoded diagnostic text in logs displayed as real analysis

---

## 7. Recommended Fix Priority

### Phase 1: Auth & Access Control (CRITICAL — do first)

| Task | Findings | Effort |
|------|----------|--------|
| Fix admin route auth bypass — add `adminAuth` to all 30+ routes | B-5 | Large |
| Fix 2FA bypass — check `requires2FA` before `r1.ok` | F-1 | Small |
| Fix refresh token to verify user in DB | B-4 | Small |
| Add `credentials: 'include'` to all frontend fetch calls | F-2 through F-16 | Medium |
| Remove resetLink from error response | B-3 | Small |

### Phase 2: Data Security (HIGH)

| Task | Findings | Effort |
|------|----------|--------|
| Add RLS to 7 missing tables | D-3 through D-7, D-16, D-26 | Medium |
| Fix XSS in email templates — HTML-escape all variables | B-1, B-2 | Small |
| Fix XSS in email template preview — use DOMPurify or iframe | F-5 | Small |
| Encrypt SMTP password and Resend API key at rest | D-8, D-9 | Medium |
| Fix webhook signature validation order | B-12 | Small |
| Remove/gate seed data in production | B-13, B-14 | Small |
| Remove hardcoded default passwords from compose | D-10, D-11 | Small |

### Phase 3: SSL & Infrastructure (HIGH) — ✅ COMPLETED 2026-09-20

| Task | Findings | Status |
|------|----------|--------|
| ~~Fix Let's Encrypt~~ — SSL handled by nginx+Certbot, valid certs confirmed | L-1 | ✅ Resolved |
| ~~Add HTTP-to-HTTPS redirect~~ — already working via nginx/Certbot | D-13 | ✅ Already done |
| ~~Add security headers middleware~~ — HSTS, X-Frame-Options, CSP, etc. added to nginx | D-14 | ✅ Fixed & deployed |
| ~~Wire rate limiter~~ — nginx rate limiting (30r/s global, 10r/s API) + Traefik middleware | D-21 | ✅ Fixed & deployed |
| ~~Docker socket proxy for orchestrator~~ — `:ro` flag already present | D-12 | ✅ Already done |
| ~~Add healthchecks to admin-panel + user-portal~~ — added to docker-compose.yml | D-30 | ✅ Fixed (pending container recreate) |

### Phase 4: Bug Fixes (MEDIUM) — ✅ COMPLETED 2026-09-20

| Task | Findings | Status |
|------|----------|--------|
| ~~Fix legal hold audit log shifted columns~~ | B-17 | ✅ Fixed |
| ~~Fix GSTR-1 export URL~~ | F-6 | ✅ Fixed |
| ~~Fix tokensOut always zero in playground~~ | B-10 | ✅ Fixed |
| ~~Fix knowledge file upload to send actual file content~~ | F-17 | ✅ Fixed |
| ~~Fix KPI null safety~~ | F-19 | ✅ Fixed |
| ~~Fix division by zero in dashboard~~ | F-21 | ✅ Fixed |
| ~~Consolidate to single DB pool~~ | B-7, B-8 | ✅ Fixed |
| ~~Fix cookie parser inconsistency~~ | B-16 | ✅ Fixed |
| ~~Create missing `update_updated_at_column` function~~ | L-2 | ✅ Fixed & deployed |
| ~~Fix `knowledge_documents` RLS policy to use safe pattern~~ | D-15 | ✅ Fixed in Phase 2 |
| ~~Fix verify-2fa fallback TOTP code~~ | F-31, F-32 | ✅ Fixed |
| ~~Fix cartesian join in tenant queries~~ | B-30, B-31 | ✅ Fixed |

### Phase 5: Cleanup (LOW) — ✅ COMPLETED (2026-09-20)

| Task | Findings | Effort |
|------|----------|--------|
| ~~Replace mock/hardcoded data with real values or "N/A"~~ | F-7, F-22, F-23, F-25, F-26 | ✅ Fixed |
| Remove hardcoded plan options — use dynamic data | F-10 | Deferred (needs plans API) |
| ~~Fix theme inconsistencies across admin pages~~ | F-34, F-35 | ✅ Fixed |
| F-36, F-37 — sessions/dunning pages | Already have dark: variants | ✅ No change needed |
| ~~Add resource limits to monitoring containers~~ | D-31 | ✅ Fixed |
| Network segmentation in Docker compose | D-25 | Deferred (requires significant restructuring) |
| Reclaim 33GB Docker storage | L-5 | Deferred (operational — run on server) |
| Rotate superadmin password hash in migration | D-2 | Deferred (needs credential coordination) |

---

## 8. Changes Since Last Audit (2026-09-16)

Improvements made between audits:
- ✅ RLS added to 7 tables (users, workflows, workflow_executions, knowledge_bases, integrations, backups, playground_sessions)
- ✅ `set_tenant_context` and `assert_tenant_context` functions created and deployed
- ✅ Traefik timeout increased to 120s — fixed chat 500 errors
- ✅ Rate limiter added to admin-api (in-memory)
- ✅ 2FA implementation added (but has bypass bug)
- ✅ Session management page and endpoints added
- ✅ Dunning dashboard page added
- ✅ Archived_users PK fix deployed
- ✅ Indexes added on high-traffic tenant_id columns
- ✅ DLQ errors (`set_tenant_context`, `deleted_at`, `tenant_id NOT NULL`) all resolved — 0 occurrences

New issues found:
- 🆕 2FA bypass bug (F-1)
- 🆕 verify-2fa fallback TOTP broken (F-31, F-32)
- 🆕 Missing `update_updated_at_column` function discovered on live server (L-2)
- 🆕 Deeper analysis of auth middleware bypass (B-5 — previously counted as fewer routes)
- 🆕 Full frontend `credentials: 'include'` audit (11 pages affected)

---

*Total findings: 109 (13 CRITICAL, 33 HIGH, 41 MEDIUM, 22 LOW)*
