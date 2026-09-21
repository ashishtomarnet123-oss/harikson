-- Migration 051: Fix users who were auto-assigned Professional plan without purchasing
-- Reset all system-created (non-payment-provider) subscriptions that are on
-- the 'professional' plan back to 'free'.
-- This affects trial subscriptions created by the signup code before the fix.

-- Step 1: Downgrade tenants table
UPDATE tenants
SET plan = 'free', updated_at = NOW()
WHERE plan = 'professional'
  AND id IN (
    -- Only reset tenants whose subscription was created by 'system'
    -- (not by a real payment provider like razorpay/stripe)
    SELECT tenant_id FROM subscriptions
    WHERE plan_id = 'professional'
      AND provider = 'system'
      AND status IN ('active', 'trialing')
  );

-- Step 2: Downgrade subscriptions that were auto-assigned professional by system
UPDATE subscriptions
SET
  plan_id = 'free',
  amount   = 0,
  currency = 'INR',
  current_period_end = NULL,
  status   = 'active',
  updated_at = NOW()
WHERE plan_id = 'professional'
  AND provider = 'system'
  AND status IN ('active', 'trialing');

-- Step 3: Ensure the 'free' plan row exists (idempotent)
INSERT INTO plans (id, name, tier, price, currency, is_active, is_recommended, description)
VALUES ('free', 'Free Plan', 'free', 0.00, 'INR', true, false, 'Starter tier — upgrade to unlock more')
ON CONFLICT (id) DO NOTHING;
