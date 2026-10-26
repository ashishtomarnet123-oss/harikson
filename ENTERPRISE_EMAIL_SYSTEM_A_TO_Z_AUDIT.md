# Enterprise Email System Suite — Complete A-to-Z System Audit & Implementation Roadmap

**Report Status:** COMPLETE AUDIT  
**Evaluation Date:** October 24, 2026  
**Auditor Profile:** Principal Software Architect, Senior Full-Stack Engineer, Email Infrastructure Specialist, QA Lead, Security Auditor, DevOps Engineer  
**System Evaluated:** Enterprise Email System Suite (Xarwiz / Harikson Platform)  
**Final Release Decision:** **NOT PRODUCTION READY** (Multiple Confirmed P0 / P1 Release Blockers)

---

## 1. Executive Summary

A comprehensive, evidence-based architectural, functional, security, and operational audit of the **Enterprise Email System Suite** was performed across the complete workspace (`admin-api`, `admin-panel`, `harikson/tenant-api`, and `user-portal`). Every route, database table, service handler, UI component, background worker, configuration file, and test fixture was inspected against live source code and database state.

### Key Inventory & Metric Highlights
- **Components Inspected:** 14 primary sub-modules across 4 applications (`admin-panel`, `admin-api`, `harikson/tenant-api`, `user-portal`).
- **Workflows Traced:** 9 major end-to-end workflows (SMTP Verification, Transactional Password Reset, User Verification & Activation, Admin Approval, Impersonation Alerts, Invoice Receipts & Resend, Custom Broadcast Mailer, Workflow Automation Email Node, and Email Telemetry/Audit Logging).
- **Total Issues Identified:** 14 discrete findings:
  - **CRITICAL (P0):** 3 confirmed release blockers
  - **HIGH (P1):** 4 major defects
  - **MEDIUM (P2):** 4 architectural/validation gaps
  - **LOW (P3):** 3 quality/formatting issues
- **Integrations Status:**
  - *Connected and Verified:* 2 (Database PostgreSQL `smtp_configs`/`email_templates`/`email_logs`, Admin Panel SMTP configuration & testing).
  - *Connected in Code, Runtime Defective:* 2 (Resend SDK in `tenant-api` [unconnected to custom SMTP], Invoice receipt dispatcher [hardcoded Resend bypassing SMTP]).
  - *Mocked / Simulated:* 1 (Workflow Engine `integration.email` node).
  - *Completely Missing:* 3 (Inbound IMAP/SMTP processing, Resend/SMTP delivery webhook event handlers, SPF/DKIM/DMARC automated DNS verification).

---

## 2. Overall System Health and Audit Limitations

### System Health Posture
The platform contains a functioning, modern Admin UI (`admin-panel/app/admin/emails/page.tsx`) and an operational backend SMTP transport in `admin-api/src/services/email.js` with DNS MX fallback resolution. However, the system suffers from **architectural fragmentation**, **severe security exposure of credentials**, and **critical workflow dead-ends**:

1. **Credentials Exposure:** Plaintext storage and HTTP API leakage of SMTP passwords and Resend API keys.
2. **Workflow Dead-End:** User password reset emails send links to `https://xarwiz.com/reset-password?token=...`, but `user-portal/pages/reset-password.js` **does not exist**, resulting in HTTP 404.
3. **Architectural Disconnect:** `tenant-api` has an isolated email service hardcoded exclusively to Resend SDK, lacking `nodemailer`, ignoring the database `smtp_configs` table, and failing to log dispatches into `email_logs`.
4. **Broadcast Scalability Risk:** Broadcast mailer executes an unbounded synchronous `for` loop inside the Express HTTP handler without queueing or background worker delegation.
5. **Regulatory Risk:** Broadcast mailer bypasses DPDP Act 2023 `user_consents` table, emailing users who explicitly opted out of marketing.
6. **Simulated Workflow Automation:** The DAG workflow engine's email node (`integration.email`) is purely a dummy mock that logs a message and returns success without sending an email.

### Audit Limitations
- **Read-Only Inspection:** No production or customer emails were dispatched during this audit.
- **Local Isolated Services:** Redis and PostgreSQL were validated locally. Production mail server (`mail.xarwiz.com`) connection was verified via local non-sending socket handshake only.
- **External Webhooks:** External provider webhook reception (Resend/SendGrid) could not be verified live because no webhook endpoint is registered or implemented in the codebase.

---

## 3. Repository and Component Inventory

| Component | Location | Responsibility | Dependencies | Current Status |
|---|---|---|---|---|
| **Admin Email Dashboard** | `admin-panel/app/admin/emails/page.tsx` | UI for telemetry, templates, custom SMTP configuration, and broadcast mailer | Next.js 14, Lucide, Tailwind | **PARTIAL** (UI functional; connects to `admin-api`) |
| **Admin User Email Actions** | `admin-panel/app/admin/users/page.tsx:184` | Triggers manual approval, welcome, and password reset emails for users | `admin-api` proxy | **PARTIAL** (Functional, but password reset URL is invalid) |
| **Admin Email Service** | `admin-api/src/services/email.js` | Universal email dispatch (Nodemailer SMTP + Resend SDK), DNS MX resolution, template rendering | `nodemailer`, `resend`, `ioredis`, `pg` | **PARTIAL** (`sendInvoiceReceipt` hardcoded to Resend) |
| **Admin Email Endpoints** | `admin-api/src/admin.js:2180-2520` | Telemetry logs, stats, template CRUD, SMTP config, custom broadcast | Express, `pool`, `adminAuth` | **BROKEN / INSECURE** (Leaks secrets in GET, unvalidated inputs) |
| **Tenant Email Service** | `harikson/tenant-api/src/services/email.ts` | Dispatches verification, lockout, password reset, welcome, dunning emails | `resend`, `ioredis` | **DISCONNECTED** (Resend only; ignores SMTP config and logs) |
| **Tenant Auth Email Triggers** | `harikson/tenant-api/src/routes/auth.routes.ts` | Triggers account lockout, verification, password reset, and welcome emails | `tenant-api/email.ts` | **PARTIAL** (Fire-and-forget unawaited promises; broken reset link) |
| **Workflow Email Node** | `harikson/tenant-api/src/services/workflow/nodes/integrations.ts:244` | DAG node handler for `integration.email` | `ExpressionEngine` | **MOCKED / SIMULATED** (Logs and returns dummy success) |
| **Workflow Credential UI** | `user-portal/components/workflow/VisualWorkflowEditor.js:1773` | Visual editor modal to configure SMTP credentials for workflow email node | React, Lucide | **DISCONNECTED** (Backend never uses configured credentials) |
| **User Email Verification** | `user-portal/pages/verify-email.js` | Landing page for user email verification token | `tenant-api/verify-email` | **OPERATIONAL** |
| **User Account Unlock** | `user-portal/pages/unlock-account.js` | Landing page for lockout unlock token | `tenant-api/unlock-account` | **OPERATIONAL** |
| **User Password Reset UI** | `user-portal/pages/reset-password.js` | Landing page to enter new password with token | `tenant-api/reset-password` | **MISSING (404)** (File does not exist in repository) |
| **Email DB Schema** | `harikson/tenant-api/src/migrations/027, 028` | Tables: `email_logs`, `email_templates`, `smtp_configs` | PostgreSQL 16 | **INSECURE** (Stores plaintext passwords) |
| **Email Rate Limiter** | `admin-api/src/services/email.js:293`, `tenant-api/src/services/email.ts:8` | Sliding window rate limiter per recipient (50/hr admin, 20/hr tenant) | Redis | **OPERATIONAL** |
| **Background Scheduler** | `harikson/tenant-api/src/workers/scheduler.ts` | BullMQ worker manager for workflows, summaries, and cleanup | BullMQ, Redis | **MISSING EMAIL QUEUE** (Emails sent in synchronous loops) |

