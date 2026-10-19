-- Migration 062: Add NeuraCollect as a supported payment provider
-- Updates check constraints on payment_providers and subscriptions
-- to allow 'neuracollect' alongside 'stripe', 'razorpay', 'phonepe', 'cashfree', and 'system'.

-- 1. Allow 'neuracollect' in payment_providers
ALTER TABLE payment_providers DROP CONSTRAINT IF EXISTS payment_providers_provider_check;

ALTER TABLE payment_providers
    ADD CONSTRAINT payment_providers_provider_check
        CHECK (provider IN ('razorpay', 'stripe', 'phonepe', 'cashfree', 'neuracollect'));

-- 2. Allow 'neuracollect' in subscriptions
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_provider_check;

ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_provider_check
        CHECK (provider IN ('stripe', 'razorpay', 'system', 'phonepe', 'cashfree', 'neuracollect'));
