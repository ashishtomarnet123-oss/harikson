# REPORT 8: DATABASE AND DATA ARCHITECTURE AUDIT

**Database Engine:** PostgreSQL 15 with `pgvector` extension  
**Migrations Executed:** 77 Sequential SQL Migrations (`001_initial_schema.sql` to `077_secure_password_reset_function.sql`)  
**Total Database Tables:** 78 Tables  
**Total Indexes:** 133 Performance and Integrity Indexes  
**Total Row-Level Security (RLS) Policies:** 51 Active Policies  

---

## 1. Schema & Multi-Tenancy Architecture

Xarwiz employs a pooled multi-tenancy model where tenant records reside in shared tables differentiated by a UUID `tenant_id` foreign key. Row-Level Security (RLS) policies filter rows based on PostgreSQL session settings (`app.current_tenant`).

```sql
-- Standard RLS Policy Pattern in Xarwiz
CREATE POLICY tenant_isolation_policy ON <table>
FOR ALL USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
```

To prevent connection pooling leakage, `harikson/tenant-api/src/db/pool.ts` wraps all database operations inside `executeTenantQuery()`, setting `app.current_tenant` upon checkout and clearing it to `''` before releasing the connection back to the pool.

---

## 2. Critical Database Vulnerabilities & Integrity Risks

### A. 18 Tables Missing Row-Level Security (RLS)
While core tables (messages, conversations, users, documents, workflows) have `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`, **18 newer tables created in migrations 024 through 075 completely lack RLS policies**:
1. `tenant_custom_models` (Migration 067)
2. `support_tickets` (Migration 065)
3. `privacy_grievances` (Migration 063)
4. `conversation_shares` (Migration 056)
5. `user_passkeys` (Migration 024)
6. `user_developer_configs` (Migration 031)
7. `user_profile_events` (Migration 023)
8. `cookie_consent_log` (Migration 021)
9. `payment_webhooks` (Migration 023)
10. `workflow_templates` (Migration 053)
11. `career_applications` (Migration 075)
12. `contact_submissions` (Migration 075)
13. `founder_dashboard_state`
14. `founder_dashboard_access_log`
15. `founder_hypotheses`
16. `founder_narrative_mentions`
17. `founder_opportunities`
18. `founder_threats`

*Impact:* Any query executed on these tables without an explicit `WHERE tenant_id = $X` clause bypasses tenant isolation completely, leaking cross-tenant data.

### B. Financial Ledger & Invoice Synchronization
- Invoices are stored in the `invoices` table with columns: `tenant_id`, `subscription_id`, `invoice_number`, `amount`, `currency`, `status`, `tax_amount`, `total`, `created_at`, `paid_at`.
- *Defect:* In `prorationService.ts`, when plan changes occur, invoices are inserted with hardcoded `tax_amount = 0` and `status = 'paid'` without recording payment provider transaction IDs (`payment_intent_id` / `order_id`), breaking GSTR-1 GST tax reconciliation reporting.

---

## 3. Query Performance & Indexing Analysis

- **Vector Search Indexing:** `document_embeddings` leverages an IVFFlat index on `embedding vector(1536)` with cosine distance (`vector_cosine_ops`).
  - *Recommendation:* When vector rows exceed 50,000, migrate from `ivfflat` to `hnsw` (Hierarchical Navigable Small World) for higher recall accuracy and sub-50ms search latency without periodic index rebuilding.
- **Foreign Key Indexing:** Foreign key indexes are properly established on high-cardinality tables (`idx_messages_conversation`, `idx_conversations_user`, `idx_invoices_tenant`).
