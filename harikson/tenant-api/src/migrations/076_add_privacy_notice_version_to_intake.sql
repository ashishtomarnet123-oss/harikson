-- Migration 076: Add privacy notice version and explicit acknowledgement timestamp to intake tables
-- Ensures affirmative DPDP consent defaults to unacknowledged (false) at the database layer.

ALTER TABLE contact_submissions 
  ADD COLUMN IF NOT EXISTS privacy_notice_version VARCHAR(50) NOT NULL DEFAULT '2.0-dpdp',
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE career_applications 
  ADD COLUMN IF NOT EXISTS privacy_notice_version VARCHAR(50) NOT NULL DEFAULT '2.0-dpdp',
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Update table column defaults to false so omissions cannot create implicit consent
ALTER TABLE contact_submissions ALTER COLUMN privacy_notice_acknowledged SET DEFAULT false;
ALTER TABLE career_applications ALTER COLUMN privacy_notice_acknowledged SET DEFAULT false;
