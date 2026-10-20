-- 072_sync_plan_prices.sql
-- Sync plan prices to match UI display (Starter: 19, Professional: 49, Enterprise: 199, Free: 0)

UPDATE plans SET price = 19.00, updated_at = NOW() WHERE id = 'starter';
UPDATE plans SET price = 49.00, updated_at = NOW() WHERE id = 'professional';
UPDATE plans SET price = 199.00, updated_at = NOW() WHERE id = 'enterprise';
UPDATE plans SET price = 0.00, updated_at = NOW() WHERE id = 'free';
