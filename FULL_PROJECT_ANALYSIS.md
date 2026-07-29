# Harikson / Neuravolt Cloud — Consolidated Full-Project Analysis

> **Date:** 2026-07-29
> **Method:** Synthesis of (a) this repo's own prior audits (`AUDIT_README.md`, `full_stack_audit.md`), (b) two externally-forwarded Antigravity AI audits (Admin Panel, User Panel — dated 2026-07-27), and (c) direct verification against the current working tree in this session. Every claim below was re-checked against live source; items that no longer matched the code are marked **STALE** and excluded from action items. This file supersedes the point-in-time claims of the pasted audits — treat *this* document as current.

---

## 0. How to read this report

The project has accumulated several AI-generated audits in a short window (2026-07-22 → 2026-07-27), and code has moved between each one. Rather than add a fourth disconnected audit, this report:

1. States what's **confirmed still true right now** (with file:line evidence re-checked today).
2. Flags what the older audits got **right but is now fixed**.
3. Flags what they got **wrong or stale** (e.g., a feature that no longer exists).
4. Adds **new findings** none of the prior audits caught.

---

## 1. Top Finding — Worse Than Either Prior Audit Reported

### 🔴 P0 — Admin JWT signing secret is committed to git and matches the code's hardcoded fallback

- [admin-api/src/middleware/adminAuth.js](admin-api/src/middleware/adminAuth.js:12) falls back to a hardcoded string if `JWT_SECRET`/`NEXTAUTH_SECRET` aren't set:
  ```js
  const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET ||
    'neuravolt_dev_jwt_secret_key_extremely_long_and_secure_value_12345!';
  ```
- [admin-panel/.env.local](admin-panel/.env.local) sets `JWT_SECRET` and `NEXTAUTH_SECRET` to **that exact same string**, alongside `NEXTAUTH_URL=http://154.201.127.68:3018` — the real deployment VM IP.
- **This file is not in `.gitignore` and is tracked in git** (confirmed via `git ls-files`, last committed `32a8206`, 2026-07-24).

**Impact:** if this `.env.local` is what's actually deployed to the VM (its own content — the real IP — strongly suggests it is), the admin JWT secret in production is both (a) identical to the public hardcoded fallback baked into the source, and (b) additionally exposed in git history. Anyone with read access to this repository can forge a valid `admin`/`superadmin`/`founder` JWT and pass `adminAuth.js` — no login required. This is more severe than SEC-001 in `AUDIT_README.md` (which only covered the removed `TEST_TOKEN` backdoor) and SEC-01 in the pasted admin-panel audit (which flagged the fallback but not that it's confirmed committed to git and pointed at the live VM).

**Action:** rotate `JWT_SECRET`/`NEXTAUTH_SECRET` immediately, remove the hardcoded fallback in `adminAuth.js` entirely (fail closed instead), and treat the string as burned — purge it from `.env.local`, add that file to `.gitignore`, and consider whether history scrubbing is warranted given how long it's been exposed.

---

## 2. What the prior audits got right — confirmed still live today

Verified by direct file read in this session; all still present and exploitable.

