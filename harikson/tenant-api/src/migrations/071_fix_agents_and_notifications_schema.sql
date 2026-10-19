-- Migration 071: Add missing columns to agents and notifications tables

-- 1. Ensure agents table has status column for KPI tracking
ALTER TABLE agents ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- 2. Ensure notifications table has user_id, is_read, and link columns
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(500);

-- Sync any existing records
UPDATE notifications SET is_read = read WHERE is_read IS DISTINCT FROM read;

-- Keep read and is_read in sync
CREATE OR REPLACE FUNCTION sync_notification_read_flags()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.read IS TRUE AND NEW.is_read IS NOT TRUE THEN
      NEW.is_read := true;
    ELSIF NEW.is_read IS TRUE AND NEW.read IS NOT TRUE THEN
      NEW.read := true;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.read IS DISTINCT FROM OLD.read THEN
      NEW.is_read := NEW.read;
    ELSIF NEW.is_read IS DISTINCT FROM OLD.is_read THEN
      NEW.read := NEW.is_read;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_notification_read ON notifications;
CREATE TRIGGER trg_sync_notification_read
BEFORE INSERT OR UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION sync_notification_read_flags();
