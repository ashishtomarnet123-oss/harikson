# REPORT 5: COMPLETE ADMIN PANEL AUDIT

**Target Applications:**  
1. `admin-panel` (Next.js 14 App Router, 66 files)  
2. `admin-api` (Express Control Plane Backend, 35 files)  

---

## 1. Module-by-Module Functional Inspection

| Admin Module | Page Path | Status | Backend Integration | Validation & Security Findings |
|---|---|:---:|---|---|
| **Authentication** | `app/admin/login/page.tsx` | **VULN** | Direct Next.js route `/api/auth/login` | **P0 Backdoor:** Hardcoded passwords (`Surendra@999080`, `Admin@1234`) bypass bcrypt. |
| **First Login** | `app/admin/first-login/page.tsx` | Working | `/api-proxy/v1/admin/auth/first-login-reset` | Password policy enforced; one-time token invalidated upon reset. |
| **Dashboard** | `app/admin/dashboard/page.tsx` | Working | `/api-proxy/v1/admin/kpis`, `/system-status` | Renders VM CPU, RAM, active tenants, and system health status. |
| **Tenants & Plans** | `app/admin/tenants/page.tsx` | Working | `/api-proxy/v1/admin/tenants`, `/plans` | Tenant provisioning, plan reassignment, suspension, and quotas. |
| **Users Management** | `app/admin/users/page.tsx` | Working | `/api-proxy/v1/admin/users` | Plan tier override, 2FA reset, password generation, impersonation. |
| **Revenue & MRR** | `app/admin/revenue/page.tsx` | **VULN** | `/api/admin/analytics/*` (Next.js routes) | **P0 Fallback:** Uses hardcoded dev JWT secret string if env var missing. |
| **Email Telemetry** | `app/admin/emails/page.tsx` | Working | `/api-proxy/v1/admin/emails/*` | SMTP configuration, templates CRUD, Bull queue job status, Resend webhook logs. |
| **Workflows** | `app/admin/workflows/page.tsx` | Working | `/api-proxy/v1/admin/workflows` | Administrative workflow supervision, force execution, execution history. |
| **Voice Telemetry** | `app/admin/voice/page.tsx` | Working | `/api-proxy/v1/admin/voice/stats` | TTFA (Time-to-First-Audio), STT/TTS char counts, barge-in rates. |
| **Security & Audits**| `app/admin/security/page.tsx` | Working | `/api-proxy/v1/admin/security`, `/audit-log` | Login lockout, failed attempt rates, tenant legal holds, impersonation audit. |
| **DPDP Privacy** | `app/admin/privacy/*` | Working | `/api-proxy/v1/admin/privacy/*` | Privacy notices, consent ledger, grievance redressal, data rights tracking. |
| **GPU & Capacity** | `app/admin/gpu/page.tsx` | Incomplete| `/api-proxy/v1/admin/gpu` | Hardware stats mock fallback if NVIDIA SMI / Ollama metrics unavailable. |
| **Backups** | `app/admin/backups/page.tsx` | Working | `/api-proxy/v1/admin/backups` | Database snapshot trigger, integrity verification, restore drill logs. |

---

## 2. Critical Admin Security & Authentication Deficiencies

### A. Hardcoded Administrator Backdoors
- **Location:** `admin-panel/app/api/auth/login/route.ts`, Lines 82-86
- **Vulnerability:**
  ```typescript
  const matches = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
  const isDevAdminPass =
    (user.role === 'superadmin' || user.role === 'admin') &&
    (password === 'Surendra@999080' || password === 'Admin@1234' || password === 'Admin@neurovalt@2620');

  if (!matches && !isDevAdminPass) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  ```
- **Severity:** **P0 – Critical**
- **Impact:** Any attacker with knowledge of an administrator's email address can authenticate as `admin` or `superadmin` using one of these three hardcoded strings, completely bypassing bcrypt hash validation.

### B. Unverified Admin Middleware
- **Location:** `admin-panel/middleware.ts`, Lines 6-18
- **Defect:** The edge middleware inspects whether the cookie `admin_token` or `admin_access_token` exists. It **does not verify the JWT cryptographic signature**.
- **Exploitation:** An unauthenticated visitor who sets `document.cookie="admin_token=fake"` bypasses the Next.js edge redirect and gains access to the administrative UI shell.

---

## 3. Admin-to-User Synchronization Verification

1. **Admin Updates Plan Pricing:**
   - *Workflow:* Admin updates plan pricing via `PUT /admin/plans/:id`.
   - *Verification:* The API invalidates Redis cache via `invalidatePlanCache(planId)`. Subsequent calls from `user-portal/pages/pricing.js` fetch updated prices from PostgreSQL. Synchronized correctly.
2. **Admin Suspends Tenant:**
   - *Workflow:* Admin suspends tenant via `POST /admin/tenants/:id/suspend`.
   - *Verification:* `tenants.status` set to `'suspended'`. Tenant resolution middleware in `harikson/tenant-api/src/index.ts` returns HTTP 403 on suspended tenants. Synchronized correctly.
3. **Admin Updates User Role / Impersonation:**
   - *Workflow:* Admin impersonates user via `POST /admin/users/:userId/impersonate`.
   - *Verification:* Generates a scoped impersonation JWT with `is_impersonating: true`. Audit log records action in `impersonation_audit_logs`. Security alert email dispatched to target user via SMTP/Resend. Synchronized correctly.
