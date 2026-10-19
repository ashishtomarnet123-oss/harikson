# DPDP Privacy Notice, Consent Management & Data Principal Rights System
## Xarwiz AI Platform — Production Architecture & Implementation Guide

### 1. Executive Summary & Objective
This document outlines the architecture, database models, security controls, and operational workflows implemented to align the **Xarwiz AI Platform** with India's **Digital Personal Data Protection Act, 2023 (DPDP Act)** and applicable statutory commencement provisions.

The system replaces scattered, unverified checkboxes with a centralized, purpose-based consent architecture, server-validated notice acknowledgment, an immutable audit event trail, automated personal data export/erasure workflows, and a formal Grievance Redressal mechanism under Section 13.

---

### 2. Statutory Entity & Officer Mapping
Based on verified corporate disclosures:
- **Data Fiduciary**: Xarwiz Technologies LLP
- **Registered Corporate Address**: House No 2, Sai Dham Colony, DD Nagar, Gwalior, Madhya Pradesh - 474005, India
- **Designated Grievance Officer (Section 13)**: Ashish Pratap Singh Tomar
- **Grievance Redressal Email**: `grievance@xarwiz.com`
- **Data Protection & Privacy Office**: `privacy@xarwiz.com`
- **Infrastructure & Data Hosting Region**: India (asia-south2, GCP Mumbai/Delhi & Self-Hosted Ollama Nodes)

---

### 3. Core Database Schemas & Migrations
Applied via Migration `063_dpdp_privacy_consent_and_rights.sql`:

#### 3.1 `privacy_notices`
Maintains versioned published notices.
- `id` (UUID PK)
- `version` (VARCHAR UNIQUE, seeded `1.0` archived, `2.0-dpdp` published)
- `title` (VARCHAR)
- `effective_date` (TIMESTAMPTZ)
- `summary` (TEXT)
- `content_json` (JSONB: fiduciary details, security standards, grievance officer)
- `status` (`draft`, `published`, `archived`)
- `published_by` (VARCHAR)

#### 3.2 `consent_purposes`
Master registry of processing purposes, legal bases, and withdrawal behaviors.
- `id` (VARCHAR PK):
  - `service_processing`: Contractual Necessity (Mandatory; account deletion required to cease)
  - `marketing_emails`: Consent (Optional; unbundled; opt-in only)
  - `product_updates`: Legitimate Uses (Optional operational announcements)
  - `analytics`: Consent (Optional diagnostic telemetry)
  - `third_party_ai_processing`: Consent (Optional; controls external provider routing vs local Ollama)
- `legal_basis` (`contractual_necessity`, `consent`, `legitimate_uses`, `legal_obligation`)
- `is_required` (BOOLEAN)
- `is_optional` (BOOLEAN)
- `withdrawal_behavior` (TEXT)

#### 3.3 `user_consents`
Active per-user state per purpose.
- `tenant_id` (UUID FK tenants)
- `user_id` (UUID FK users)
- `purpose_id` (VARCHAR FK consent_purposes)
- `status` (`granted`, `declined`, `withdrawn`, `superseded`)
- `notice_version` (VARCHAR)
- `collection_source` (`signup`, `privacy_settings`, `cookie_banner`, `feature_prompt`, `api`)
- `last_changed_at` (TIMESTAMPTZ)
- **Multi-Tenant RLS Policy**: Bound to `app.current_tenant = tenant_id`.

#### 3.4 `consent_audit_events`
Immutable, append-only chronological log of all consent changes.
- `tenant_id`, `user_id`, `purpose_id`
- `event_type` (`granted`, `declined`, `withdrawn`, `superseded`)
- `previous_status`, `new_status`
- `notice_version`, `collection_source`
- `ip_address`, `user_agent`, `metadata` (JSONB)
- `created_at` (TIMESTAMPTZ server-generated)
- **Multi-Tenant RLS Policy**: Bound to `app.current_tenant`.