---

## 4. Architecture and End-to-End Data Flow

### High-Level System Architecture

```mermaid
flowchart TB
    subgraph Frontend["Frontend Layer"]
        AP["Admin Panel (Next.js 14)<br/>/admin/emails<br/>/admin/users"]
        UP["User Portal (Next.js 14)<br/>/verify-email<br/>/unlock-account<br/>/forgot-password"]
    end

    subgraph AdminBackend["Admin API (Node.js / Express :4000)"]
        AR["admin.js Routes<br/>/v1/admin/emails/*"]
        AES["services/email.js<br/>Universal Dispatcher"]
        VAL["validators/admin.schema.js<br/>(Imported, but UNUSED)"]
    end

    subgraph TenantBackend["Tenant API (TypeScript / Express :3008)"]
        TR["routes/auth.routes.ts<br/>Registration / Reset / Verify"]
        TES["services/email.ts<br/>(Resend Only - Disconnected)"]
        WFE["Workflow Engine<br/>integration.email (MOCKED)"]
    end

    subgraph Storage["Persistence & Caching"]
        PG[(PostgreSQL Database)<br/>smtp_configs (Plaintext Passwords)<br/>email_templates<br/>email_logs]
        RD[(Redis Cache & Limiter)<br/>ratelimit:emails:*]
    end

    subgraph External["External Transports"]
        SMTP_EXT["Custom SMTP Server<br/>mail.xarwiz.com (Port 587 STARTTLS)"]
        RESEND_EXT["Resend Cloud API<br/>api.resend.com"]
    end

    AP -->|/api-proxy| AR
    AR --> AES
    AES -->|Active Config| PG
    AES -->|Rate Check| RD
    AES -->|Provider == smtp| SMTP_EXT
    AES -->|Provider == resend| RESEND_EXT
    AES -->|Telemetry| PG

    UP -->|/api/auth/*| TR
    TR -.->|Fire-and-forget| TES
    TES -->|Hardcoded Resend Only| RESEND_EXT
    TES -->|Rate Check| RD
    TES -.->|NO LOGS WRITTEN| PG

    WFE -->|DUMMY MOCK - NO CALL| Storage
```

### End-to-End Workflow Traces & Statuses

| Workflow | Path | State Classification | Finding Summary |
|---|---|---|---|
| **1. SMTP Config & Connection Test** | Admin Panel &rarr; `/v1/admin/emails/smtp/test` &rarr; `verifySmtpConnection` &rarr; DNS MX Lookup &rarr; Nodemailer Verify | **CONNECTED AND VERIFIED** | Resolves host candidates (`mail.xarwiz.com`), tests TCP socket and STARTTLS credentials. |
| **2. Save & Activate SMTP Config** | Admin Panel &rarr; `/v1/admin/emails/smtp` &rarr; `handleUpdateSmtpConfig` &rarr; SQL Insert | **CONNECTED IN CODE, SECURITY VULNERABILITY** | Saves active config, but stores `smtp_pass` in plaintext and leaks it in `GET /v1/admin/emails/smtp`. |
| **3. User Registration & Email Verification** | User Portal &rarr; `auth.routes.ts:register` &rarr; `sendVerificationEmail` &rarr; `verify-email.js` &rarr; `auth.routes.ts:verify-email` | **PARTIAL / DISCONNECTED** | Uses Resend only. User is grandfathered with `email_verified=true` on insert, but sent verify link anyway. Redirects to login where pending status blocks with 403. |
| **4. User Password Reset (Tenant)** | User Portal `/forgot-password` &rarr; `auth.routes.ts:forgot-password` &rarr; `sendPasswordReset` &rarr; Email Link | **CRITICAL WORKFLOW FAILURE** | Email contains `https://xarwiz.com/reset-password?token=...`, but `user-portal/pages/reset-password.js` does not exist (404). User cannot reset password. |
| **5. User Password Reset (Admin Initiated)** | Admin Users Table &rarr; `/v1/admin/users/:userId/send-email` (`emailType='password_reset'`) | **CRITICAL WORKFLOW FAILURE** | Admin sends link `https://app.xarwiz.com/reset-password?email=...` missing token parameter entirely. |
| **6. Account Access Approval** | Admin Users &rarr; `/v1/admin/users/:id/status` (`status='active'`) &rarr; `sendAccountApprovalEmail` &rarr; `renderAndSendTemplate` | **CONNECTED AND VERIFIED** | Renders `access_approval` template from DB and dispatches via active SMTP configuration. |
| **7. Invoice Receipt Dispatch** | `invoiceService.js` / Admin Invoice Resend &rarr; `sendInvoiceReceipt` | **PARTIALLY CONNECTED / DEFECTIVE** | Bypasses `sendEmail` universal dispatcher; calls Resend directly with hardcoded BCC. Fails to write to `email_logs`. |
| **8. Custom Broadcast Mailer** | Admin Panel &rarr; `/v1/admin/emails/send-custom` &rarr; `for (email of recipients)` &rarr; `sendEmail` | **CONNECTED IN CODE, SCALABILITY & COMPLIANCE FAILURE** | Synchronous blocking loop in Express handler. No queue. Ignores DPDP marketing consent opt-outs in `user_consents`. |
| **9. Workflow DAG Automation Email** | Workflow Execution &rarr; `EmailNode.execute` &rarr; Logger | **MOCKED / SIMULATED** | Dummy handler logs message and returns fake `dispatched: true` without sending any email. |

