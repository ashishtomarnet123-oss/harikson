-- Migration 077: Enforce strict user approval status and revoke all active sessions
-- 1. Ensure status column default is 'pending' on users table
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'pending';

-- 2. Any non-admin user whose status is NULL, empty, or 'pending_approval' must be set to 'pending'
UPDATE users 
SET status = 'pending' 
WHERE role NOT IN ('admin', 'superadmin', 'founder') 
  AND (status IS NULL OR status = '' OR status = 'pending_approval');

-- 3. Invalidate/revoke ALL existing active sessions and refresh tokens immediately
-- This logs out all currently logged-in users across all devices.
DELETE FROM refresh_tokens;

-- 4. Clean user_sessions table if it exists
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN 
    DELETE FROM user_sessions; 
  END IF; 
END $$;