| # | Finding | Evidence (verified today) | Severity |
|---|---|---|---|
| 1 | Admin JWT falls back to hardcoded secret | [adminAuth.js:12-15](admin-api/src/middleware/adminAuth.js:12) | 🔴 Critical (see §1) |
| 2 | DB failure lets a forged JWT bypass DB role verification | [adminAuth.js:58-68](admin-api/src/middleware/adminAuth.js:58) — catch block on DB error trusts `decoded.role` alone | 🔴 Critical |
| 3 | Admin `/admin/metrics` uses a *different* JWT secret than the rest of the app | [admin.js:1426](admin-api/src/admin.js:1426) — `process.env.ADMIN_JWT_SECRET \|\| 'dev-admin-secret-key-change-in-prod'`, never set elsewhere, so normal admin tokens can't use it (only bearer/IP-whitelist works) | 🟠 High |
| 4 | `POST /admin/cleanup` imports a path that won't exist in the container | [admin.js:887](admin-api/src/admin.js:887) — `import('../../harikson/tenant-api/dist/services/cleanupService.js')` reaches *outside* the `admin-api` build context | 🟠 High |
| 5 | Live Activity SSE stream never sends data | [operations.js:130-152](admin-api/src/routers/operations.js:130) — `sendData()` runs the DB query but the result is never passed to `res.write()`; the endpoint only ever flushes headers | 🟠 High (broken feature, not a security bug) |
| 6 | Five admin endpoints return hardcoded mock data unconditionally | `/admin/rate-limit-violations` ([admin.js:3031](admin-api/src/admin.js:3031)), `/admin/billing/reconciliation` ([:3059](admin-api/src/admin.js:3059)), `/admin/logs/errors` ([:3107](admin-api/src/admin.js:3107)), `/admin/models/performance` ([:3128](admin-api/src/admin.js:3128)), `/admin/logs/export` ([:3155](admin-api/src/admin.js:3155)) — all literally return fixed strings like `"Alpha Tech"`, `"Gamma Digital"`, a 2026-07-08 CSV row | 🟠 High (data integrity — admins are looking at fake numbers) |
| 7 | Billing settings tab shows a fake Visa card + invoices on any API error | [user-portal/components/settings/billing.js](user-portal/components/settings/billing.js) — lines ~95-204, duplicated in both the `res.ok===false` branch and the `catch` block: `planName: 'Professional Plan'`, `last4: '4242'`, fabricated invoice rows | 🔴 Critical (users see wrong financial data with no error indication) |
| 8 | "Connected Apps" integrations are 100% fake | [user-portal/components/settings/apps.js:20-39](user-portal/components/settings/apps.js:20) — Google/GitHub/VS Code hardcoded `connected: true` with fake account names; toggles only mutate local React state, no API call anywhere | 🟠 High (deceptive UI) |
| 9 | Storage Manager is 100% hardcoded | [storage.js:5-6](user-portal/components/settings/storage.js:5) — `totalStorage = 100`, `usedStorage = 24.5`, no API call at all | 🟠 High |
| 10 | Developer Settings "Save" does nothing real | [developerConfig.js:17](user-portal/components/settings/developerConfig.js:17) — `setTimeout(...)` fakes a save; webhook signing secret is a hardcoded literal (`whsec_hk_live_8f9a...`), never persisted | 🟠 High |
| 11 | Impersonation "stop" link is hardcoded to `localhost:3018` | [chat.js:567](user-portal/pages/chat.js:567) | 🔴 Critical in production (support workflow for ending impersonation is broken outside dev) |
| 12 | Account deletion is a fake `alert()`, no backend call | [privacy.js:190-191](user-portal/components/settings/privacy.js:190) | 🔴 Critical (DPDP/GDPR right-to-erasure non-compliance) |
| 13 | Broken auth-token pattern reused in 3 places | `workspace.js` (lines 14, 43, 169, 214) and `developer.js` (lines 54, 90) all do `const token = localStorage.getItem('hk_user') ? 'cookie_auth' : null;` then `atob(token.split('.')[1])` — `'cookie_auth'` is not a JWT, so this silently throws/fails whenever it runs | 🟠 High (functional bug, not just style) |
| 14 | Tenant resolution is client-controllable | [api-config.ts:45-47](user-portal/lib/api-config.ts:45) — a `?tenant=` query param overrides tenant context entirely; [signup.js:19,45](user-portal/pages/signup.js:19) defaults new signups to tenant slug `'system'` | 🟡 Medium (must be backend-enforced via JWT claims — confirm this is actually the case server-side, the frontend gives no assurance either way) |
| 15 | `/dashboard` has no dashboard — it's a redirect | [dashboard.js](user-portal/pages/dashboard.js) — `getServerSideProps` unconditionally redirects to `/chat` | 🟡 Medium (product gap, not a bug) |
| 16 | localStorage auth fallback trusts stale session if API is down | [AuthContext.js:102-122](user-portal/context/AuthContext.js:102) — `isAuthenticated` can be set from `localStorage` alone before the API confirms the session | 🟡 Medium |

