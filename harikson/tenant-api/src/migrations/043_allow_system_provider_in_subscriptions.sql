-- Migration 043: Allow 'system' provider for trial subscriptions
-- The registration flow inserts provider='system' for 14-day trial plans.
-- The original CHECK constraint only allowed 'stripe' and 'razorpay',
-- causing trial creation to silently fail (swallowed by .catch(() => {})).

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_provider_check;

ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_provider_check
        CHECK (provider IN ('stripe', 'razorpay', 'system'));
