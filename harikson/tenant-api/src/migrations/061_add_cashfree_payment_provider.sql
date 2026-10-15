-- Migration 061: Add Cashfree as a supported payment provider
-- Updates check constraints on payment_providers and subscriptions
-- to allow 'cashfree' alongside 'stripe', 'razorpay', 'phonepe', and 'system'.

-- 1. Allow 'cashfree' in payment_providers
ALTER TABLE payment_providers DROP CONSTRAINT IF EXISTS payment_providers_provider_check;

ALTER TABLE payment_providers
    ADD CONSTRAINT payment_providers_provider_check
        CHECK (provider IN ('razorpay', 'stripe', 'phonepe', 'cashfree'));

-- 2. Allow 'cashfree' in subscriptions
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_provider_check;

ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_provider_check
        CHECK (provider IN ('stripe', 'razorpay', 'system', 'phonepe', 'cashfree'));
