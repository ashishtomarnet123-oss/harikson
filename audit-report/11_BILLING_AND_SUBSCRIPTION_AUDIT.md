# REPORT 11: BILLING, SUBSCRIPTION AND FINANCIAL LOGIC AUDIT

---

## 1. Billing Lifecycle & Pricing Architecture

- **Plan Tiers:** Defined in `plans` table (`free`, `starter`, `professional`, `enterprise`).
  - *Starter:* ₹499/mo ($9/mo) — 2M tokens, 10GB storage, 50 images.
  - *Professional:* ₹1,499/mo ($29/mo) — 10M tokens, 50GB storage, 250 images, API access, audit trail.
  - *Enterprise:* ₹4,999/mo ($99/mo) — Unlimited tokens, 500GB storage, 1,000 images, custom models, SLA.
- **GST / Tax System:** `tax_rates` table stores regional rates. Migration 022 implements Indian GST (18% standard IGST / CGST+SGST split).
  - Monthly tax reporting endpoint: `GET /v1/admin/reports/gstr1`.

---

## 2. Critical Financial Bugs & Exploits

### A. Free Enterprise Plan Upgrade Exploit
- **Finding ID:** `FIN-001` (Severity: **P0 – Critical**)
- **File:** `harikson/tenant-api/src/routes/billing.routes.ts:608` & `services/prorationService.ts:94-219`
- **Code Trace:**
  1. Caller issues `POST /api/billing/change-plan` with `{ newPlanId: "enterprise" }`.
  2. Handler has **zero user authentication checks** (`req.user` is never verified).
  3. Handler invokes `executePlanChange(tenantId, "enterprise")`.
  4. `executePlanChange` calculates proration and executes:
     ```typescript
     // services/prorationService.ts:150
     await pool.query(
       `INSERT INTO invoices (tenant_id, subscription_id, invoice_number, amount, currency, status, tax_amount, total, created_at, paid_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
       [tenantId, currentSub?.id, invoiceNumber, proration.netAmount, currency, 'paid', 0, proration.netAmount]
     );
     await pool.query(`UPDATE tenants SET plan = $1 WHERE id = $2`, ['ENTERPRISE', tenantId]);
     ```
  5. The function inserts an invoice marked **`paid`** and sets the tenant plan to **`ENTERPRISE`** without contacting any payment gateway!
- **Financial Impact:** Complete revenue bypass. Any registered user can instantly upgrade to an Enterprise tier for ₹0 and obtain a valid-looking paid invoice PDF.

### B. Arbitrary Account Credit Generation
- **Finding ID:** `FIN-002` (Severity: **P0 – Critical**)
- **Code Trace:** In `services/prorationService.ts:169`, when `proration.netAmount < 0` (downgrade):
  ```typescript
  const creditAmount = Math.abs(proration.netAmount);
  await pool.query(
    `UPDATE tenants SET plan = $1, metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('account_credit', COALESCE((metadata->>'account_credit')::numeric, 0) + $2) WHERE id = $3`,
    [newPlanId.toUpperCase(), creditAmount, tenantId]
  );
  ```
  An attacker can upgrade to Enterprise (for free), then downgrade to Free, accumulating thousands of rupees of balance credit in `tenants.metadata->'account_credit'` on repeat cycles!
