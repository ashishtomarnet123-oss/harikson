import { Router } from 'express';
import axios from 'axios';
import { Redis } from 'ioredis';
import jwt from 'jsonwebtoken';
import { pool, executeTenantQuery } from '../db/pool.js';
import { RagService } from '../services/rag.service.js';
import { countExactTokens } from '../services/tokenCountingService.js';
import logger from '../utils/logger.js';

const router = Router();
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

// Every route below reads/writes conversations by user, so the caller must
// be identified. Without this, req.user was always undefined and every
// conversation got attributed to a shared placeholder ID instead of the
// real caller — breaking per-user token attribution and, since the
// /conversations user filter was conditional on req.user existing, letting
// any caller list and read every other user's conversations in the tenant.
router.use((req: any, res, next) => {
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

const AI_UNAVAILABLE_MSG = 'AI service is temporarily unavailable. Please try again in a moment.';

// Browsers that used the app before conversations actually persisted
// (chat.routes.ts's INSERT silently failed for a long time — see git
// history) still have client-only fallback IDs like 'conv_<ts>_<rand>'
// cached in localStorage. Those were never real rows. Passing one into a
// uuid column throws a raw Postgres syntax error instead of a normal
// "not found", so every :id route below checks this first.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;



// GET /api/chat/conversations
router.get('/conversations', async (req: any, res) => {

  const userId = req.user.userId;

  try {
    const convRes = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `SELECT c.id, c.title, c.model, c.created_at, c.updated_at,
                COUNT(m.id)::int as message_count
         FROM conversations c
         LEFT JOIN messages m ON m.conversation_id = c.id AND m.deleted_at IS NULL
         WHERE c.tenant_id = $1 AND c.user_id = $2 AND c.deleted_at IS NULL
         GROUP BY c.id
         ORDER BY c.updated_at DESC`,
        [req.tenant.id, userId]
      )
    );

    res.json({ conversations: convRes.rows });
  } catch (err: any) {
    logger.error('Fetch conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/chat/conversations/:id/messages
router.get('/conversations/:id/messages', async (req: any, res) => {

  const { id } = req.params;
  const userId = req.user.userId;

  if (!UUID_RE.test(id)) {
    // A client-only fallback ID — there are no server-side messages for it.
    return res.json({ messages: [] });
  }

  try {
    const msgRes = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `SELECT m.id, m.conversation_id, m.role, m.content, m.tokens_used, m.created_at
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         WHERE m.conversation_id = $1 AND m.tenant_id = $2 AND c.user_id = $3
           AND m.deleted_at IS NULL AND c.deleted_at IS NULL
         ORDER BY m.created_at ASC`,
        [id, req.tenant.id, userId]
      )
    );

    res.json({ messages: msgRes.rows });
  } catch (err: any) {
    logger.error('Fetch messages error:', err);
    res.status(500).json({ error: 'Failed to fetch conversation messages' });
  }
});

// DELETE /api/chat/conversations/:id
router.delete('/conversations/:id', async (req: any, res) => {

  const { id } = req.params;
  const userId = req.user.userId;

  if (!UUID_RE.test(id)) {
    // A client-only fallback ID — nothing server-side to delete, but the
    // caller should still see success so it clears from their local list.
    return res.json({ success: true, message: 'Conversation deleted successfully' });
  }

  try {
    // Soft-delete, not hard delete: billing usage (message quota, token
    // totals) is computed by counting real message/token rows for this
    // month, with no separate persistent counter. A hard delete here let a
    // user erase their own usage history — and reset their quota — just by
    // deleting a conversation. deleted_at hides it from the conversation
    // list/messages views while billing/usage queries keep counting it.
    await executeTenantQuery(req.tenant.id, async (client) => {
      await client.query(
        `UPDATE messages SET deleted_at = NOW() WHERE conversation_id = $1 AND tenant_id = $2
         AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = $1 AND c.user_id = $3)`,
        [id, req.tenant.id, userId]
      );
      await client.query(
        'UPDATE conversations SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND user_id = $3',
        [id, req.tenant.id, userId]
      );
    });

    res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (err: any) {
    logger.error('Delete conversation error:', err);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// PATCH /api/chat/conversations/:id — rename a conversation. The frontend
// has always called this, but no matching route ever existed here, so
// renaming silently no-opped against a 404.
router.patch('/conversations/:id', async (req: any, res) => {

  const { id } = req.params;
  const { title } = req.body;
  const userId = req.user.userId;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (!UUID_RE.test(id)) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  try {
    const updateRes = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `UPDATE conversations SET title = $1, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3 AND user_id = $4 AND deleted_at IS NULL
         RETURNING id, title`,
        [title.trim(), id, req.tenant.id, userId]
      )
    );
    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(updateRes.rows[0]);
  } catch (err: any) {
    logger.error('Rename conversation error:', err);
    res.status(500).json({ error: 'Failed to rename conversation' });
  }
});

// POST /api/chat & POST /api/v1/chat
async function handleChat(req: any, res: any) {


  // Lock chat after Day 14 grace period if tenant is past_due
  if (req.tenant.status === 'past_due' && (req.tenant.metadata?.dunning_stage || 0) >= 4) {
    return res.status(403).json({
      error: 'Payment grace period expired. Please update your payment method to resume AI chat service.',
      lockReason: 'dunning_grace_period_expired',
      requireBillingUpdate: true,
    });
  }

  // Quota enforcement: check monthly message count against plan limit
  try {
    const planRes = await pool.query(
      `SELECT p.token_limit FROM tenants t
       LEFT JOIN plans p ON LOWER(t.plan) = LOWER(p.id)
       WHERE t.id = $1`,
      [req.tenant.id]
    );
    const tokenLimit = planRes.rows[0]?.token_limit ?? -1;
    // token_limit: -1 = unlimited, 0 = blocked, >0 = monthly cap
    if (tokenLimit >= 0) {
      const usageRes = await executeTenantQuery(req.tenant.id, (client) =>
        client.query(
          `SELECT COUNT(*) as msg_count FROM messages m
           JOIN conversations c ON m.conversation_id = c.id
           WHERE c.tenant_id = $1 AND m.role = 'user'
             AND m.created_at >= date_trunc('month', NOW())`,
          [req.tenant.id]
        )
      );
      const msgCount = parseInt(usageRes.rows[0]?.msg_count, 10) || 0;
      if (msgCount >= tokenLimit) {
        return res.status(429).json({
          error: 'Monthly message limit reached for your current plan. Please upgrade to continue.',
          limitReached: true,
          currentUsage: msgCount,
          limit: tokenLimit,
        });
      }
    }
  } catch (quotaErr) {
    logger.warn('Quota check failed, allowing request:', quotaErr);
  }

  try {
  const { message, conversationId, agentId, model: rawModel = 'harikson-plus', stream = true, clientHistory } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Message text is required' });

  // Single-GPU VM (16GB) can only serve one 7B model at a time.
  // plus/max/pro all map to qwen2.5:7b until multi-model infra is available.
  const MODEL_MAP: Record<string, string> = {
    'harikson-plus':    'qwen2.5:7b',
    'harikson-max':     'qwen2.5:7b',
    'harikson-pro':     'qwen2.5:7b',
    'harikson-mini':    'qwen2.5:3b',
    'harikson-8b':      'qwen2.5:7b',
    'harikson-plus-8b': 'qwen2.5:7b',
    'general':          'qwen2.5:3b',
    'qwen3-coder':      'qwen2.5:3b',
  };
  const model = MODEL_MAP[rawModel] || rawModel;

  const userId = req.user.userId;

    // A client-only fallback ID from before this route persisted anything
    // (see UUID_RE's comment) is not a real conversation — treat it the
    // same as no ID at all rather than trying to reuse it.
    let currentConvId = conversationId && UUID_RE.test(conversationId) ? conversationId : undefined;
    if (!currentConvId) {
      const title = message.length > 30 ? message.substring(0, 30) + '...' : message;
      try {
        const convRes = await executeTenantQuery(req.tenant.id, (client) =>
          client.query(
            `INSERT INTO conversations (tenant_id, user_id, title, model, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             RETURNING id`,
            [req.tenant.id, userId, title, model]
          )
        );
        currentConvId = convRes.rows[0]?.id;
      } catch (e) {
        // conversations has no agent_id column, so agentId is currently
        // unused here — this fallback ID is never a real row, which used
        // to be the silent, permanent path (the INSERT above referenced a
        // column that doesn't exist and always threw).
        logger.error(e, 'Failed to create conversation row');
        currentConvId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(7);
      }
    }
    if (!currentConvId) {
      currentConvId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    }

    // RAG Context retrieval
    // Fine-grained timing added to catch exactly where a hang happens —
    // the 30s "client or proxy disconnected" hangs never show up in
    // [REQ]/[RES] alone, so this pinpoints RAG lookup vs Ollama call vs
    // first-byte latency on the next occurrence.
    const ragStart = Date.now();
    const ragTimeout = new Promise<string>((resolve) => setTimeout(() => resolve(''), 15000));
    const ragContext = await Promise.race([
      RagService.queryContext(req.tenant.id, message, 3).catch(() => ''),
      ragTimeout,
    ]);
    logger.info({ durationMs: Date.now() - ragStart }, `[TIMING] RAG lookup took ${Date.now() - ragStart}ms`);
    const promptTokens = countExactTokens(message) + countExactTokens(ragContext);

    // Save user message
    // sender is a NOT NULL legacy column with no default, kept in sync with
    // role (its replacement) — omitting it makes the insert fail outright.
    executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        'INSERT INTO messages (tenant_id, conversation_id, role, sender, content, tokens_used) VALUES ($1, $2, $3, $3, $4, $5)',
        [req.tenant.id, currentConvId, 'user', message, countExactTokens(message)]
      )
    ).catch((e) => logger.error(e, 'Failed to save user message'));

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      if (currentConvId) res.setHeader('X-Conversation-Id', currentConvId);

      const ollamaUrl = process.env.OLLAMA_URL || process.env.OLLAMA_HOST || 'http://ollama:11434';
      let fullResponseText = '';

      // Build Ollama message list — include conversation history for context.
      // The frontend builds a system message carrying the selected agent's
      // preset prompt (Senior Coder / Code Reviewer / Database DBA / a
      // custom Prompt Library preset) into clientHistory[0]. This used to be
      // filtered out below and unconditionally replaced with a generic
      // prompt, which is why agent selection had no effect on replies —
      // use it as the base system prompt when present.
      const clientSystemMessage = Array.isArray(clientHistory)
        ? clientHistory.find((m: any) => m.role === 'system' && m.content?.trim())
        : null;
      const baseSystemPrompt =
        clientSystemMessage?.content ||
        `You are Xarwiz AI, a helpful and knowledgeable enterprise AI assistant. Answer questions accurately and helpfully.`;
      const systemContent = ragContext && ragContext !== 'No matching context found in knowledge base.'
        ? `${baseSystemPrompt}\n\nUse this additional context to answer:\n\n${ragContext}`
        : baseSystemPrompt;

      let ollamaMessages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemContent },
      ];

      // Inject prior conversation turns from clientHistory (system message
      // already extracted above, so exclude it here to avoid duplicating it)
      if (Array.isArray(clientHistory) && clientHistory.length > 0) {
        const historyMessages = clientHistory
          .filter((m: any) => m.role !== 'system' && m.content?.trim())
          .slice(-10); // Last 10 turns to stay within token budget
        ollamaMessages = [...ollamaMessages, ...historyMessages];
      } else {
        // Fallback: add just the current user message
        ollamaMessages.push({ role: 'user', content: message });
      }

      // Ensure last message is the current user message
      if (!clientHistory || ollamaMessages[ollamaMessages.length - 1]?.content !== message) {
        ollamaMessages.push({ role: 'user', content: message });
      }

      try {
        const ollamaCallStart = Date.now();
        logger.info({ model }, `[TIMING] Calling Ollama /api/chat with model=${model}`);
        const ollamaRes = await axios.post(
          `${ollamaUrl}/api/chat`,
          {
            model,
            messages: ollamaMessages,
            stream: true,
          },
          { responseType: 'stream', timeout: 60000 }
        );
        logger.info(
          { durationMs: Date.now() - ollamaCallStart },
          `[TIMING] Ollama axios.post resolved (headers received) after ${Date.now() - ollamaCallStart}ms`
        );

        let firstByteLogged = false;
        let streamEnded = false;
        ollamaRes.data.on('data', (chunk: Buffer) => {
          if (streamEnded) return;
          if (!firstByteLogged) {
            firstByteLogged = true;
            logger.info(
              { durationMs: Date.now() - ollamaCallStart },
              `[TIMING] First stream chunk from Ollama after ${Date.now() - ollamaCallStart}ms`
            );
          }
          const lines = chunk.toString().split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.message?.content) {
                fullResponseText += parsed.message.content;
                res.write(`data: ${JSON.stringify({ content: parsed.message.content, conversationId: currentConvId })}\n\n`);
              }
            } catch (e) {
              // Ignore line parse edge cases
            }
          }
        });

        ollamaRes.data.on('end', async () => {
          if (streamEnded) return;
          streamEnded = true;
          const completionTokens = countExactTokens(fullResponseText);
          executeTenantQuery(req.tenant.id, (client) =>
            client.query(
              'INSERT INTO messages (tenant_id, conversation_id, role, sender, content, tokens_used) VALUES ($1, $2, $3, $3, $4, $5)',
              [req.tenant.id, currentConvId, 'assistant', fullResponseText, completionTokens]
            )
          ).catch((e) => logger.error(e, 'Failed to save assistant message'));
          try { res.write(`data: [DONE]\n\n`); res.end(); } catch (_) {}
        });

        ollamaRes.data.on('error', async () => {
          if (streamEnded) return;
          streamEnded = true;
          try {
            res.write(`data: ${JSON.stringify({ error: AI_UNAVAILABLE_MSG, conversationId: currentConvId })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
          } catch (_) {}
        });
      } catch (ollamaErr) {
        logger.error('Ollama connection failed:', ollamaErr);
        res.write(`data: ${JSON.stringify({ error: AI_UNAVAILABLE_MSG, conversationId: currentConvId })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
      }
    } else {
      return res.status(503).json({ error: AI_UNAVAILABLE_MSG });
    }
  } catch (err: any) {
    logger.error('Chat processing error:', err);
    try {
      if (res.headersSent) {
        try { res.write(`data: [DONE]\n\n`); res.end(); } catch (_) {}
        return;
      }
      if (req.body?.stream !== false) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.write(`data: ${JSON.stringify({ error: AI_UNAVAILABLE_MSG })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
      } else {
        res.status(503).json({ error: AI_UNAVAILABLE_MSG });
      }
    } catch (writeErr) {
      logger.error('Failed to write error response:', writeErr);
    }
  }
}

router.post('/', handleChat);
router.post('/v1', handleChat);

export default router;
