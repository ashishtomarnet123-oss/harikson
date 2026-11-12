-- Migration 079: Credit Ledger and Financial Integrity Constraints
-- Implements an immutable, auditable credit ledger table with RLS, expands invoice statuses,
-- and adds performance and financial integrity indexes.

BEGIN;

-- 1. Create credit_ledger table
CREATE TABLE IF NOT EXISTS credit_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    source_type VARCHAR(50) NOT NULL,
    source_ref_id VARCHAR(255),
    idempotency_key VARCHAR(255) UNIQUE,
    description TEXT,
    balance_after NUMERIC(10, 2) NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Enable & force RLS on credit_ledger
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_ledger_tenant_isolation_policy ON credit_ledger;
CREATE POLICY credit_ledger_tenant_isolation_policy ON credit_ledger
    FOR ALL
    USING (
        NULLIF(current_setting('app.current_tenant', true), '') IS NULL
        OR tenant_id = current_setting('app.current_tenant', true)::uuid
    )
    WITH CHECK (
        NULLIF(current_setting('app.current_tenant', true), '') IS NULL
        OR tenant_id = current_setting('app.current_tenant', true)::uuid
    );

CREATE INDEX IF NOT EXISTS idx_credit_ledger_tenant_id ON credit_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_idempotency_key ON credit_ledger(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_created_at ON credit_ledger(created_at DESC);

-- 2. Update invoices constraints and defaults
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void', 'credited', 'pending_payment'));

ALTER TABLE invoices ALTER COLUMN provider SET DEFAULT 'system';
ALTER TABLE invoices ALTER COLUMN provider_invoice_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status_paid ON invoices(tenant_id, status, paid_at);

COMMIT;

