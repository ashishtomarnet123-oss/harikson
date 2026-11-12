# REPORT 15: COMPLETE MISSING FEATURES REGISTER

---

## 1. Confirmed Missing Features (Explicitly Referenced but Absent)

1. **Dedicated Grievance Redressal Form Page (`/grievance`):**
   - *Evidence:* Linked directly from `user-portal/components/settings/privacy.js:387`. The DPDP Act 2023 requires a direct channel for data principals to submit grievances to the designated Grievance Officer.
2. **Interactive Chat Widget JS Distribution (`/api/widget/script.js`):**
   - *Evidence:* `user-portal/pages/developers.js` instructs developers to embed `<script src="https://xarwiz.com/api/widget/script.js">`, but the endpoint returns a 3-line console.log stub instead of the web component chat bundle.
3. **Stand-Alone Settings Sub-Routes (`/settings/billing`):**
   - *Evidence:* Activity logs link to `/settings/billing` when non-paying users attempt to view logs.
4. **Appearance, Language & Help Navigation in Settings Modal:**
   - *Evidence:* Components exist in `user-portal/components/settings/` (`appearance.js`, `language.js`, `help.js`) but are not wired into the sidebar menu.
5. **Cashfree & NeuraCollect Webhook Endpoints on Tenant API Gateway:**
   - *Evidence:* Gateway services exist, but public webhook receivers were omitted from `tenant-api/src/routes/billing.routes.ts`.

---

## 2. Technical Necessities for Enterprise Readiness

1. **Mandatory Row-Level Security on 18 New Tables:** Ensure all tenant data tables enforce PostgreSQL isolation policies.
2. **Strict Cryptographic Edge Middleware in Admin Panel:** Verify JWT signatures in `middleware.ts` before allowing `/admin` page rendering.
3. **Automated Gateway Reconciliation Cron Worker:** Regularly query payment gateways to synchronize pending or failed invoices.
4. **Prometheus Scraper Port Alignment:** Fix scraper to target port 4000 and add tenant-api port 3008.
5. **Mock Test Runner Infrastructure:** Mock database connections in `admin-api/tests` so CI tests can run without live databases.
