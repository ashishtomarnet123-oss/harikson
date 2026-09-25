-- Migration 054: Superadmin User Credential Management
-- Adds audit columns, must_change_password flag, and performance indexes

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_by VARCHAR(255);

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_users_must_change_pwd ON users(must_change_password) WHERE must_change_password = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_force_pwd_change ON users(force_password_change) WHERE force_password_change = TRUE;
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log(target_type, target_id);
