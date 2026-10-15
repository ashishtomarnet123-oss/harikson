-- Migration 060: Add PhonePe as a supported payment provider
-- Updates check constraints on payment_providers and subscriptions
-- to allow 'phonepe' alongside 'stripe', 'razorpay', and 'system'.

-- 1. Allow 'phonepe' in payment_providers
ALTER TABLE payment_providers DROP CONSTRAINT IF EXISTS payment_providers_provider_check;

ALTER TABLE payment_providers
    ADD CONSTRAINT payment_providers_provider_check
        CHECK (provider IN ('razorpay', 'stripe', 'phonepe'));

-- 2. Allow 'phonepe' in subscriptions
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_provider_check;

ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_provider_check
        CHECK (provider IN ('stripe', 'razorpay', 'system', 'phonepe'));
