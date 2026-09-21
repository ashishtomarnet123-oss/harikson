-- Migration 052: Add stage_latency JSONB column to voice_usage
-- Stores per-turn pipeline stage timestamps for latency debugging.
-- Fields (all in ms from turn start, or absolute epoch ms):
--   stt_start, stt_first_partial, stt_final,
--   llm_request, llm_first_token,
--   tts_request, tts_first_audio, tts_end,
--   barge_in (nullable — only if turn was interrupted)
--   turn_total_ms — wall-clock time from VAD speech-end to TTS end

ALTER TABLE voice_usage
  ADD COLUMN IF NOT EXISTS stage_latency JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS turn_total_ms INTEGER DEFAULT NULL;

-- Index for fast aggregate queries on TTFA across sessions
CREATE INDEX IF NOT EXISTS idx_voice_usage_ttfa
  ON voice_usage (ttfa_ms)
  WHERE ttfa_ms IS NOT NULL;

-- Index for per-session analytics
CREATE INDEX IF NOT EXISTS idx_voice_usage_session
  ON voice_usage (session_id)
  WHERE session_id IS NOT NULL;

COMMENT ON COLUMN voice_usage.stage_latency IS
  'Per-stage latency breakdown (ms from turn stt_final): stt_start, stt_first_partial, stt_final, llm_request, llm_first_token, tts_request, tts_first_audio, tts_end, barge_in, turn_total_ms';
