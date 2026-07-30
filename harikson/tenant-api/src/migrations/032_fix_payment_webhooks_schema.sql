-- Migration 032: payment_webhooks is missing columns that
-- webhookRetryService.ts (enqueueWebhookEvent, handleWebhookRetryJob) has
-- referenced since it was written — provider, status, amount, tenant_name —
-- and its `ON CONFLICT (event_id, provider)` upserts need a composite unique
-- constraint that doesn't exist (migration 023 only added a bare UNIQUE on
-- event_id alone). Without this, every webhook enqueue — Stripe or Razorpay —
-- fails at the database level with "column does not exist" / "no unique or
-- exclusion constraint matching ON CONFLICT specification".

ALTER TABLE payment_webhooks ADD COLUMN IF NOT EXISTS provider VARCHAR(50);
ALTER TABLE payment_webhooks ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'pending';
ALTER TABLE payment_webhooks ADD COLUMN IF NOT EXISTS amount DECIMAL;
ALTER TABLE payment_webhooks ADD COLUMN IF NOT EXISTS tenant_name VARCHAR(255);

-- Backfill provider on any pre-existing rows from the linked payment_providers
-- row where possible, defaulting the rest to 'stripe' (the only provider this
-- table has ever recorded events for prior to this migration) so the column
-- can be made NOT NULL.
UPDATE payment_webhooks pw
SET provider = pp.provider
FROM payment_providers pp
WHERE pw.provider_id = pp.id AND pw.provider IS NULL;

UPDATE payment_webhooks SET provider = 'stripe' WHERE provider IS NULL;

ALTER TABLE payment_webhooks ALTER COLUMN provider SET NOT NULL;

-- Replace the single-column uniqueness with the composite key the app's
-- ON CONFLICT (event_id, provider) clauses actually require.
ALTER TABLE payment_webhooks DROP CONSTRAINT IF EXISTS payment_webhooks_event_id_key;
ALTER TABLE payment_webhooks ADD CONSTRAINT payment_webhooks_event_id_provider_key UNIQUE (event_id, provider);

CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status ON payment_webhooks(status);

-- Also fix a second, adjacent schema-drift bug found while wiring up real
-- Razorpay invoice records: user.routes.ts's GET /billing has always selected
-- `invoice_number as number` from `invoices`, but that column was never
-- created (migration 003 only has `provider_invoice_id`). The query is
-- wrapped in a try/catch that swallows the error, so invoices have always
-- silently rendered as an empty list.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);

-- Third adjacent gap found while wiring up real payments: `plans` has never
-- had any rows seeded (nothing in this migration chain ever inserted into
-- it), yet subscriptions.plan_id is a NOT NULL FK to plans(id) — so any real
-- INSERT INTO subscriptions with a plan id like 'starter' would fail with a
-- foreign key violation. Seed the four plans user.routes.ts's PLAN_CONFIG
-- and user-portal's billing UI already reference by id.
INSERT INTO plans (id, name, tier, price, currency, is_active, is_recommended, description)
VALUES
  ('free', 'Free Plan', 'free', 0.00, 'INR', true, false, 'Starter tier for evaluation'),
  ('starter', 'Starter Plan', 'starter', 19.00, 'INR', true, false, 'For growing teams'),
  ('professional', 'Professional Plan', 'professional', 49.00, 'INR', true, true, 'Most popular plan'),
  ('enterprise', 'Enterprise Tier', 'enterprise', 199.00, 'INR', true, false, 'Scale & governance')
ON CONFLICT (id) DO NOTHING;