---

## 5. Frontend and User Interface Audit

### Page-to-API Mapping

| Page / Screen | Component File | API Endpoint | Method | Backend Handler | UI Action Status | Findings |
|---|---|---|---|---|---|---|
| **Admin Emails — Telemetry Tab** | `admin-panel/app/admin/emails/page.tsx:82` | `/api-proxy/v1/admin/emails/logs` | `GET` | `handleGetEmailLogs` | **WORKS** | Search, filter by status/type, and pagination fully connected to PostgreSQL `email_logs`. |
| **Admin Emails — Telemetry Stats** | `admin-panel/app/admin/emails/page.tsx:84` | `/api-proxy/v1/admin/emails/stats` | `GET` | `handleGetEmailStats` | **PARTIAL** | Stats display correctly, but `invoicesCount` is always 0 due to backend logging omission in `sendInvoiceReceipt`. |
| **Admin Emails — Templates Tab** | `admin-panel/app/admin/emails/page.tsx:102` | `/api-proxy/v1/admin/emails/templates` | `GET` | `handleGetTemplates` | **WORKS** | Lists templates from DB; renders live sandboxed HTML preview in `<iframe>`. |
| **Admin Emails — Create Template Modal** | `admin-panel/app/admin/emails/page.tsx:238` | `/api-proxy/v1/admin/emails/templates` | `POST` | `handleCreateTemplate` | **WORKS** | Creates template with custom placeholders. Missing backend Zod validation. |
| **Admin Emails — Edit Template Modal** | `admin-panel/app/admin/emails/page.tsx:238` | `/api-proxy/v1/admin/emails/templates/:id` | `PUT` | `handleUpdateTemplate` | **WORKS** | Updates name, subject, body_html, and variables. |
| **Admin Emails — Delete Template** | `admin-panel/app/admin/emails/page.tsx:266` | `/api-proxy/v1/admin/emails/templates/:id` | `DELETE` | `handleDeleteTemplate` | **WORKS** | Deletes template record from `email_templates`. |
| **Admin Emails — SMTP Config Form** | `admin-panel/app/admin/emails/page.tsx:114` | `/api-proxy/v1/admin/emails/smtp` | `GET` / `PUT` | `handleGetSmtpConfig` / `handleUpdateSmtpConfig` | **INSECURE** | Loads and updates config. Insecurely receives and displays plaintext password. |
| **Admin Emails — Test SMTP Button** | `admin-panel/app/admin/emails/page.tsx:286` | `/api-proxy/v1/admin/emails/smtp/test` | `POST` | `handleTestSmtpConfig` | **WORKS** | Triggers live verification and updates UI with resolved host. |
| **Admin Emails — Custom Mailer Tab** | `admin-panel/app/admin/emails/page.tsx:131` | `/api-proxy/v1/admin/emails/send-custom` | `POST` | `handleSendCustomMail` | **WORKS (UNSAFE)** | Dispatches direct or broadcast emails. Lacks background progress or queue indicator. |
| **Admin Users — Send User Email** | `admin-panel/app/admin/users/page.tsx:184` | `/api-proxy/v1/admin/users/:userId/send-email` | `POST` | `handleSendUserEmail` | **DEFECTIVE** | Password reset action sends invalid URL without token. |
| **User Portal — Verify Email** | `user-portal/pages/verify-email.js:6` | `/api/auth/verify-email` | `GET` | `auth.routes.ts:/verify-email` | **WORKS** | Validates SHA-256 token hash and updates database. |
| **User Portal — Unlock Account** | `user-portal/pages/unlock-account.js:6` | `/api/auth/unlock-account` | `GET` | `auth.routes.ts:/unlock-account` | **WORKS** | Clears lockout and resets failed login counters. |
| **User Portal — Forgot Password** | `user-portal/pages/forgot-password.js:6` | `/api/auth/forgot-password` | `POST` | `auth.routes.ts:/forgot-password` | **WORKS** | Generates token and dispatches email. |
| **User Portal — Reset Password** | **MISSING FILE** | `/api/auth/reset-password` | `POST` | `auth.routes.ts:/reset-password` | **BROKEN (404)** | Backend endpoint exists, but page is missing in user-portal. User cannot reset password. |
| **Workflow Canvas — SMTP Credentials** | `user-portal/components/workflow/VisualWorkflowEditor.js:1773` | Internal state / Credential Vault | N/A | None | **DISCONNECTED** | User inputs host/port/user/pass, but backend `EmailNode` executes dummy mock. |

---

## 6. Backend API and Business Logic Audit

### API Route Inventory & Contract Matrix

```
[ADMIN-API]
GET    /admin/emails/logs                  [adminAuth] -> Returns paginated dispatch logs
GET    /admin/emails/stats                 [adminAuth] -> Returns aggregate telemetry counts
GET    /admin/emails/templates             [adminAuth] -> Returns all email templates
POST   /admin/emails/templates             [adminAuth] -> Creates email template (Unused Zod schema)
PUT    /admin/emails/templates/:id         [adminAuth] -> Updates email template (Unused Zod schema)
DELETE /admin/emails/templates/:id         [adminAuth] -> Deletes email template
GET    /admin/emails/smtp                  [adminAuth] -> Returns active SMTP config (LEAKS PLAINTEXT PASSWORD)
PUT    /admin/emails/smtp                  [adminAuth] -> Updates SMTP config (Unused Zod schema, Plaintext storage)
POST   /admin/emails/smtp/test             [adminAuth] -> Verifies SMTP socket/auth connection
POST   /admin/emails/send-custom           [adminAuth] -> Broadcasts email (BLOCKING LOOP, IGNORES DPDP CONSENT)
POST   /admin/users/:userId/send-email     [adminAuth] -> Manually sends approval/welcome/reset email
POST   /admin/users/:userId/reset-email-rate-limit [adminAuth] -> Clears Redis rate-limit key

[TENANT-API]
POST   /api/auth/register                  [public]    -> Registers user & dispatches verification email (Resend only)
GET    /api/auth/verify-email              [public]    -> Verifies email token & sends welcome email (Resend only)
POST   /api/auth/forgot-password           [public]    -> Generates token & sends reset email (Resend only)
POST   /api/auth/reset-password            [public]    -> Resets password using token (Frontend missing)
GET    /api/auth/unlock-account            [public]    -> Unlocks account locked by brute-force detector
```

