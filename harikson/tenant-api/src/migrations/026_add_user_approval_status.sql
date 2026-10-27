-- Migration 026: Add status column to users table for invite-only / admin approval flow
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'pending';

-- Update pre-existing user records with NULL status to 'active'
UPDATE users SET status = 'active' WHERE status IS NULL;

-- Index for fast status queries
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
