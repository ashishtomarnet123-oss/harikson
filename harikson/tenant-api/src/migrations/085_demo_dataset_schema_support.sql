-- Migration 085: Support full subscription/invoice lifecycle statuses and analytics/user-management indexes

-- 1. Expand subscriptions.status check constraint to include trialing, trial, expired
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status::text = ANY (ARRAY[
    'active'::character varying,
    'trialing'::character varying,
    'trial'::character varying,
    'past_due'::character varying,
    'cancelled'::character varying,
    'expired'::character varying,
    'unpaid'::character varying,
    'paused'::character varying,
    'canceling'::character varying,
    'cancelling'::character varying
  ]::text[]));

-- 2. Expand invoices.status check constraint to include failed, unpaid, refunded, pending
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status::text = ANY (ARRAY[
    'draft'::character varying,
    'open'::character varying,
    'paid'::character varying,
    'failed'::character varying,
    'unpaid'::character varying,
    'refunded'::character varying,
    'pending'::character varying,
    'uncollectible'::character varying,
    'void'::character varying,
    'credited'::character varying,
    'pending_payment'::character varying
  ]::text[]));

-- 3. Add performance indexes for 1,500+ customer queries, sorting, and analytics aggregations
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);
CREATE INDEX IF NOT EXISTS idx_users_created_at_desc ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_status ON subscriptions(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_paid_at_status ON invoices(status, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at_status ON invoices(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON activity_logs(user_id, created_at DESC);
