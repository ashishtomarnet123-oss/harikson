# REPORT 10: THIRD-PARTY INTEGRATIONS AND WEBHOOKS AUDIT

---

## 1. Third-Party Integrations Inventory

| Integration | Owning Service File | Purpose | Auth Mechanism | Webhook / Polling | Production Status |
|---|---|---|---|---|:---:|
| **Stripe** | `services/prorationService.ts`, `admin.js` | Credit card payments (Global/USD) | API Secret Key (`sk_live_...`) | Webhook (`/webhooks/stripe`) | Partially Working |
| **Razorpay** | `services/phonepe.service.ts`, `admin.js` | UPI & Card payments (India) | Key ID & Key Secret | Webhook (`/webhooks/razorpay`) | Working |
| **PhonePe** | `services/phonepe.service.ts` | Indian UPI Gateway | Merchant ID, Salt Key, Salt Index | Webhook (`/webhooks/phonepe`) | Working |
| **Cashfree** | `services/cashfree.service.ts` | Indian PG / Payouts | App ID & Secret Key | Webhook (`/webhooks/cashfree`) | **Blocked (404)** |
| **NeuraCollect** | `services/neuracollect.service.ts` | Custom In-house PG | API Key & HMAC SHA256 | Webhook (`/webhooks/neuracollect`) | **Blocked (404)** |
| **Resend / SMTP**| `admin-api/src/services/email.js` | Transactional email delivery | Resend API Key / SMTP TLS | Webhook (`/webhooks/email`) | Working |
| **Google Drive** | `services/googleDriveService.ts` | Google Workspace docs sync | OAuth 2.0 PKCE | Background BullMQ Sync | Working |
| **GitHub** | `services/githubService.ts` | Codebase indexing & repo tree | Personal Access Token / OAuth | On-demand REST queries | Working |
| **Notion** | `services/notionService.ts` | Team wiki & docs sync | Internal Integration Token | Search & Page sync | Working |
| **Slack** | `services/slackService.ts` | Workspace messaging bot | Bot User OAuth Token (`xoxb-`)| Channel polling | Working |
| **Figma** | `services/figmaService.ts` | Design token extraction | Personal Access Token | REST file inspection | Working |

---

## 2. Webhook Implementation & Architectural Defects

### A. Critical Reverse Proxy Webhook 404 Routing Defect
- **Location:** `user-portal/next.config.js:63` vs `harikson/tenant-api/src/index.ts`
- **Issue:**
  In `user-portal/next.config.js`, all incoming webhooks hitting `xarwiz.com/webhooks/:path*` are rewritten to `tenantApiUrl` (`http://tenant-api:3008/webhooks/:path*`).
  However, in `harikson/tenant-api/src/index.ts`, `billingRoutes` is only mounted at `/api/billing` and `/api/v1/billing`.
  There is **no top-level `app.use('/webhooks', billingRoutes)` mount**!
- **Consequence:** When external payment gateways send callbacks to `https://xarwiz.com/webhooks/stripe`, `https://xarwiz.com/webhooks/razorpay`, or `https://xarwiz.com/webhooks/cashfree`, the reverse proxy forwards them to `http://tenant-api:3008/webhooks/*`, which returns **HTTP 404 Not Found**! Subscriptions fail to activate, and customers remain stuck in pending states.

### B. Cashfree & NeuraCollect Route Omission in Tenant API
- While Stripe, Razorpay, and PhonePe webhooks are declared in `harikson/tenant-api/src/routes/billing.routes.ts`, the webhook handlers for Cashfree and NeuraCollect exist **only in `admin-api/src/admin.js`**.
- Because Traefik routes public webhook traffic to `tenant-api`, Cashfree and NeuraCollect webhooks can never reach `admin-api`, resulting in permanent failure of these two payment methods in production.
