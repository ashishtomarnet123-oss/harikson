# Data Flows & Processor Architecture
## Xarwiz AI Platform — DPDP Data Protection Mapping

### 1. Data Collection & Signup Lifecycle
```
[User Browser]
       │
       ▼
[POST /api/v1/auth/register]
       │
       ├─► 1. Validate mandatory Privacy Policy acknowledgment (DPDP Section 5)
       ├─► 2. Validate unbundled optional marketing consent checkbox
       ├─► 3. Provision isolated Tenant & User record
       ├─► 4. Insert user_consents for 'service_processing' (Contractual Necessity)
       ├─► 5. Insert user_consents for 'marketing_emails' (Granted or Declined)
       └─► 6. Append immutable entries to consent_audit_events
```

---

### 2. AI Inference & Prompt Data Flow
Because Xarwiz operates an AI inference and RAG platform, personal data within prompts and uploaded knowledge bases requires strict compartmentalization:

```
[User Prompt / File Upload]
       │
       ▼
[tenant-api Gateway (TLS 1.3)]
       │
       ├─► PostgreSQL Database (Row-Level Security: app.current_tenant)
       │       ├─► Documents encrypted at rest (AES-256)
       │       └─► Ephemeral chunk vectorization (pgvector)
       │
       ▼ Check 'third_party_ai_processing' Purpose Consent
       │
       ├──► IF GRANTED:
       │        └─► Routes inference to selected Enterprise Model Provider (OpenAI, Anthropic)
       │            Subject to Zero Data Retention & No Training agreements.
       │
       └──► IF WITHDRAWN / DECLINED (Default):
                └─► Routes strictly to Self-Hosted Ollama Nodes within India.
                    Zero outbound cross-border transfer. Zero prompt storage on inference GPU.
```

---

### 3. Consent Withdrawal & Propagation Flow
When a user withdraws consent for an optional purpose (e.g. `marketing_emails` or `analytics`):
1. **Frontend Action**: User toggles preference switch in `/privacy-settings`.
2. **Server-Side Persistence**: `PUT /api/privacy/preferences` executes transaction.
3. **Database Update**: `user_consents.status` updated to `withdrawn`.
4. **Audit Logging**: New event appended to `consent_audit_events` with client IP and user agent.
5. **Worker Suppression**:
   - `marketing_emails`: Email worker (`services/email.ts`) checks `PrivacyService.isConsentGranted(tenantId, userId, 'marketing_emails')` before dispatching promotional mail. Transactional security/billing alerts remain unaffected.
   - `analytics`: Client-side performance scripts immediately cease transmission.
   - `third_party_ai_processing`: Workspace switches model dropdown to local Ollama models exclusively.

---

### 4. Data Principal Rights Workflow (Access & Erasure)

#### 4.1 Right to Access (Export)
```
[User Request /api/privacy/export-data]
       │
       ▼
[PrivacyService.generateDataExportBundle]
       │
       ├─► Aggregates User Profile, Workspace Meta, Active Consents
       ├─► Attaches Full Consent Audit Trail (Chronological proof)
       ├─► Summarizes Conversation Histories & Uploaded Document Meta
       ├─► Strips Passwords, API Keys, JWT Tokens, and internal hashes
       └─► Streams JSON Attachment: xarwiz_dpdp_export_<uid>_<timestamp>.json
```

#### 4.2 Right to Erasure (DPDP Section 12)
```
[User /api/privacy/erasure]
       │
       ▼
[Identity Verification (Password Compare)]
       │
       ├─► Check Workspace Ownership: If owner with active members, blocks deletion
       │   until ownership is reassigned.
       │
       ├─► PII Anonymization:
       │   - name = 'Erased Data Principal'
       │   - email = 'erased_<uid>_<timestamp>@anonymized.xarwiz.local'
       │   - phone = NULL, avatar_url = NULL, password_hash = 'ERASED'
       │   - status = 'deleted', deleted_at = NOW()
       │
       ├─► Consent Revocation:
       │   - All purposes marked 'withdrawn' in user_consents.
       │   - Append final audit event in consent_audit_events.
       │
       └─► Statutory Retentions:
           - Financial tax invoices retained for 8 years per Indian Tax Law.
           - Regulatory consent withdrawal record retained for DPDP accountability.
```

---

### 5. Third-Party Sub-Processors & Data Transfers

| Processor | Category | Processing Scope | Location | Safeguards |
| :--- | :--- | :--- | :--- | :--- |
| **Google Cloud Platform (GCP)** | Cloud Infrastructure | Host VM, PostgreSQL database, storage | India (asia-south2) | AES-256 at rest, SOC 2, ISO 27001 |
| **Ollama Local Nodes** | AI Model Inference | Prompt token inference | India (Self-Hosted) | In-memory only; no persistent prompt logs |
| **Razorpay / Cashfree / PhonePe** | Payment Gateway | Payment tokenization, invoices | India | PCI-DSS Level 1 compliant |
| **Resend** | Transactional Mail | System notifications, DPR tracking emails | Global Cloud | Encrypted transit, zero marketing usage |
