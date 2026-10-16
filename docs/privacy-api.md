# DPDP Privacy & Consent API Specification
## Xarwiz AI Platform — REST API Documentation

Base URL: `https://xarwiz.com/api` (or `/api/v1`)
Admin Base URL: `https://xarwiz.com/api-proxy/admin/privacy` (or `/v1/admin/privacy`)

---

### 1. Public Privacy Endpoints

#### `GET /api/privacy/notice`
Returns the active published Privacy Notice or a requested version.
- **Query Parameters**:
  - `version` (optional, string): e.g. `2.0-dpdp` or `1.0`
- **Response `200 OK`**:
```json
{
  "notice": {
    "id": "1bbedc65-dd2d-4d6f-846a-642e23c04e36",
    "version": "2.0-dpdp",
    "title": "Xarwiz Privacy Policy & Data Protection Notice (DPDP 2023)",
    "effective_date": "2026-10-15T18:30:00.000Z",
    "summary": "Production DPDP Act 2023 compliant privacy notice...",
    "content_json": {
      "entity": "Xarwiz Technologies LLP",
      "address": "Sector 62, Noida, Uttar Pradesh, India - 201301",
      "grievance_officer": "Ashish Pratap Singh Tomar",
      "grievance_email": "grievance@xarwiz.com",
      "privacy_email": "privacy@xarwiz.com"
    },
    "status": "published"
  }
}
```

#### `GET /api/privacy/purposes`
Returns list of all active master consent purposes with configured statutory legal bases.
- **Response `200 OK`**:
```json
{
  "purposes": [
    {
      "id": "service_processing",
      "name": "Core Service & Workspace Operation",
      "legal_basis": "contractual_necessity",
      "is_required": true,
      "is_optional": false
    },
    {
      "id": "marketing_emails",
      "name": "Promotional & Educational Communications",
      "legal_basis": "consent",
      "is_required": false,
      "is_optional": true
    }
  ]
}
```

#### `POST /api/privacy/grievances`
Submits a formal grievance to the designated Grievance Officer (Section 13 DPDP Act).
- **Request Body**:
```json
{
  "complainantName": "Ashish Tomar",
  "complainantEmail": "principal@domain.com",
  "complainantPhone": "+91 9876543210",
  "category": "consent_violation",
  "subject": "Withdrawal confirmation delay",
  "description": "Detailed explanation of grievance..."
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Grievance registered successfully with the Xarwiz Grievance Officer.",
  "grievanceNumber": "GRV-20261016-FBE86A",
  "assignedOfficer": "Ashish Pratap Singh Tomar",
  "status": "submitted"
}
```

#### `GET /api/privacy/grievances/:grievanceNumber`
Tracks grievance resolution progress by reference number.
- **Query Parameters**:
  - `email` (optional string): Complainant email verification
- **Response `200 OK`**:
```json
{
  "success": true,
  "grievance": {
    "grievance_number": "GRV-20261016-FBE86A",
    "category": "consent_violation",
    "subject": "Withdrawal confirmation delay",
    "status": "investigating",
    "assigned_officer": "Ashish Pratap Singh Tomar",
    "resolution_notes": null
  }
}
```

#### `POST /api/privacy/cookie-consent`
Logs cookie preference choices into `cookie_consent_log`.
- **Request Body**:
```json
{
  "consentId": "cookie_uuid",
  "categories": {
    "essential": true,
    "analytics": false,
    "marketing": false
  }
}
```

---

### 2. Authenticated Data Principal Endpoints

#### `GET /api/privacy/preferences`
Retrieves the authenticated user's current consent states across all purposes.
- **Headers**: `Authorization: Bearer <token>` or Cookie `hk_access_token`
- **Response `200 OK`**:
```json
{
  "success": true,
  "tenantId": "...",
  "userId": "...",
  "consents": [
    {
      "purpose_id": "service_processing",
      "status": "granted",
      "legal_basis": "contractual_necessity",
      "is_required": true
    },
    {
      "purpose_id": "marketing_emails",
      "status": "declined",
      "legal_basis": "consent",
      "is_required": false
    }
  ]
}
```

#### `PUT /api/privacy/preferences`
Updates one or more purpose preferences, validating required purposes and writing immutable audit events.
- **Request Body**:
```json
{
  "updates": [
    { "purposeId": "marketing_emails", "status": "withdrawn" }
  ],
  "source": "privacy_settings_dashboard",
  "noticeVersion": "2.0-dpdp"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Privacy preferences successfully updated and recorded in compliance audit log.",
  "consents": [ ... ]
}
```

#### `POST /api/privacy/requests`
Submits a Data Principal statutory right request.
- **Request Body**:
```json
{
  "requestType": "access_export",
  "details": {
    "description": "Requesting comprehensive personal data archive"
  }
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Data Principal Rights request submitted successfully.",
  "request": {
    "id": "...",
    "tracking_number": "DPR-20261016-1A2B3C",
    "request_type": "access_export",
    "status": "submitted"
  }
}
```

#### `GET /api/privacy/export-data`
Directly downloads the personal data export JSON bundle.
- **Headers**: `Authorization: Bearer <token>`
- **Response Header**: `Content-Disposition: attachment; filename="xarwiz_dpdp_export_...json"`

#### `POST /api/privacy/erasure`
Initiates account erasure under Section 12 of DPDP Act 2023.
- **Request Body**:
```json
{
  "passwordConfirm": "UserPassword123!",
  "reason": "Exercising DPDP erasure rights"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Account and personal data have been erased in accordance with DPDP Act 2023. Statutory audit exceptions retained."
}
```

---

### 3. Administrative Governance Endpoints (`/admin/privacy/*`)

| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/privacy/stats` | Compliance overview metrics | Superadmin / Compliance Admin |
| `GET` | `/admin/privacy/notices` | List all notice versions | Admin |
| `POST` | `/admin/privacy/notices` | Publish new notice version | Compliance Admin |
| `GET` | `/admin/privacy/purposes` | List master purposes | Admin |
| `POST` | `/admin/privacy/purposes` | Create/Update purpose definition | Superadmin |
| `GET` | `/admin/privacy/requests` | Search/Filter rights requests | Admin / Compliance |
| `PUT` | `/admin/privacy/requests/:id` | Approve/Reject request | Compliance Officer |
| `GET` | `/admin/privacy/grievances` | List formal grievances | Grievance Officer |
| `PUT` | `/admin/privacy/grievances/:id` | Assign officer & record resolution | Grievance Officer |
| `GET` | `/admin/privacy/audit-events` | Inspect immutable audit log | Auditor / Admin |
