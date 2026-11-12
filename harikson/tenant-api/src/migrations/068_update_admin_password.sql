-- Migration 068: Secure Administrator Password Initialization & Mandatory Rotation
-- Remediates historical static credentials by enforcing mandatory password change
-- on any administrative account initialized with default or legacy credentials.

UPDATE users 
SET force_password_change = TRUE,
    must_change_password = TRUE,
    failed_login_attempts = 0,
    locked_until = NULL,
    updated_at = NOW()
WHERE (role IN ('admin', 'superadmin', 'founder')
   OR email IN ('admin@harikson.ai', 'admin@neuravolt.cloud'))
  AND (password_hash = '$2b$10$TL8Or0wI9SQl1HXBVczjg.1ylWKI.V6N4bTQmQoOs4lKBpPKrNhuC'
   OR password_hash = '$2b$10$HS3UKoycHHOdkjPKKlD2/e50Ysz32GasGxmOMKIjBNCtkqFBmOrW.'
   OR force_password_change IS TRUE);

-- Clear any stale reset tokens for administrator accounts to prevent token hijacking
DELETE FROM password_reset_tokens
WHERE user_id IN (
    SELECT id FROM users
    WHERE role IN ('admin', 'superadmin', 'founder')
       OR email IN ('admin@harikson.ai', 'admin@neuravolt.cloud')
);

-- Invalidate all existing refresh tokens for administrator accounts to revoke potentially compromised sessions
DELETE FROM refresh_tokens
WHERE user_id IN (
    SELECT id FROM users
    WHERE role IN ('admin', 'superadmin', 'founder')
       OR email IN ('admin@harikson.ai', 'admin@neuravolt.cloud')
);
