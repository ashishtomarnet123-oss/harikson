# Harikson / Neuravolt Cloud — Implementation Plan

> Companion document to [FULL_PROJECT_ANALYSIS.md](FULL_PROJECT_ANALYSIS.md), which contains the verified findings. This file is the execution plan: what to change, where, in what order, and how you'll know each phase is done.
>
> Every item below was checked against the current working tree before being included — the "Fix" column describes the actual current code, not the (sometimes stale) audit claim. One item from the pasted audits (Founder Dashboard) is intentionally excluded — see [FULL_PROJECT_ANALYSIS.md §3](FULL_PROJECT_ANALYSIS.md) for why.
>
> Nothing in this plan has been applied yet — it's a plan, not a changelog. Work through the phases in order; each phase assumes the previous one is done.

---

## Phase 0 — Secrets (do this before anything else, same day)

This phase exists because a real secret is currently exposed in git. Everything else in this plan is safe to sequence normally; this isn't.

| Step | Action | Files |
|---|---|---|
| 0.1 | Generate a new `JWT_SECRET` and `NEXTAUTH_SECRET` (`openssl rand -base64 48`, don't reuse across services) | — |
| 0.2 | Update the real deployment's environment (wherever `admin-panel` and `admin-api` actually run) with the new values — **do this before step 0.3** or you'll lock yourself out | VM env / secrets manager |
| 0.3 | Remove `admin-panel/.env.local` from git tracking: `git rm --cached admin-panel/.env.local` | [admin-panel/.env.local](admin-panel/.env.local) |
| 0.4 | Add `.env.local` to `.gitignore` (check `.env*.local` isn't already covered — [.gitignore](.gitignore) currently doesn't exclude it) | [.gitignore](.gitignore) |
| 0.5 | Decide whether to scrub `32a8206` and later history where the secret appears (`git filter-repo` / BFG), given it's been exposed since 2026-07-24. If the repo has any external collaborators or is or will be public, treat this as necessary, not optional | git history |
| 0.6 | Rotate `DATABASE_URL` password (`neuravolt_dev_pwd`) since it was in the same exposed file, and the same literal password appears in `docker-compose.yml` and multiple `.env.*` files as a placeholder — confirm production doesn't actually use this literal string | docker-compose.yml, .env.production |

**Acceptance criteria:** `git ls-files | grep env.local` returns nothing; `adminAuth.js`'s hardcoded fallback string no longer matches any value in any tracked file or live environment.

---

## Phase 1 — P0: Broken-in-production fixes (this week)

These are bugs, not missing features — each one is actively wrong or actively dangerous right now.

### 1.1 Remove the hardcoded JWT fallback and DB-failure auth bypass
**File:** [admin-api/src/middleware/adminAuth.js](admin-api/src/middleware/adminAuth.js)

Current code (lines 12-15, 58-68):
```js
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'neuravolt_dev_jwt_secret_key_extremely_long_and_secure_value_12345!';
// ...
} catch (dbErr) {
  const allowed = ['admin', 'superadmin', 'founder'];
  if (decoded.role && allowed.includes(decoded.role)) {
    req.admin = { id: decoded.userId, role: decoded.role };
    return next(); // bypasses DB verification
  }
  return res.status(500).json({ error: 'Database service unavailable' });
}
```
**Change to:**
```js
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set (32+ chars) — refusing to start with an insecure default');
}
// ...
} catch (dbErr) {
  logger.error('Admin Auth Middleware DB query error:', dbErr.message);
  return res.status(503).json({ error: 'Database service unavailable' });
}
```
This mirrors the pattern already used for `TENANT_MASTER_KEY` in `tenant-api` — throw at module load, not per-request, so a misconfigured deploy fails immediately and loudly instead of silently trusting a hardcoded value.

**Also fix the metrics endpoint's separate secret** — [admin.js:1426](admin-api/src/admin.js:1426) uses `process.env.ADMIN_JWT_SECRET || 'dev-admin-secret-key-change-in-prod'` (a *third* secret, unset everywhere). Point it at the same `JWT_SECRET` used everywhere else, or remove `ADMIN_JWT_SECRET` entirely if it's not meant to be independent.

### 1.2 Fix the SSE Live Activity stream
**File:** [admin-api/src/routers/operations.js:130-152](admin-api/src/routers/operations.js:130)

The `sendData` function runs the query and drops the result on the floor. Add the actual send:
```js
const sendData = async () => {
  try {
    const result = await pool.query(`
      SELECT a.id, a.model, a.status, a.tokens_in, a.tokens_out, a.latency_ms, a.created_at, t.name as tenant_name
      FROM ai_activity a LEFT JOIN tenants t ON a.tenant_id = t.id
      ORDER BY a.created_at DESC LIMIT 25
    `);
    res.write(`data: ${JSON.stringify(result.rows)}\n\n`);
  } catch (err) {
    logger.error('Error in sendData SSE callback:', err);
  }
};
```
Verify the frontend's `EventSource` handler in `admin-panel/app/admin/activity/` parses `event.data` as JSON (SSE payloads must be `data: <text>\n\n`, not a raw object).

**Acceptance criteria:** opening the Live Activity page shows rows updating every 4s without a manual refresh.

### 1.3 Fix the cleanup endpoint's broken import path
**File:** [admin-api/src/admin.js:887](admin-api/src/admin.js:887)
```js
const { executeDatabaseCleanup } = await import('../../harikson/tenant-api/dist/services/cleanupService.js');
```
This reaches outside `admin-api`'s own build/Docker context into a sibling service's `dist/` output. Two real options:
- **(a)** Expose cleanup as an internal HTTP endpoint on `tenant-api` and have `admin-api` call it over the network (consistent with how these are otherwise two independent deployable services).
- **(b)** If `cleanupService.js` has no `tenant-api`-specific dependencies, move/duplicate it into `admin-api/src/services/` and own it there.
(a) is preferable — it keeps the services independently deployable, which the Docker Compose setup already assumes.

### 1.4 Remove the fake billing fallback
**File:** [user-portal/components/settings/billing.js](user-portal/components/settings/billing.js) (both the `res.ok === false` branch, ~line 95, and the `catch` block, ~line 150)

Replace the hardcoded `setBilling({ planName: 'Professional Plan', ... last4: '4242' ... })` block in both places with an error state:
```js
setBillingError('Unable to load billing information. Please refresh or contact support if this persists.');
setBilling(null);
```
Update the render path to show that message (with a retry button) when `billing === null && billingError`, instead of ever rendering fabricated plan/card/invoice data.

### 1.5 Implement real account deletion
**Frontend:** [user-portal/components/settings/privacy.js:189-192](user-portal/components/settings/privacy.js:189) currently does:
```js
if (window.confirm('THIS IS PERMANENT: Delete your account and all data?')) {
  alert('Account deletion request initiated. Please contact your tenant administrator if this was a mistake.');
}
```
**Backend:** add `DELETE /api/v1/user/account` to `tenant-api` if it doesn't exist yet (check `harikson/tenant-api/src/routes/user.routes.ts` first — confirm before building, since the route may already exist and just not be wired to this button). The handler should:
- require current-password re-entry (this is a destructive, irreversible action — don't allow it off a stale session alone)
- soft-delete or hard-delete per your DPDP/GDPR decision (see Phase 2.1 — do this consistently with the admin-side user deletion, not independently)
- invalidate all sessions/refresh tokens for that user
- send a confirmation email

**Frontend change:** replace the `alert()` with an actual `DELETE` call, wired to a real success/error UI state (a modal or toast, not a second native `alert`).

### 1.6 Fix the hardcoded impersonation-stop link
**File:** [user-portal/pages/chat.js:567](user-portal/pages/chat.js:567)
```js
window.location.href = 'http://localhost:3018/admin/users';
```
Replace with an environment-driven admin panel URL. If `NEXT_PUBLIC_API_URL` or an equivalent `NEXT_PUBLIC_ADMIN_PANEL_URL` is already defined in the env files (check `.env.production`/`.env.staging` — `admin-panel`'s public URL should already be known at build time since Traefik routes `admin.neuravolt.cloud` to it), use that instead of a literal string.

### 1.7 Fix the broken `atob('cookie_auth')` auth-token pattern
**Files:** [user-portal/components/settings/workspace.js](user-portal/components/settings/workspace.js) (lines 14, 43, 169, 214) and [developer.js](user-portal/components/settings/developer.js) (lines 54, 90)

Current pattern:
```js
const token = localStorage.getItem('hk_user') ? 'cookie_auth' : null;
const payload = JSON.parse(atob(token.split('.')[1])); // fails — 'cookie_auth' isn't a JWT
```
This was almost certainly meant to read the actual access token. Fix:
```js
const storedUser = localStorage.getItem('hk_user');
const currentUserId = storedUser ? JSON.parse(storedUser).id : null;
```
`hk_user` already holds the parsed user object (per `AuthContext.js`) — there's no need to decode a JWT at all here if the user ID is already sitting in `hk_user`. Apply the same fix in both files; they share the identical broken snippet.

**Acceptance criteria for Phase 1:** every item above has a corresponding before/after in a diff, admin login and impersonation both work end-to-end in a manual test, and the SSE stream visibly updates.

---

## Phase 2 — P1: Data integrity and mock-to-real (this sprint, ~2-3 weeks)

### 2.1 Replace the 5 hardcoded admin-api mock endpoints
**File:** [admin-api/src/admin.js](admin-api/src/admin.js)

| Endpoint | Line | Replace with |
|---|---|---|
| `GET /admin/rate-limit-violations` | 3031 | Query Redis or a `rate_limit_events` table if one exists; if none does, this needs a small logging hook added wherever rate limiting currently rejects a request (check `tenant-api`'s Redis rate limiter — it likely already has the raw data, just isn't persisting violation events) |
| `GET /admin/billing/reconciliation` | 3059 | Real reconciliation query joining `subscriptions`/`invoices`/`payment_webhooks` to find provider/DB mismatches — this is the highest-value fix in this group since admins may currently be trusting fake reconciliation numbers |
| `GET /admin/logs/errors` | 3107 | Query whatever error-logging sink `tenant-api`/`admin-api` already write to (Pino output referenced in `AUDIT_README.md` — confirm if it's queryable or needs a `error_logs` table) |
| `GET /admin/models/performance` | 3128 | Pull from Ollama's own stats (`/api/ps`, response latencies already logged in `ai_activity`) instead of hardcoded `harikson-chat-8b` stats |
| `GET /admin/logs/export` | 3155 | Same source as `logs/errors`, exported as CSV from the real query instead of a fixed 2-row string |

For each: if there's genuinely no underlying data source yet, ship an honest "Not enough data yet" / empty-state response rather than continuing to fabricate rows — that's a smaller, safer change than building the full pipeline immediately, and removes the deception in the meantime.

### 2.2 Split `admin-api/src/admin.js` (4,579 lines, ~87 routes) into route modules
Follow the same pattern already used in `harikson/tenant-api/src/routes/` (auth, billing, chat, documents, agents, widget, health as separate files). Suggested split by the domains already visible in the file: `tenants.routes.js`, `users.routes.js`, `billing.routes.js`, `emails.routes.js`, `security.routes.js`, `logs.routes.js`, `knowledge.routes.js`, `models.routes.js`, `webhooks.routes.js`. Do this **after** 2.1, not before — splitting first means you're moving mock endpoints around instead of fixing them, and you'll want the mock-endpoint diffs to be reviewable against the current monolith while it's still in one place.

Do this incrementally: extract one domain at a time behind the existing `app.get/post/...` registrations, run the existing (limited) test suite after each extraction, don't attempt one giant refactor PR.

### 2.3 Fix Connected Apps, Storage Manager, Developer Settings (all in `user-portal`)
These three share the same shape of problem — pure frontend state with no backend — so they can go through the same review cycle:

- **[apps.js](user-portal/components/settings/apps.js):** either wire the existing `admin-api/src/routers/integrations.js` OAuth config through to user-facing endpoints (real fix, larger effort — see Phase 4), or immediately relabel every currently-"Connected: true" integration as "Coming Soon" and remove the fake `connectedAs` values. Do the relabel now regardless of the OAuth timeline — showing fabricated connection status to users is actively misleading and cheap to fix today.
- **[storage.js](user-portal/components/settings/storage.js):** needs a real `GET /api/v1/user/storage` endpoint aggregating actual document/file sizes from wherever RAG documents and uploads are stored. Until that endpoint exists, show "—" / "Not yet available" rather than `24.5 / 100 GB`.
- **[developerConfig.js](user-portal/components/settings/developerConfig.js):** the fake `setTimeout` save needs a real persistence endpoint for webhook URL/signing secret. This should probably live next to the existing API-keys backend (`GET/POST/DELETE /api/v1/user/developer/keys`) since it's the same settings domain.

### 2.4 GDPR/DPDP-relevant fixes (bundle these — same compliance conversation)
- Soft-delete for users in the admin-side `DELETE` user operation (currently hard delete per the admin audit) — add a `deleted_at` column, filter it everywhere `users` is queried.
- Tenant-level GDPR data export (currently only exists at the user level, and even that's incomplete per §2.5 below).
- Complete the user-level data export in `privacy.js` — currently only exports profile + localStorage conversation metadata. Extend to include actual conversation messages, RAG documents, billing history, activity logs — pull from the same tables the admin panel already queries for these.

**Acceptance criteria for Phase 2:** no endpoint in either service returns a fixed literal value under normal operation; `admin.js` is under ~1,500 lines with the rest distributed into route modules; account deletion and data export are real, backend-verified operations.

---

## Phase 3 — P2: Security hardening and UX cleanup (following sprint)

Bundle these together since none are urgent alone but they compound:

1. **Admin login rate limiting** — Redis-based, e.g. 5 attempts / 10 min / IP, on the admin login route in `admin.js`.
2. **Admin 2FA (TOTP)** — the platform already has a working TOTP implementation for regular users (per `AUDIT_README.md`'s security phase — `speakeasy`/2FA backup codes exist); reuse that same library and flow for `admin`/`superadmin`/`founder` roles rather than building a second implementation.
3. **SMTP password encryption** — if `smtp_configs` currently stores passwords in plaintext (per the admin audit, `admin.js:2251`), encrypt with the same AES-256-GCM helper already used for payment provider credentials — don't introduce a second encryption scheme.
4. **Cookie `sameSite: 'lax'` → `'strict'`** for admin cookies, and confirm this doesn't break any legitimate cross-site redirect flow (e.g. OAuth callback) before flipping it.
5. **`window.alert()`/`window.confirm()` replacement** across `user-portal` settings components — replace with the app's existing modal component (check if `SettingsModal.js` or similar already has a confirm-dialog pattern before building a new one).
6. **API key show-once** — `developer.js`'s API keys should only render the full secret at creation time, then show a masked/truncated form afterward, consistent with how `admin-api`'s payment provider keys are already masked (`first 8 chars + ****`, per the admin audit's §6.1 — reuse that exact pattern).
7. **Tenant slug hardening** — confirm (write a test if one doesn't exist) that `tenant-api` rejects any request where the JWT's tenant claim doesn't match the `x-tenant-slug` header, so the client-controllable `?tenant=` param and `hk_api_base` localStorage override in `api-config.ts` can't actually reach another tenant's data regardless of what the frontend sends.
8. **Confirmation dialogs before destructive admin actions** (delete/suspend user or tenant) — currently missing per the admin audit's §7.2.

---

## Phase 4 — Medium-term product work (1-2 months)

These are real feature builds, not bug fixes — scope and estimate each independently before committing to a sprint.

1. **Real dashboard** — `/dashboard` currently redirects straight to `/chat`. Build actual summary widgets (usage, billing status, recent conversations) using data the backend already exposes elsewhere (`usage.js`'s API, `billing.js`'s API once fixed).
2. **Notification center** — doesn't exist at all. Minimum viable version: an in-app feed backed by a new `notifications` table, populated from existing events (billing failures, usage thresholds, security events) that currently have no user-facing surface.
3. **Real OAuth integrations** — `admin-api/src/routers/integrations.js` already has provider configs for GitHub/Google Drive/Slack/Notion/Discord; the gap is purely that no user-panel route consumes them. This is the natural real fix for the "Connected Apps" mock from Phase 2.3.
4. **Real pgvector RAG pipeline** — currently RAG documents are stored as full text in `localStorage` and injected raw into the chat prompt (`chat.js:1593-1612`). Given `pgvector` is already provisioned (per `docker-compose.yml`'s Postgres image and the DB schema), the fix is: server-side chunking + embedding on upload (`POST /api/v1/user/rag-files`), storing chunks in a `document_embeddings`-style table (already referenced by the admin-api audit's table list, so it may partially exist on the admin/knowledge-base side — check for reuse before building a parallel schema), and switching chat-time retrieval from "read localStorage, paste whole doc" to a similarity-search query.
5. **Decide the fate of the parallel `app/`/`admin/`/`backend/` (Prisma) stack** versus the active `user-portal`/`admin-panel`/`tenant-api`/`admin-api` stack (per `full_stack_audit.md`'s own architecture section). This isn't a code fix, it's a scoping decision that determines whether Phases 1-3 of *this* plan need a mirrored pass on the other stack.

---

## Phase 5 — Enterprise readiness (quarter-scale, sequence after product-market fit on Phases 1-4)

Only pursue these once Phases 1-3 are done — building SSO on top of an admin auth system that still has the Phase 1 issues open is the wrong order.

- Granular admin RBAC (currently three flat roles: `admin`/`superadmin`/`founder`)
- Admin session revocation (Redis token blacklist)
- SSO/SAML for admin login
- Tenant GDPR data export
- Comprehensive automated test suite (both services currently have thin or trivial coverage — the User Panel audit's finding that the two existing frontend tests are non-functional is accurate and should be the starting point, not an afterthought, once Phase 1/2 changes land, since those changes are exactly what needs regression protection)

---

## How to use this plan

Work top to bottom. Each phase has a natural checkpoint (a demo-able state) before starting the next:
- **After Phase 0:** no live secret exposure.
- **After Phase 1:** nothing in the admin or user panel is silently broken or fabricating data in a way that misleads a real user or admin.
- **After Phase 2:** the codebase's actual behavior matches what its UI claims, and the admin-api monolith is no longer a single 4,600-line file.
- **After Phase 3:** the remaining known security gaps from both pasted audits are closed.
- **Phase 4/5:** genuine new capability, sequence against product priorities rather than this document.