### Business Logic Discrepancies & Code Flaws
1. **Unused Schema Middleware (`admin-api/src/admin.js:59`):**
   `sendEmailSchema` and `smtpConfigSchema` are defined in `admin-api/src/validators/admin.schema.js` and imported at line 59 of `admin.js`, but are **never attached** to any route. Route handlers rely on manual property checks or unvalidated body destructuring.
2. **Template Interpolation Regex Bug (`admin-api/src/services/email.js:271`):**
   `const regex = new RegExp(\`\\\\{\\\\{${key}\\\\}\`, 'g');`
   If a variable key contains regex special characters, `new RegExp` fails. Furthermore, using `string.replace(regex, raw)` allows special replacement sequences (`$$`, `$&`, `$1`) in user data to corrupt rendered templates.
3. **Hardcoded Billing Resend Override (`admin-api/src/services/email.js:506`):**
   `sendInvoiceReceipt` calls `resend.emails.send` directly instead of delegating to `sendEmail`. If the system is operating in SMTP mode, invoice receipts will attempt to connect to Resend using `re_dev_key` and fail.
4. **Misleading Security Alert on 2FA Reset (`admin-api/src/admin.js:1036`):**
   When an administrator resets a user's 2FA, line 1036 calls `sendImpersonationAlert(user.email, ...)`. The dispatched email subject is `"Security Alert: Account Impersonation Access"` and the body states that an administrator has accessed the user's workspace, rather than informing them of a 2FA credential reset.

---

## 7. Email Infrastructure and Delivery Audit

### A. Outbound Email Infrastructure
- **Provider Support:**
  - `admin-api`: Supports Nodemailer SMTP and Resend Cloud SDK via `sendEmail`.
  - `tenant-api`: Hardcoded to Resend Cloud SDK only (`new Resend(...)`). Lacks `nodemailer` package.
- **Active Operational State:**
  - Verified active configuration in database: `smtp_host = 'mail.xarwiz.com'`, `smtp_port = 587`, `smtp_secure = false` (STARTTLS), `from_email = 'noreply@xarwiz.com'`. Socket and authentication confirmed operational.
- **Queueing & Async Delivery:**
  - **COMPLETELY ABSENT.** No BullMQ queue or worker exists for emails.
  - `admin-api/src/admin.js:2464` executes an unbounded synchronous blocking loop for broadcast emails.
  - `tenant-api` executes floating, unawaited fire-and-forget promises (`.catch(...)`).
- **Sender Identity & Headers:**
  - From address is populated from `smtp_configs` (`from_name`, `from_email`).
  - `Reply-To`, `CC`, and `List-Unsubscribe` headers are **not supported**.
  - `BCC` is hardcoded to `billing@xarwiz.com` in `sendInvoiceReceipt`.
- **Attachments:**
  - **NOT IMPLEMENTED.** `sendEmail` does not accept an `attachments` array, performs no MIME attachment encoding, and implements no file size checks.

### B. Inbound Email Infrastructure
- **Status:** **COMPLETELY ABSENT.**
- No IMAP/POP3 polling service, no inbound SMTP daemon, and no inbound parse webhook handlers (e.g. SendGrid Inbound Parse or Postmark Inbound) exist anywhere in the repository.

### C. Domain & Deliverability Configuration
- **DNS Automation:** **ABSENT.** The UI contains static text fields for host and port, but implements no automated DNS queries for SPF (`v=spf1`), DKIM (`k=rsa; p=...`), or DMARC (`v=DMARC1; p=reject`).
- **Host Resolution:** `resolveSmtpHost` in `admin-api/src/services/email.js:17` performs active MX lookups via `dns.promises.resolveMx` when bare domains are supplied.

### D. Email Campaigns and Automation
- **DAG Workflow Engine:** The `integration.email` node in `harikson/tenant-api/src/services/workflow/nodes/integrations.ts:244` is completely mocked. It logs an execution line and returns dummy success. It never sends email.
- **Broadcast Mailer:** Present in `admin-panel/app/admin/emails/page.tsx:131`, but lacks scheduling, batching, pause/resume, and unsubscribe links.

### E. Email Event Lifecycle & Webhooks
- **Delivery, Bounce, & Complaint Webhooks:** **COMPLETELY ABSENT.**
- There are no endpoints to receive Resend webhooks (`email.delivered`, `email.bounced`, `email.complained`) or SMTP delivery status notifications (DSN).
- The `email_logs.status` column is set to `'sent'` upon initial dispatch and is never updated to `'delivered'`, `'bounced'`, or `'complained'`.
- There is no bounce suppression table; invalid addresses will be repeatedly emailed on subsequent broadcasts.

---

## 8. Database, Data Integrity, and Migrations Audit

### Schema Definition & Inspection

