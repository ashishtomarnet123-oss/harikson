-- Migration 068: Update admin and superadmin passwords to Surendra@999080
UPDATE users 
SET password_hash = '$2b$10$HS3UKoycHHOdkjPKKlD2/e50Ysz32GasGxmOMKIjBNCtkqFBmOrW.',
    force_password_change = FALSE,
    must_change_password = FALSE,
    updated_at = NOW()
WHERE role IN ('admin', 'superadmin', 'founder')
   OR email IN ('admin@harikson.ai', 'admin@neuravolt.cloud');

-- Clear any stale reset tokens for administrator accounts
DELETE FROM password_reset_tokens
WHERE user_id IN (
    SELECT id FROM users
    WHERE role IN ('admin', 'superadmin', 'founder')
       OR email IN ('admin@harikson.ai', 'admin@neuravolt.cloud')
);

-- Invalidate existing refresh tokens so sessions require re-authentication with new credentials
DELETE FROM refresh_tokens
WHERE user_id IN (
    SELECT id FROM users
    WHERE role IN ('admin', 'superadmin', 'founder')
       OR email IN ('admin@harikson.ai', 'admin@neuravolt.cloud')
);
