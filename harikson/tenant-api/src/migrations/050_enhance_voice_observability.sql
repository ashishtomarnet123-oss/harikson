-- Migration 050: Add interrupted and stt_error metrics to voice_usage
ALTER TABLE voice_usage ADD COLUMN IF NOT EXISTS interrupted BOOLEAN DEFAULT FALSE;
ALTER TABLE voice_usage ADD COLUMN IF NOT EXISTS stt_error BOOLEAN DEFAULT FALSE;
ALTER TABLE voice_usage ADD COLUMN IF NOT EXISTS error_type VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_voice_usage_interrupted ON voice_usage(interrupted);
CREATE INDEX IF NOT EXISTS idx_voice_usage_browser ON voice_usage(browser);
