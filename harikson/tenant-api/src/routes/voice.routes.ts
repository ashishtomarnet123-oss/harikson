import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { executeTenantQuery } from '../db/pool.js';
import logger from '../utils/logger.js';

const router = Router();

// Require authenticated user for all voice operations
router.use((req: any, res: Response, next) => {
  const authHeader = req.headers.authorization || '';
  const cookieToken = req.cookies?.hk_access_token;
  let token = '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (cookieToken) {
    token = cookieToken;
  }
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!);
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

/**
 * POST /api/voice/session — Start a new voice session
 */
router.post('/session', async (req: any, res: Response) => {
  const { conversationId, language = 'en-US' } = req.body || {};
  const tenantId = req.tenant.id;
  const userId = req.user.userId;

  try {
    const result = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `INSERT INTO voice_sessions (tenant_id, user_id, conversation_id, language, started_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id, started_at`,
        [tenantId, userId, conversationId || null, language]
      )
    );

    const session = result.rows[0];
    return res.status(201).json({ success: true, session });
  } catch (err: any) {
    logger.error('Failed to create voice session:', err);
    return res.status(500).json({ error: 'Failed to create voice session' });
  }
});

/**
 * POST /api/voice/session/:id/end — Conclude a voice session
 */
router.post('/session/:id/end', async (req: any, res: Response) => {
  const { id } = req.params;
  const { turnCount = 0, endedReason = 'completed' } = req.body || {};
  const tenantId = req.tenant.id;

  try {
    await executeTenantQuery(tenantId, (client) =>
      client.query(
        `UPDATE voice_sessions
         SET ended_at = NOW(), turn_count = $1, ended_reason = $2
         WHERE id = $3 AND tenant_id = $4`,
        [turnCount, endedReason, id, tenantId]
      )
    );

    return res.json({ success: true });
  } catch (err: any) {
    logger.error('Failed to end voice session:', err);
    return res.status(500).json({ error: 'Failed to end voice session' });
  }
});

/**
 * POST /api/voice/usage — Record turn metrics (TTFA, STT/TTS chars, tokens, interrupts, errors)
 */
router.post('/usage', async (req: any, res: Response) => {
  const {
    sessionId,
    sttChars = 0,
    ttsChars = 0,
    llmTokens = 0,
    ttfaMs = null,
    browser = null,
    interrupted = false,
    sttError = false,
    errorType = null,
  } = req.body || {};

  const tenantId = req.tenant.id;
  const userId = req.user.userId;

  try {
    await executeTenantQuery(tenantId, (client) =>
      client.query(
        `INSERT INTO voice_usage (
           session_id, tenant_id, user_id,
           stt_chars, tts_chars, llm_tokens, ttfa_ms,
           browser, interrupted, stt_error, error_type, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          sessionId || null,
          tenantId,
          userId,
          sttChars,
          ttsChars,
          llmTokens,
          ttfaMs,
          browser,
          !!interrupted,
          !!sttError,
          errorType || null,
        ]
      )
    );

    return res.status(201).json({ success: true });
  } catch (err: any) {
    logger.error('Failed to log voice usage:', err);
    return res.status(500).json({ error: 'Failed to log voice usage' });
  }
});

/**
 * GET /api/voice/settings — Get user's voice preferences
 */
router.get('/settings', async (req: any, res: Response) => {
  const tenantId = req.tenant.id;
  const userId = req.user.userId;

  try {
    const result = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT language, voice_name, rate, pitch, vad_threshold, echo_gate_enabled, push_to_talk
         FROM voice_settings
         WHERE user_id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      )
    );

    if (result.rows.length === 0) {
      return res.json({
        settings: {
          language: 'en-US',
          voiceName: null,
          rate: 1.05,
          pitch: 1.0,
          vadThreshold: -42,
          echoGateEnabled: true,
          pushToTalk: false,
        },
      });
    }

    const row = result.rows[0];
    return res.json({
      settings: {
        language: row.language,
        voiceName: row.voice_name,
        rate: parseFloat(row.rate),
        pitch: parseFloat(row.pitch),
        vadThreshold: row.vad_threshold,
        echoGateEnabled: row.echo_gate_enabled,
        pushToTalk: row.push_to_talk,
      },
    });
  } catch (err: any) {
    logger.error('Failed to get voice settings:', err);
    return res.status(500).json({ error: 'Failed to get voice settings' });
  }
});

/**
 * PUT /api/voice/settings — Save user's voice preferences
 */
router.put('/settings', async (req: any, res: Response) => {
  const {
    language = 'en-US',
    voiceName = null,
    rate = 1.05,
    pitch = 1.0,
    vadThreshold = -42,
    echoGateEnabled = true,
    pushToTalk = false,
  } = req.body || {};

  const tenantId = req.tenant.id;
  const userId = req.user.userId;

  try {
    await executeTenantQuery(tenantId, (client) =>
      client.query(
        `INSERT INTO voice_settings (tenant_id, user_id, language, voice_name, rate, pitch, vad_threshold, echo_gate_enabled, push_to_talk, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           language = EXCLUDED.language,
           voice_name = EXCLUDED.voice_name,
           rate = EXCLUDED.rate,
           pitch = EXCLUDED.pitch,
           vad_threshold = EXCLUDED.vad_threshold,
           echo_gate_enabled = EXCLUDED.echo_gate_enabled,
           push_to_talk = EXCLUDED.push_to_talk,
           updated_at = NOW()`,
        [tenantId, userId, language, voiceName, rate, pitch, vadThreshold, echoGateEnabled, pushToTalk]
      )
    );

    return res.json({ success: true });
  } catch (err: any) {
    logger.error('Failed to save voice settings:', err);
    return res.status(500).json({ error: 'Failed to save voice settings' });
  }
});

export default router;