**Not independently re-verified this session** (would require reading further into `admin.js`/frontend components not yet opened): SMTP passwords stored plaintext (`admin.js:2251`), reset-link returned in API JSON (`admin.js:1052`), impersonation token in URL redirect (`admin.js:1837`), `sameSite: 'lax'` cookies, CSP `unsafe-inline`, no admin login rate limiting, no admin 2FA, no per-key API scopes UI. These came from the pasted audits at specific line numbers that plausibly still match the file (admin.js is still ~4,600 lines and hasn't been restructured) — treat them as **likely still valid, not yet re-confirmed**.

---

## 3. What the prior audits got wrong — now stale

| Claim | Audit source | Why it's stale |
|---|---|---|
| `founderAuth.js` has an undeclared `token` variable → every `/admin/founder/*` request throws | Admin Panel audit, Part 2.4 / Part 12 | **No `founderAuth.js`, `founder.js`, or `/admin/founder` route exists anywhere in the current `admin-api` or `admin-panel` trees.** The Founder Dashboard feature described (vital signs, threats, hypotheses, seeded dummy data) is entirely absent from this codebase snapshot — either removed after the audit was written, or the audit was run against a different checkout. Nothing to fix here; verify the feature isn't expected to exist before spending any effort on it. |
| `TEST_TOKEN`/`TEST_ADMIN_TOKEN` superadmin bypass (CVSS 9.8) | `AUDIT_README.md` SEC-001 | Confirmed **remediated** — no match anywhere in `harikson/tenant-api` or `tenant-api`. The old 6,970-line `index.ts` God File this lived in has been decomposed into `harikson/tenant-api/src/routes/*` and `src/api/routes/*`. |
| No CI/CD pipeline | `AUDIT_README.md` Phase 21, Admin Panel audit Part 15 | Confirmed **remediated** — `.github/workflows/ci.yml`, `deploy-staging.yml`, `deploy-prod.yml`, and a dedicated `security.yml` token-scanner now exist. |
| Duplicate migration `005` / migration numbering conflict | `AUDIT_README.md` §21.1 | Confirmed **remediated** — migrations are cleanly sequential 001→028 with no duplicates. |
| `tests/` directories empty, 0% test coverage (tenant-api) | `AUDIT_README.md` | Partially stale — `harikson/tenant-api/tests` now has 21 files. (The *frontend* testing gap the User Panel audit found — 2 trivial test files in `user-portal/tests` — is still accurate.) |

---

## 4. Findings new to this pass (not in any prior audit)

1. **The "God File" problem moved, it didn't get solved.** `tenant-api`'s monolith was decomposed, but **`admin-api/src/admin.js` is now 4,579 lines** handling ~87 routes — the same anti-pattern, just in the sibling service. Frontend "God Pages" are also large: `admin-panel/app/admin/tenants/page.tsx` (3,264 lines), `user-portal/pages/chat.js` (2,704 lines), `admin-panel/app/admin/integrations/page.tsx` (1,306 lines). None of the audits connected these two data points into one "the decomposition effort only covered one service" finding.
2. **Two parallel product stacks share one database.** `app/`, `admin/`, `backend/` (Prisma-based "Neuravolt" core) coexist with `user-portal/`, `admin-panel/`, `tenant-api/`, `admin-api/`, `harikson/` (raw-SQL "Harikson" control plane), per `full_stack_audit.md`'s own §1.1 — worth confirming which stack is actually live before investing further audit/fix effort in the other.
3. **Secrets checked into `docker-compose.yml`:** a live Traefik BasicAuth htpasswd hash ([docker-compose.yml:44](docker-compose.yml:44)) and a hardcoded `PAYMENT_ENCRYPTION_KEY` value ([docker-compose.yml:198](docker-compose.yml:198)) sit in the compose file itself rather than `.env`. Combine with §1 — this repo has a pattern of real-looking secrets landing in tracked files instead of ignored ones.
4. **Single point of failure infrastructure.** Postgres, Redis, Ollama, and both APIs run on one VM with no failover; `k8s/` (Helm charts, Patroni, pgbouncer) exists but is disconnected from the actual deployment path in `docker-compose.yml`. A hardware fault takes the entire platform down, all tenants, at once.
5. **Ollama concurrency ceiling is a hard architectural constraint, not a bug** — `OLLAMA_MAX_LOADED_MODELS=1` in [docker-compose.yml:58](docker-compose.yml:58) means every tenant across the whole platform shares one loaded model at a time. Worth surfacing as a scaling conversation, not something to "fix" locally.

---

## 5. Consolidated Priority Action List

### Fix this week (P0)
1. Rotate `JWT_SECRET` / `NEXTAUTH_SECRET` everywhere; remove the hardcoded fallback in `adminAuth.js` and fail startup instead if unset (mirrors what was already done for `TENANT_MASTER_KEY`).
2. Remove `admin-panel/.env.local` from git tracking and add it to `.gitignore`; rotate every value it contained.
3. Remove the DB-failure JWT-only fallback in `adminAuth.js` — return 503 instead of trusting the token alone.
4. Fix the SSE stream in `operations.js` (`res.write(...)` is simply missing from `sendData`).
5. Remove the hardcoded billing fallback in `billing.js` — show a real error state, not a fake Visa card and invoices.
6. Implement real account deletion (`privacy.js` currently just calls `alert()`).
7. Fix the hardcoded `localhost:3018` impersonation-stop link in `chat.js`.

### Fix this sprint (P1)
8. Split `admin-api/src/admin.js` into domain route modules, same treatment `tenant-api`'s old `index.ts` already got.
9. Fix the `cleanup` route's cross-service import path (`admin.js:887`).
10. Unify the `/admin/metrics` JWT secret with the rest of the app (`admin.js:1426`).
11. Replace the 5 hardcoded mock admin endpoints with real queries (data these admins are actively making decisions from).
12. Fix the `atob('cookie_auth')` broken-token pattern in `workspace.js` and `developer.js`.
13. Decide whether "Connected Apps" ships real OAuth or gets labeled "Coming Soon" — current fake-connected state is actively misleading.
14. Make Storage Manager and Developer Settings call real backends instead of hardcoded/`setTimeout` fakes.

### Medium-term
15. Confirm backend enforces tenant isolation independent of the client-supplied `?tenant=` param / `hk_api_base` — the frontend gives no guarantee on its own.
16. Move Traefik BasicAuth hash and `PAYMENT_ENCRYPTION_KEY` out of `docker-compose.yml` into `.env`/secrets.
17. Decide the fate of the parallel `app/`/`admin/`/`backend/` stack vs. the `user-portal/`/`admin-panel/`/`tenant-api/`/`admin-api/` stack — maintaining both long-term is a compounding cost.
18. Build a real dashboard (`/dashboard` currently just redirects to `/chat`) and a notification center (neither exists at all).

---

## 6. Scope note

This report focuses on verified, high-signal findings across `admin-api`, `admin-panel`, and `user-portal`, cross-referenced with the platform-wide architecture picture from `AUDIT_README.md`/`full_stack_audit.md`. It does not re-derive the full 25-phase audit those documents already contain (UX inventories, accessibility checklists, feature-completeness matrices, etc.) — those sections are still useful as background reading, just treat their point-in-time claims as unverified until checked against current code the way this document did.
