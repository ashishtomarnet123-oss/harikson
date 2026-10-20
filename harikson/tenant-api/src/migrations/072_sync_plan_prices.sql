-- 072_sync_plan_prices.sql
-- Sync plan prices to match UI display (Starter: 149, Professional: 999, Enterprise: 2499, Free: 0)

UPDATE plans SET price = 149.00, updated_at = NOW() WHERE id = 'starter';
UPDATE plans SET price = 999.00, updated_at = NOW() WHERE id = 'professional';
UPDATE plans SET price = 2499.00, updated_at = NOW() WHERE id = 'enterprise';
UPDATE plans SET price = 0.00, updated_at = NOW() WHERE id = 'free';