```sql
-- Migration 027: email_logs
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recipient VARCHAR(255) NOT NULL,
  email_type VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'sent',
  error_message TEXT,
  resend_id VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration 028: email_templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  available_variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration 028: smtp_configs
CREATE TABLE IF NOT EXISTS smtp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL DEFAULT 'resend',
  resend_api_key VARCHAR(255),
  smtp_host VARCHAR(255),
  smtp_port INT DEFAULT 587,
  smtp_user VARCHAR(255),
  smtp_pass VARCHAR(255), -- INSECURE: Stored in plaintext
  smtp_secure BOOLEAN DEFAULT true,
  from_email VARCHAR(255) DEFAULT 'noreply@neuravolt.cloud',
  from_name VARCHAR(255) DEFAULT 'Neuravolt Cloud',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Data Integrity Findings
1. **Plaintext Password Storage:** `smtp_pass` and `resend_api_key` are stored without encryption in PostgreSQL `character varying` columns.
2. **Orphaned Foreign Keys in Telemetry:** `logEmailDispatch` in `admin-api/src/services/email.js:54` inserts records leaving `tenant_id` and `user_id` permanently `NULL`.
3. **Missing Unique Active Constraint:** Multiple rows in `smtp_configs` can theoretically have `is_active = true` if updated concurrently, as there is no partial unique index (`CREATE UNIQUE INDEX idx_smtp_active ON smtp_configs (is_active) WHERE is_active = true;`).
4. **Missing Suppression Tables:** No schema exists for unsubscribes, spam complaints, or hard bounces.

---

## 9. Authentication, Authorization, and Multi-Tenancy

### Security Assessment
1. **Critical Secret Leakage via API:**
   `GET /admin/emails/smtp` (`admin-api/src/admin.js:2378`) executes `SELECT * FROM smtp_configs WHERE is_active = true` and returns the complete row directly to the client as JSON. Any admin user (or compromised admin token) can read the plaintext SMTP password and Resend API key.
2. **Tenant Isolation Failure:**
   - In `admin-api`, all SMTP configurations are global/system-level. Per-tenant SMTP gateways do not exist.
   - `email_logs` are recorded globally without tenant segmentation.
3. **Rate Limiting:**
   - Protected by Redis sliding-window counters (`ratelimit:emails:${email}`).
   - Admin dispatches correctly implement a bypass flag (`bypassRateLimit = true`) to prevent administrative lockouts.
4. **Input Sanitization:**
   - `escapeHtml` is applied to variables in `renderAndSendTemplate` to mitigate HTML injection / XSS in rendered emails.

---

## 10. Integrations and Connectivity Matrix

| Integration | Configuration Source | Code Adapter | Call Sites | Webhook Handling | Error Handling | Runtime Evidence | Status |
|---|---|---|---|---|---|---|---|
| **Custom SMTP (mail.xarwiz.com)** | Database `smtp_configs` row `ee58582c-...` | `nodemailer` Transport | `admin-api/src/services/email.js:173` | None | DNS MX fallback, socket timeout (5s), retry on auth failure | Verified active connection via port 587 STARTTLS | **FULLY IMPLEMENTED & RUNTIME VERIFIED** |
| **Resend Cloud API** | `smtp_configs` / `process.env.RESEND_API_KEY` | `resend` SDK | `admin-api/src/services/email.js:224`, `tenant-api/src/services/email.ts:5` | None | API error inspection | Configured in code; fallback when dev key active | **IMPLEMENTED, RUNTIME DEFECTIVE** |
| **Redis Rate Limiting** | `process.env.REDIS_URL` | `ioredis` Client | `email.js:294`, `email.ts:9` | N/A | Try/catch fallback to allow send on Redis down | Operational (`ratelimit:emails:*`) | **FULLY IMPLEMENTED & RUNTIME VERIFIED** |
| **PostgreSQL Telemetry** | `process.env.DATABASE_URL` | `pg` Pool | `email.js:56`, `admin.js:2157` | N/A | Try/catch with logger warning | Database tables verified in live Postgres | **FULLY IMPLEMENTED & RUNTIME VERIFIED** |
| **Workflow Email Integration** | Workflow DAG Canvas | `integration.email` node | `integrations.ts:244` | None | None | Logs string to console; returns fake success | **MOCKED / SIMULATED** |
| **Email Delivery Webhooks** | None | None | None | **MISSING** | N/A | No webhook routes defined in `admin-api` or `tenant-api` | **MISSING** |
| **Inbound IMAP/SMTP** | None | None | None | **MISSING** | N/A | No inbound mail processors exist | **MISSING** |

---

## 11. Background Jobs, Queues, and Scheduling

### Worker & Queue Trace Matrix

| Asynchronous Action | Enqueue Site | Queue Name | Worker / Consumer | Retry Policy | Dead Letter Queue | Status |
|---|---|---|---|---|---|---|
| **Transactional Auth Emails** | `tenant-api/src/routes/auth.routes.ts` | None | In-process microtask (`.catch()`) | None | None | **DISCONNECTED / RISKY** (Dropped on restart) |
| **Invoice Receipt Emails** | `admin-api/src/services/invoiceService.js` | None | In-process microtask | 3x Exponential Backoff (1s, 2s, 4s) | None | **PARTIAL** (In-memory retry only) |
| **Custom Broadcast Emails** | `admin-api/src/admin.js:2464` | None | Synchronous HTTP handler | None | None | **CRITICAL ARCHITECTURAL FLAW** (Blocks event loop) |
| **Workflow Automation Emails** | `tenant-api/src/workers/scheduler.ts` | `workflowQueue` | `workflowWorker` | BullMQ default (3 attempts) | `failedQueue` | **MOCKED** (Node code is dummy mock) |
| **Dedicated Email Queue** | N/A | `emailQueue` | **NON-EXISTENT** | N/A | N/A | **MISSING FROM ARCHITECTURE** |

---

## 12. Billing, Quotas, and Usage Accounting

1. **Invoice Receipt Disconnect:**
   When an invoice is generated or resent via `admin-api/src/services/invoiceService.js:84` or `admin-api/src/admin.js:986`, it calls `sendInvoiceReceipt`. This function **hardcodes Resend** and never writes to `email_logs`.
2. **BCC Leakage:**
   `sendInvoiceReceipt` hardcodes `bcc: 'billing@xarwiz.com'`. If an enterprise tenant operates under custom branding, all invoice receipts leak to the platform billing inbox.
3. **Sending Quotas:**
   There are no per-tenant monthly sending quotas or plan-based outbound email limits enforced in the database.

---

## 13. Testing and Quality Assurance

### Executed Test Runs

| Test Suite | Execution Command | Result | Coverage Area | Findings |
|---|---|---|---|---|
| **Email Rate Limiting Unit Test** | `node --test tests/email-rate-limit.test.js` (in `admin-api`) | **3 PASS / 0 FAIL** | Mocked in-memory Map rate limiter | Tests purely synthetic in-memory mocks. Does not test real Redis, real nodemailer, or real endpoints. |
| **Admin Panel Typecheck** | `npx tsc --noEmit` (in `admin-panel`) | **PASS (Exit Code 0)** | Admin frontend TypeScript types | 0 type errors across all admin pages including emails. |
| **SMTP Verification Integration Test** | `scratch/test_smtp.mjs` (Socket handshake) | **PASS** | Socket connection to `mail.xarwiz.com:587` | STARTTLS authentication succeeded (`250 OK`). |
| **Email Integration Tests** | `npm test` | **MISSING** | Backend API endpoints & mailers | **ZERO** integration tests exist for email routes, template rendering, or SMTP sending. |

---

## 14. Performance, Reliability, and Operations

1. **Blocking Event Loop in Broadcast Mailer:**
   `handleSendCustomMail` (`admin-api/src/admin.js:2464-2513`) iterates over every active platform user in a sequential `for (const email of recipients)` loop with `await`. For 1,000 users, this executes 1,000 sequential network requests (DNS lookups + SMTP socket negotiations + database inserts) taking 500–1,500 seconds, resulting in client gateway timeouts (HTTP 504) and thread starvation.
2. **Missing Retry & Backoff on Broadcasts:**
   If the SMTP server throttles connections (e.g. 421 Too Many Connections), failed recipients are added to an error array without exponential backoff or persistent retry.
3. **No Dead-Letter Handling:**
   Failed emails are marked as `status = 'failed'` in `email_logs`, but there is no mechanism to re-queue, inspect, or retry failed messages.

---

## 15. Configuration and Deployment Readiness

1. **Environment Variable Gaps:**
   - `.env.example` lists `RESEND_API_KEY="re_dev_key_placeholder_value"`.
   - `.env.example` **omits all SMTP configuration variables** (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `FROM_EMAIL`, `FROM_NAME`).
2. **Docker Compose Missing Config:**
   - `docker-compose.yml` does not declare or pass SMTP or Resend environment variables into either `admin-api` or `tenant-api` containers.
3. **Missing Startup Validation:**
   Neither backend service validates email configuration during container startup. Missing email credentials fail silently at request time.

---

## 16. Prioritized Issue Register

| Issue ID | Severity | Category | Affected File & Line Number | Root Cause | Impact | Recommended Fix |
|---|---|---|---|---|---|---|
| **SEC-EMAIL-01** | **CRITICAL** | Security | `admin-api/src/admin.js:2379`, `admin-api/src/services/email.js:69`, `028_create_email_templates_and_smtp_configs.sql:23` | Plaintext storage and unredacted `SELECT *` returned in GET API | Compromise of mail server credentials and Resend API keys | Encrypt `smtp_pass` at rest with AES-256-GCM. Redact password (`has_password: true`) in GET responses. |
| **FLOW-EMAIL-01** | **CRITICAL** | Functional | `user-portal/pages/reset-password.js` (MISSING), `harikson/tenant-api/src/routes/auth.routes.ts:692`, `admin-api/src/admin.js:2244` | Reset password page was never created in user portal; admin API generates URL without token | Users clicking password reset links encounter HTTP 404; admin reset is completely non-functional | Create `user-portal/pages/reset-password.js` with token extraction and password submit form; fix admin URL generation. |
| **ARCH-EMAIL-01** | **CRITICAL** | Architecture | `harikson/tenant-api/src/services/email.ts:5`, `harikson/tenant-api/package.json` | Isolated, hardcoded Resend service in `tenant-api` completely disconnected from DB `smtp_configs` | All user auth and dunning emails bypass configured SMTP server and fail if Resend is inactive | Unify email infrastructure into a shared service or migrate `tenant-api` to read `smtp_configs` and use Nodemailer. |
| **PERF-EMAIL-01** | **HIGH** | Performance | `admin-api/src/admin.js:2464-2513` | Sequential blocking `for` loop executing synchronous HTTP/SMTP calls inside Express handler | Gateway timeouts (504), event-loop lag, and incomplete broadcasts during platform announcements | Offload broadcast jobs to BullMQ `emailQueue` with worker concurrency and progress telemetry. |
| **COMP-EMAIL-01** | **HIGH** | Compliance | `admin-api/src/admin.js:2470`, `harikson/tenant-api/src/routes/auth.routes.ts:418`, `063_dpdp_privacy_consent_and_rights.sql:97` | Custom mailer queries all active users without filtering against `user_consents` table | Violation of India DPDP Act 2023 regulations by emailing users who opted out of marketing | Filter broadcast recipients: `INNER JOIN user_consents uc ON u.id = uc.user_id WHERE uc.purpose_id = 'marketing_emails' AND uc.status = 'granted'`. |
| **INT-EMAIL-01** | **HIGH** | Integrity | `harikson/tenant-api/src/services/workflow/nodes/integrations.ts:244-280` | DAG workflow email node is hardcoded to log a console string and return mock success | Workflow automations deceive users by claiming emails were dispatched when nothing was sent | Wire `EmailNode.execute` to the universal email dispatcher using resolved workflow SMTP credentials. |
| **DATA-EMAIL-01** | **HIGH** | Telemetry | `admin-api/src/services/email.js:399-537`, `admin-api/src/admin.js:2192`, `admin-panel/app/admin/emails/page.tsx:49` | `sendInvoiceReceipt` calls Resend directly and omits `logEmailDispatch` | Invoices count is permanently 0 in telemetry; invoice emails fail when SMTP is active | Migrate `sendInvoiceReceipt` to `sendEmail` with `emailType = 'invoice_receipt'` and log dispatch records. |
| **CODE-EMAIL-01** | **MEDIUM** | Validation | `admin-api/src/admin.js:59`, `admin-api/src/validators/admin.schema.js:41-58` | Zod schemas imported at line 59 but never bound to route middleware | Unvalidated inputs for templates, SMTP settings, and custom mailers | Bind `validate(smtpConfigSchema)` and `validate(sendEmailSchema)` to respective routes in `admin.js`. |
| **DELIV-EMAIL-01** | **MEDIUM** | Deliverability | Repository-wide (absence of webhook handlers) | No delivery event or bounce webhook endpoints exist in codebase | Undelivered emails, bounces, and spam complaints are unmonitored; sender reputation degradation | Implement webhook router `/api/webhooks/email` to update `email_logs.status` and record suppressions. |
| **ARCH-EMAIL-02** | **MEDIUM** | Reliability | `harikson/tenant-api/src/routes/auth.routes.ts:175, 448, 693, 762` | Floating unawaited `.catch(...)` promises for transactional emails | In-flight emails permanently lost on pod restart or deployment | Enqueue transactional emails into durable Redis/BullMQ queue before returning HTTP response. |
| **SEC-EMAIL-02** | **MEDIUM** | Security | `admin-api/src/services/email.js:271-277` | Unescaped dynamic regex construction and unhandled `$` replacement tokens in string replace | Potential ReDoS and template rendering corruption | Escape regex variable keys and use replacer function `html.replace(regex, () => safe)`. |
| **UX-EMAIL-01** | **LOW** | UX / Clarity | `admin-api/src/admin.js:1036-1039` | 2FA reset route calls `sendImpersonationAlert` instead of dedicated 2FA reset notification | Users receive terrifying security alerts claiming an admin logged into their account | Create dedicated template and service helper `sendTwoFactorResetAlert`. |
| **DATA-EMAIL-02** | **LOW** | Data Model | `admin-api/src/services/email.js:54-64` | `logEmailDispatch` inserts records leaving `tenant_id` and `user_id` null | Impossible to filter or audit email dispatches by tenant | Pass `tenantId` and `userId` into `logEmailDispatch` and populate foreign keys. |
| **TEST-EMAIL-01** | **LOW** | QA | `admin-api/tests/email-rate-limit.test.js` | Only one unit test exists, which uses local in-memory mocks | Zero integration tests for real SMTP, templates, or delivery flows | Add automated integration test suite with nodemailer test sink and API route coverage. |

---

## 17. Missing Connections and Implementation Gaps

```mermaid
graph LR
    subgraph Present["Implemented Components"]
        UI[Admin Panel Emails Page]
        SMTP_CONF[(PostgreSQL smtp_configs)]
        MAILER[admin-api services/email.js]
    end

    subgraph Missing["Missing / Disconnected Links"]
        GAP1[user-portal/pages/reset-password.js]
        GAP2[tenant-api connection to smtp_configs]
        GAP3[BullMQ emailQueue & Worker]
        GAP4[Webhooks for Bounces & Delivery]
        GAP5[Real Execution in Workflow EmailNode]
        GAP6[AES-256 Encryption for SMTP Secrets]
    end

    UI -->|Saves SMTP| SMTP_CONF
    SMTP_CONF -->|Loaded By| MAILER
    MAILER -.->|MISSING ENCRYPTION| GAP6
    MAILER -.->|BLOCKING LOOP / NO QUEUE| GAP3
    MAILER -.->|NO EVENT FEEDBACK| GAP4
    
    tenant_api[tenant-api auth.routes.ts] -.->|DISCONNECTED FROM SMTP| GAP2
    tenant_api -.->|BROKEN RESET LINK (404)| GAP1
    workflow[Workflow Engine] -.->|MOCKED EXECUTION| GAP5