#### 3.5 `privacy_requests`
Workflow tracking for Data Principal Rights (Access/Export, Correction, Erasure, Nomination).
- `tracking_number` (VARCHAR UNIQUE: `DPR-YYYYMMDD-XXXXXX`)
- `tenant_id`, `user_id`
- `request_type` (`access_export`, `correction`, `erasure`, `consent_withdrawal`, `nomination`)
- `status` (`submitted`, `identity_verification`, `under_review`, `approved`, `rejected_with_reason`, `completed`)
- `rejection_reason` (TEXT)
- `export_file_url` (TEXT)
- `resolved_at` (TIMESTAMPTZ)

#### 3.6 `privacy_grievances`
DPDP Act Section 13 public grievance tracking.
- `grievance_number` (VARCHAR UNIQUE: `GRV-YYYYMMDD-XXXXXX`)
- `complainant_name`, `complainant_email`, `complainant_phone`
- `category` (`consent_violation`, `unauthorized_processing`, `delayed_erasure`, `data_inaccuracy`, `security_concern`, `other`)
- `subject`, `description`
- `assigned_officer` (VARCHAR, defaults to Ashish Pratap Singh Tomar)
- `resolution_notes` (TEXT)
- `status` (`submitted`, `acknowledged`, `investigating`, `resolved`, `dismissed_with_reason`)

---

### 4. Application Enforcement & Modules Modified

1. **`tenant-api` (`harikson/tenant-api`)**:
   - `src/services/privacyService.ts`: Core service logic for notices, purposes, user preferences, rights requests, data export packaging, account erasure, grievance management, and cookie logs.
   - `src/routes/privacy.routes.ts`: Endpoints mounted at `/api/privacy` and `/api/v1/privacy`.
   - `src/routes/auth.routes.ts`: Updated `handleRegister` to enforce mandatory prior privacy notice acknowledgment and process unbundled marketing consent into `user_consents` and `consent_audit_events`.
   - `src/validators/auth.schema.ts`: Added validation for `privacyNoticeAcknowledged` and `marketingConsent`.
   - `src/services/email.ts`: Added automated notification dispatch for privacy request tracking and formal grievance redressal acknowledgments.

2. **`user-portal` (`user-portal`)**:
   - `pages/signup.js`: Integrated unbundled consent UI (mandatory policy acknowledgment link + separate unchecked marketing checkbox).
   - `pages/data-rights.js`: Full-featured Data Principal rights portal for instant JSON export, correction, erasure, nomination, and tracking.
   - `pages/grievance.js`: Public Section 13 grievance registration & real-time tracking cell with Grievance Officer details.
   - `pages/data-processing.js`: Enterprise Data Processing Addendum (DPA) and Technical & Organizational Measures (TOMs).
   - `pages/privacy.js` & `pages/privacy-policy.js`: Enhanced statutory policy with DPDP 2023 disclosures.
   - `pages/cookies.js` & `pages/cookie-policy.js`: Categorized cookie governance.
   - `pages/privacy-settings.js` & `components/settings/privacy.js`: Purpose-specific toggle switches, audit history, instant export, and account erasure.

3. **`admin-api` (`admin-api`)**:
   - `src/routers/privacy.js`: Governance endpoints for notices, purposes, requests, grievances, and audit inspection mounted at `/admin/privacy` and `/v1/admin/privacy`.
   - `src/admin.js`: Integrated router with role-based admin authorization.

4. **`admin-panel` (`admin-panel`)**:
   - `app/admin/layout.tsx`: Added `Privacy & DPDP` navigation section.
   - `app/admin/privacy/page.tsx`: Notice versioning & purpose governance dashboard.
   - `app/admin/privacy/requests/page.tsx`: Rights request review and determination modal.
   - `app/admin/privacy/grievances/page.tsx`: Grievance assignment and resolution manager.
   - `app/admin/privacy/consents/page.tsx`: Searchable consent audit trail viewer.
