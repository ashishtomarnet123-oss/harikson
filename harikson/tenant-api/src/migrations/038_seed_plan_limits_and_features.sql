-- Migration 038: plans.token_limit was never set for the 4 seeded plans
-- (migration 032 seeded name/price/tier but left token_limit at its -1
-- default), plans has no storage-limit column at all, and plans.features
-- was never populated either — so GET /billing (user.routes.ts) has had
-- nothing real to read for usage limits or the current plan's feature
-- list, which is exactly why that endpoint fell back to hardcoded fake
-- numbers (2,450/10,000 messages, 14.5GB/100GB, a fixed 3-item feature
-- list) regardless of which plan a tenant was actually on.
--
-- Values below match what user-portal/components/settings/billing.js's
-- PLANS constant already advertises in the Change Plan modal — this isn't
-- inventing new limits, just making the already-real, already-sold plan
-- specs queryable from the same table GET /billing reads.

ALTER TABLE plans ADD COLUMN IF NOT EXISTS storage_limit_gb INTEGER NOT NULL DEFAULT -1;

UPDATE plans SET token_limit = 1000, storage_limit_gb = 1,
  features = '["1,000 AI Messages / mo", "1GB Vector Knowledge Storage", "Community Support"]'::jsonb
  WHERE id = 'free';

UPDATE plans SET token_limit = 5000, storage_limit_gb = 20,
  features = '["5,000 AI Messages / mo", "20GB Vector Knowledge Storage", "Standard Webhooks", "Email Support"]'::jsonb
  WHERE id = 'starter';

UPDATE plans SET token_limit = 10000, storage_limit_gb = 100,
  features = '["10,000 AI Messages / mo", "100GB Document Storage", "Custom Agents & Webhooks", "Priority 24/7 Support"]'::jsonb
  WHERE id = 'professional';

UPDATE plans SET token_limit = -1, storage_limit_gb = 1024,
  features = '["Unlimited AI Messages", "1TB Document Storage", "Dedicated GPU Node", "Custom SLA & DPDP Compliance"]'::jsonb
  WHERE id = 'enterprise';