```

---

## 18. Phased Implementation Roadmap

### Phase 0 — Safety & Critical Release Blockers (P0)
- **Task 0.1 (SEC-EMAIL-01): Encrypt SMTP Passwords & Redact in API**
  - Scope: `admin-api/src/admin.js:2378`, `admin-api/src/services/email.js:69`, `028_create_email_templates_and_smtp_configs.sql`
  - Proposed Change: Encrypt `smtp_pass` and `resend_api_key` using AES-256-GCM before database insert. Return `{ has_password: true, smtp_pass: undefined }` in `GET /v1/admin/emails/smtp`.
  - Risk: High (credential migration). Blocks Release: **YES**.
- **Task 0.2 (FLOW-EMAIL-01): Implement Missing Reset Password Page & Fix URL Generation**
  - Scope: `user-portal/pages/reset-password.js` (create), `harikson/tenant-api/src/routes/auth.routes.ts:692`, `admin-api/src/admin.js:2244`
  - Proposed Change: Create Next.js page accepting `?token=...`, verifying token against `/api/auth/reset-password`. Fix admin user email action to generate valid tokenized URL.
  - Risk: Low. Blocks Release: **YES**.
- **Task 0.3 (ARCH-EMAIL-01): Connect Tenant-API to Universal SMTP Configuration**
  - Scope: `harikson/tenant-api/src/services/email.ts`, `harikson/tenant-api/package.json`
  - Proposed Change: Install `nodemailer` in `tenant-api`. Refactor `tenant-api/src/services/email.ts` to load active configuration from `smtp_configs` and write dispatches to `email_logs`.
  - Risk: Medium. Blocks Release: **YES**.

### Phase 1 — Core Functional Connectivity & Compliance (P1)
- **Task 1.1 (PERF-EMAIL-01): Implement Durable BullMQ Email Queue**
  - Scope: `admin-api/src/admin.js`, `harikson/tenant-api/src/workers/scheduler.ts`
  - Proposed Change: Define `emailQueue` and `emailWorker` with concurrency 5, 3x exponential backoff retry, and DLQ persistence. Replace broadcast `for` loop with batch job enqueueing.
  - Risk: Medium. Blocks Release: **YES**.
- **Task 1.2 (COMP-EMAIL-01): Enforce DPDP Marketing Consent Filtering**
  - Scope: `admin-api/src/admin.js:2470`
  - Proposed Change: Update `handleSendCustomMail` recipient query to filter users by `user_consents.purpose_id = 'marketing_emails' AND status = 'granted'`.
  - Risk: Low. Blocks Release: **YES**.
- **Task 1.3 (INT-EMAIL-01): Connect Workflow Engine Email Node to Real Mailer**
  - Scope: `harikson/tenant-api/src/services/workflow/nodes/integrations.ts:244-280`
  - Proposed Change: Replace dummy mock in `EmailNode.execute` with actual dispatch call via the universal mailer using node-configured SMTP credentials or active system transport.
  - Risk: Low. Blocks Release: **NO**.
- **Task 1.4 (DATA-EMAIL-01): Unify Invoice Receipt Dispatcher & Telemetry**
  - Scope: `admin-api/src/services/email.js:399-537`
  - Proposed Change: Update `sendInvoiceReceipt` to call `sendEmail` with `emailType = 'invoice_receipt'` and log records in `email_logs`. Remove hardcoded Resend call.
  - Risk: Low. Blocks Release: **NO**.

### Phase 2 — Validation, Deliverability & Event Processing (P2)
- **Task 2.1 (CODE-EMAIL-01): Enforce Zod Schema Validation on All Email Endpoints**
  - Scope: `admin-api/src/admin.js:2303, 2326, 2389, 2442, 2463`
  - Proposed Change: Attach `validate(smtpConfigSchema)`, `validate(sendEmailSchema)`, and new `templateSchema` to all admin email routes.
- **Task 2.2 (DELIV-EMAIL-01): Implement Webhook Listener for Bounces & Suppressions**
  - Scope: Create `admin-api/src/routers/emailWebhook.js`, Migration `064_create_email_suppressions_table.sql`
  - Proposed Change: Handle Resend / SendGrid / SMTP DSN webhook events; record bounces and suppressions; update `email_logs.status`.
- **Task 2.3 (SEC-EMAIL-02): Harden Template Engine Against Regex & Replacement Injection**
  - Scope: `admin-api/src/services/email.js:271-277`
  - Proposed Change: Escape variable keys with `lodash.escapeRegExp` and pass replacer function `html.replace(regex, () => safe)`.

### Phase 3 — QA, Observability & Operational Readiness (P3)
- **Task 3.1 (TEST-EMAIL-01): Comprehensive Integration Test Suite**
  - Scope: `admin-api/tests/email-integration.test.js`, `harikson/tenant-api/tests/email-workflow.test.ts`
  - Proposed Change: Automated test suite using a local SMTP test sink verifying SMTP verification, template rendering, rate-limit resets, and broadcast worker execution.
- **Task 3.2 (UX-EMAIL-01): Separate 2FA Reset Alert from Impersonation Alert**
  - Scope: `admin-api/src/services/email.js`, `admin-api/src/admin.js:1036`
  - Proposed Change: Create `sendTwoFactorResetAlert` with clear, non-alarming security messaging.
- **Task 3.3: Environment Variable Documentation & Docker Compose Parity**
  - Scope: `.env.example`, `docker-compose.yml`
  - Proposed Change: Document all SMTP environment variables and pass them to backend containers.

---

## 19. Acceptance Criteria and Release Gates

Before the Enterprise Email System Suite can be certified **READY FOR RELEASE REVIEW**, all following gates must be met:

1. **Gate 0 (Security):** `smtp_pass` and `resend_api_key` are encrypted at rest with AES-256-GCM. `GET /v1/admin/emails/smtp` never returns plaintext passwords in API responses.
2. **Gate 1 (User Flow):** Password reset link dispatched via email renders a functional `user-portal/pages/reset-password.js` page and allows password updates without 404 or missing token errors.
3. **Gate 2 (Architecture):** `harikson/tenant-api` successfully dispatches verification, lockout, and password reset emails through the active SMTP server configured in `smtp_configs`.
4. **Gate 3 (Scalability):** Custom broadcast emails are processed via BullMQ `emailQueue` without blocking the Express HTTP event loop.
5. **Gate 4 (Compliance):** Broadcast emails enforce DPDP `marketing_emails` consent status from `user_consents`.
6. **Gate 5 (Integrity):** Workflow automation `integration.email` node executes real email dispatches using configured credentials.
7. **Gate 6 (Telemetry):** All email dispatches across both `admin-api` and `tenant-api` produce consistent rows in `email_logs`.

---

## 20. Recommended Next Actions

1. **Review Audit Report:** Authorize execution of **Phase 0 (Safety & Critical Release Blockers)**.
2. **Implement Phase 0 Tasks:**
   - Create `user-portal/pages/reset-password.js` to fix the broken password reset flow.
   - Encrypt SMTP passwords at rest and redact in GET responses.
   - Install `nodemailer` in `tenant-api` and connect it to `smtp_configs`.
3. **Deploy BullMQ Email Worker (Phase 1):** Migrate broadcast and transactional emails to background workers.
4. **Add Delivery Event Webhooks (Phase 2):** Ingest bounces and complaints to protect domain reputation.
5. **Run Verification Gate Suite:** Validate all flows with local SMTP sink prior to production release.

---

## 21. Appendix — Executed Commands and Evidence References

```bash
# 1. Verification of Active SMTP Configuration in Database
node -e "import('./src/db.js').then(async ({ default: pool }) => {
  const r = await pool.query('SELECT id, provider, smtp_host, smtp_port, smtp_user, smtp_secure, from_email, is_active FROM smtp_configs WHERE is_active=true');
  console.log(r.rows);
  await pool.end();
});"
# Result: Provider=smtp, Host=mail.xarwiz.com, Port=587, User=noreply@xarwiz.com, is_active=true

