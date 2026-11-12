# REPORT 7: COMPLETE API AUDIT

**Total Unique API Routes Audited:** 424 Routes  
- `harikson/tenant-api`: 239 endpoints across 22 domain routers and 6 specialized sub-routers.  
- `admin-api`: 185 endpoints across 5 sub-routers and `src/admin.js`.  

---

## 1. Complete API Route & Method Inventory

| Method | Endpoint Route | Owning Module | Authentication | Authorization / Scopes | Status | Identified Security / Contract Issues |
|:---:|---|---|:---:|:---:|:---:|---|
| **POST** | `/api/v1/auth/login` | Tenant Auth | Public | None | Working | Rate limited (10 req/15min). Issues JWT access & refresh tokens. |
| **POST** | `/api/v1/auth/register` | Tenant Auth | Public | None | Working | Creates tenant and user account in a transaction. |
| **POST** | `/api/v1/auth/refresh` | Tenant Auth | Public | Refresh Token Family | Working | Refresh token rotation; detects token reuse and revokes family. |
| **GET** | `/api/v1/user/profile` | Tenant User | JWT Required | `req.user` | Working | Returns user info, active 2FA status, avatar URL. |
| **GET** | `/api/v1/chat/conversations` | Tenant Chat | JWT Required | `chat:read` | Working | Returns list of user conversations; tenant-isolated. |
| **POST** | `/api/v1/chat` | Tenant Chat | JWT Required | `chat:write` | Working | Enforces token limits, inference queue concurrency, SSE streaming. |
| **POST** | `/api/v1/chat/:id/interrupt` | Tenant Chat | JWT Required | `chat:write` | Working | Aborts active HTTP stream to Ollama backend via AbortController. |
| **POST** | `/api/documents/upload` | Tenant Docs | **BYPASS** | `requireScopes` | **VULN** | `requireScopes` bypass lets unauthenticated users upload files. |
| **GET** | `/api/documents` | Tenant Docs | **BYPASS** | `requireScopes` | **VULN** | Unauthenticated callers can list all tenant documents. |
| **DELETE**| `/api/documents/:id` | Tenant Docs | **BYPASS** | `requireScopes` | **VULN** | Unauthenticated callers can delete tenant documents and embeddings. |
| **GET** | `/api/v1/workflows` | Tenant Workflow| **NONE** | None | **VULN** | Completely unauthenticated; exposes all tenant workflows. |
| **POST** | `/api/v1/workflows` | Tenant Workflow| **NONE** | None | **VULN** | Unauthenticated workflow creation with arbitrary step graphs. |
| **GET** | `/api/v1/workflows/credentials`| Tenant Workflow| **NONE** | None | **VULN** | Exposes tenant third-party integration credential metadata. |
| **POST** | `/api/billing/checkout` | Tenant Billing | JWT Required | `req.user` | Working | Initiates PhonePe, Cashfree, or Razorpay payment order. |
| **POST** | `/api/billing/change-plan` | Tenant Billing | **NONE** | None | **VULN** | Free instant upgrade to Enterprise plan; creates fake paid invoices. |
| **POST** | `/api/billing/reactivate` | Tenant Billing | **NONE** | None | **VULN** | Restores canceled tenant subscriptions without payment. |
| **POST** | `/api/admin/rotate-keys` | Tenant Admin | **NONE** | None | **VULN** | Triggers document encryption key rotation with zero authentication. |
| **POST** | `/api/tools/execute` | Tenant Tools | JWT Required | Sandbox | Working | Sandboxed strictly within tenant directory via `WorkspaceSandbox`. |
| **POST** | `/api/routes/chat` | Legacy Chat | Header Spoofable| `x-user-id` | **VULN** | Trusts `x-user-id` header without verifying JWT signature. |
| **POST** | `/api/routes/documents/crawl`| Legacy Docs | Header Spoofable| `x-user-id` | **VULN** | Trusts `x-user-id` header; crawls arbitrary URLs. |
| **GET** | `/api/v1/images/:id/view` | Tenant Images | Public | None | **VULN** | IDOR vulnerability: views any image ID across any tenant. |
| **GET** | `/api/widget/script.js` | Tenant Widget | Public | None | **INCOMPLETE**| Returns dummy console.log script instead of interactive widget bundle. |
| **POST** | `/admin/login` | Admin API | Public | Bcrypt | Working | Strict rate limiting (5 attempts/10min), enforces password change. |
| **POST** | `/api/auth/login` | Admin Next.js | Public | **BACKDOOR** | **VULN** | Hardcoded passwords bypass bcrypt for admin accounts. |

---

## 2. API Contract & Architectural Disconnects

1. **Missing Webhook Routes on Tenant API:**
   - External callbacks for Cashfree and NeuraCollect are mounted only in `admin-api/src/admin.js`, but Traefik and `user-portal/next.config.js` forward `/webhooks/*` to `tenant-api:3008`, which lacks these routes, producing HTTP 404 errors.
2. **Notification Unread Count Key Discrepancy:**
   - `admin-api/src/routers/operations.js:833` returns `{ unread_count: X }`.
   - `harikson/tenant-api/src/routes/notification.routes.ts:31` returns `{ unreadCount: X }`.
   - Admin frontend expects `unread_count`, but if queried against tenant API returns `undefined`.
