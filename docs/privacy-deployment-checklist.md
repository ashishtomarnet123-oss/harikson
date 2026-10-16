# DPDP Production Deployment Checklist & Legal Assumptions
## Xarwiz AI Platform — Operations & Legal Review Sign-off

### 1. Deployment Verification Status
All core system components have been implemented, tested, containerized, and deployed to production.

- [x] **Database Migration 063**: Successfully executed on production PostgreSQL (`harikson-postgres`). Created tables:
  - `privacy_notices` (seeded versions `1.0` and `2.0-dpdp`)
  - `consent_purposes` (seeded 5 master purposes)
  - `user_consents` (RLS enforced)
  - `consent_audit_events` (RLS enforced)
  - `privacy_requests` (RLS enforced)
  - `privacy_grievances` (Grievance cell schema)
  - Added `tenant_id` to `cookie_consent_log`
- [x] **Backend Services & APIs**: `harikson/tenant-api` built and deployed with code 0. Endpoints verified:
  - `GET /api/privacy/notice` (200 OK)
  - `GET /api/privacy/purposes` (200 OK)
  - `POST /api/privacy/grievances` (201 Created & Tracking registered)
  - `GET /api/privacy/grievances/:number` (200 OK verified tracking)
  - `POST /api/privacy/cookie-consent` (200 OK)
- [x] **User Portal Compliance Pages**: `user-portal` built and deployed with code 0.
  - `/privacy` & `/privacy-policy` (200 OK)
  - `/cookies` & `/cookie-policy` (200 OK)
  - `/data-rights` (200 OK)
  - `/grievance` (200 OK)
  - `/data-processing` (200 OK)
  - `/privacy-settings` (200 OK)
  - `/signup` (Unbundled consent checkboxes verified)
- [x] **Admin Governance Control Plane**: `admin-api` & `admin-panel` built and deployed with code 0.
  - `/admin/privacy` (Overview & Notice Manager)
  - `/admin/privacy/requests` (Data Principal Rights review)
  - `/admin/privacy/grievances` (Grievance assignment & notes)
  - `/admin/privacy/consents` (Audit event explorer)
- [x] **Automated Regression & Unit Tests**: `harikson/tenant-api/src/tests/privacy-system.test.ts` (7/7 tests passed).

---

### 2. Rollback Strategy
If a rollback of Migration 063 is ever required:
```sql
-- Revert policies
DROP POLICY IF EXISTS tenant_isolation_privacy_requests ON privacy_requests;
DROP POLICY IF EXISTS tenant_isolation_consent_audit_events ON consent_audit_events;
DROP POLICY IF EXISTS tenant_isolation_user_consents ON user_consents;

-- Drop tables in reverse foreign-key order
DROP TABLE IF EXISTS privacy_grievances CASCADE;
DROP TABLE IF EXISTS privacy_requests CASCADE;
DROP TABLE IF EXISTS consent_audit_events CASCADE;
DROP TABLE IF EXISTS user_consents CASCADE;
DROP TABLE IF EXISTS consent_purposes CASCADE;
DROP TABLE IF EXISTS privacy_notices CASCADE;
```

---

### 3. Decisions & Items Requiring Legal / Business Sign-off

The following items are configured with standard, verified defaults but should be reviewed with qualified Indian legal counsel prior to formal statutory certification:

1. **Grievance Officer Designation**:
   - Currently configured as **Ashish Pratap Singh Tomar** (`grievance@xarwiz.com`).
   - *Action*: Confirm whether an alternate officer or additional deputy officers should be registered.
2. **Significant Data Fiduciary (SDF) Assessment**:
   - Under Section 10 of the DPDP Act 2023, the Central Government may notify certain entities as "Significant Data Fiduciaries" based on volume and sensitivity of personal data, which triggers mandatory appointment of an independent Data Protection Officer (DPO) based in India, periodic data audits, and Data Protection Impact Assessments (DPIA).
   - *Status*: Xarwiz currently operates under standard Data Fiduciary obligations. Legal counsel should evaluate whether user volume requires formal SDF compliance filings once notified rules take effect.
3. **Data Localization Criteria**:
   - Xarwiz hosts primary database storage in GCP India (`asia-south2`). Model inference defaults to local Ollama nodes within India. Counsel should verify any specific cross-border restriction lists published by the Central Government under Section 16 of the DPDP Act.
4. **Statutory Response Timelines**:
   - System currently sets a default 30-day resolution SLA on DPR requests. Specific operational rules under DPDP will prescribe exact response days once notified rules take force; this timeline is configurable via `/admin/privacy`.