# 2. SMTP Socket Connection & STARTTLS Handshake
node -e "
import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({ host: 'mail.xarwiz.com', port: 587, secure: false, auth: { user: 'noreply@xarwiz.com', pass: 'REDACTED' } });
transporter.verify().then(() => console.log('VERIFIED')).catch(e => console.error(e));
"
# Result: VERIFIED (250 OK)

# 3. Unit Test Execution
node --test tests/email-rate-limit.test.js
# Result: 3 passed, 0 failed (duration: 107ms)

# 4. Frontend Type Checking
npx tsc --noEmit
# Result: Exit code 0 (0 errors in admin-panel)

# 5. Verification of Missing Pages
ls user-portal/pages/reset-password.js
# Result: No such file or directory (Confirmed 404 defect)
```

---

## 22. Final Decision

**Status:** **NOT PRODUCTION READY**

**Rationale:** The Enterprise Email System Suite possesses a functional Admin UI and active SMTP transport connection, but suffers from three confirmed critical release blockers: (1) plaintext password exposure in database and API responses (`SEC-EMAIL-01`), (2) a non-existent password reset page causing 100% 404 failure for user password resets (`FLOW-EMAIL-01`), and (3) an architectural split where all tenant-facing authentication emails completely bypass the configured SMTP server (`ARCH-EMAIL-01`). Execution of Phase 0 remediation is required before release.
