# Data Retention & Legal Hold Matrix
## Xarwiz AI Platform — Statutory Retention Standards

This matrix documents the retention periods, statutory exceptions, and deletion behaviors for all categories of personal data processed across Xarwiz, aligned with India's **DPDP Act 2023**, **Information Technology (Intermediary Guidelines) Rules 2021**, **CERT-In Cyber Security Directions (2022)**, and Indian financial laws.

---

### 1. Data Category Retention Schedule

| Data Category | Purpose & Lawful Basis | Primary Storage Location | Default Retention Period | Deletion Trigger / Post-Termination Action |
| :--- | :--- | :--- | :--- | :--- |
| **Account Credentials & Profile** (Name, email, hashed password, phone) | Account authentication, workspace operations (`contractual_necessity`) | PostgreSQL (`users`, `tenants`) | Duration of active subscription + 30 days grace | Erased upon account erasure request or 30 days post-cancellation. |
| **Conversation History & Chat Prompts** (User queries, assistant responses) | Providing conversational AI interface (`contractual_necessity`) | PostgreSQL (`conversations`, `messages`) | Duration of active user session; user configurable (indefinite, 30d, 90d, 1y) | Erased on user manual clear, conversation deletion, or account erasure. |
| **Uploaded Documents & Knowledge Bases** (PDFs, docs, embeddings) | RAG document search & index generation (`contractual_necessity`) | Encrypted filesystem & pgvector embeddings | Duration of active workspace document index | Immediate soft-delete; vector chunks purged from disk within 30 days. |
| **Consent & Audit Records** (Grant, decline, withdrawal events) | Compliance accountability & proof of lawful processing (`legal_obligation`) | PostgreSQL (`user_consents`, `consent_audit_events`) | 5 years from date of consent withdrawal or account termination | **Retained**: Immutable regulatory record under DPDP Section 6 for statutory accountability. |
| **Financial & Tax Records** (Invoices, GSTIN, payment identifiers) | Statutory tax compliance & accounting (`legal_obligation`) | PostgreSQL (`invoices`, `subscriptions`, Razorpay/Cashfree) | **8 years** from end of relevant financial year | **Retained**: Mandatory under Section 128 of Indian Companies Act 2013 and GST regulations. |
| **System Security & Traffic Logs** (IP address, login timestamps, proxy traces) | Platform security, abuse prevention (`legal_obligation`) | Application logs & Traefik access records | **180 days** | **Retained**: Mandatory under CERT-In Directions 2022 and IT Rules 2021. Automatically rotated. |
| **Privacy Grievances & Rights Requests** (DPR & GRV records, notes) | Dispute resolution & regulatory compliance (`legal_obligation`) | PostgreSQL (`privacy_requests`, `privacy_grievances`) | 3 years following resolution | Retained for inspection by Data Protection Board of India. |
| **Cookie Preferences** (Log of accepted categories) | Compliance demonstration (`legal_obligation`) | PostgreSQL (`cookie_consent_log`) | 1 year | Overwritten upon preference renewal or purged after 1 year. |

---

### 2. Statutory Retention Exceptions (DPDP Section 12)
Section 12 of the DPDP Act provides that a Data Fiduciary must erase personal data upon withdrawal of consent unless retention is necessary for compliance with any law for the time being in force.

The following exceptions apply to account erasure requests on Xarwiz:
1. **Taxation & Corporate Records**: Financial invoices, receipts, and payment transactions are retained for the statutory 8-year requirement under Section 128 of the Companies Act, 2013, with non-essential PII minimized.
2. **Cybersecurity & CERT-In Logs**: Access logs, user authentication timestamps, and IP addresses are retained for the prescribed 180-day period under Rule 3(1)(h) of the Information Technology Rules, 2021 and CERT-In directions.
3. **Legal Hold Enforcement**: If an active legal hold is placed on a tenant workspace by an authorized administrator (via `/admin/tenants/legal-holds`), automated and manual deletion requests are suspended until the hold is formally lifted.
