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
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_neuravolt_2026');
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Helper: Context-aware Mock LLM response fallback
function getMockResponse(history: any[], lastUserMsg: string, model: string): string {
  const msgLower = lastUserMsg.toLowerCase().trim();

  if (msgLower.match(/^(hello|hi|hey|good morning|good evening|howdy|sup|yo)[\s!?.]*$/)) {
    return `Hello! I'm Xarwiz AI, your intelligent enterprise assistant. How can I help you today?`;
  }
  if (msgLower.includes('how are you') || msgLower.includes('how was your day') || msgLower.includes('how do you do')) {
    return `I'm doing great, thank you for asking! I'm fully operational and ready to help you with anything you need — from answering questions to analyzing documents and managing your AI workflows.`;
  }
  if (msgLower.includes('what can you do') || msgLower.includes('your capabilities') || msgLower.includes('features')) {
    return `I can help you with:\n\n• **Intelligent Q&A** — Answer questions about your business, documents, or knowledge base\n• **Document Analysis** — Analyze uploaded PDFs, contracts, reports\n• **Code Review** — Review and suggest improvements to your codebase\n• **RAG Search** — Search across your uploaded knowledge documents\n• **Workflow Automation** — Design and trigger AI-powered workflows\n\nWhat would you like to explore?`;
  }
  if (msgLower.includes('pricing') || msgLower.includes('plan') || msgLower.includes('cost') || msgLower.includes('subscription')) {
    return `Xarwiz AI offers flexible plans:\n\n• **Free** — $0/month, basic chat & 100 messages/month\n• **Starter** — $19/month, 2,000 messages & 10GB RAG storage\n• **Professional** — $49/month, 10,000 messages & 100GB RAG storage *(your current plan)*\n• **Enterprise** — $199/month, unlimited messages & dedicated infrastructure\n\nYou're currently on the **14-Day Professional Free Trial** with full access.`;
  }
  if (msgLower.includes('help') || msgLower.includes('support') || msgLower.includes('issue') || msgLower.includes('problem')) {
    return `I'm here to help! You can:\n\n1. Describe your issue and I'll guide you through it\n2. Upload a document for analysis\n3. Ask me to write, review, or explain code\n4. Search your knowledge base\n\nWhat's the challenge you're facing?`;
  }
  if (msgLower.includes('thank') || msgLower.includes('thanks')) {
    return `You're very welcome! Is there anything else I can assist you with?`;
  }
  if (msgLower.includes('bye') || msgLower.includes('goodbye') || msgLower.includes('see you')) {
    return `Goodbye! Feel free to come back anytime you need assistance. Have a great day!`;
  }
  // Generic intelligent fallback
  const responses = [
    `That's an interesting question! Let me think about this... Based on what you've shared, I'd suggest exploring this from a few angles. Could you provide a bit more context so I can give you a more precise answer?`,
    `Great question! I'm processing your request. To give you the most accurate response, could you tell me more about what you're trying to achieve?`,
    `I understand what you're asking. This touches on some nuanced areas — could you elaborate a bit more so I can tailor my response to your specific needs?`,
  ];
  return responses[Math.abs(lastUserMsg.length) % responses.length];
}

const DEFAULT_TENANT = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'Neuravolt Default',
  slug: 'neuravolt',
  status: 'active',
};

// GET /api/chat/conversations
router.get('/conversations', async (req: any, res) => {
  if (!req.tenant) req.tenant = DEFAULT_TENANT;
  const userId = req.user.userId;

  try {
    const convRes = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `SELECT c.id, c.title, c.agent_id, c.created_at, c.updated_at,
                COUNT(m.id)::int as message_count
         FROM conversations c
         LEFT JOIN messages m ON m.conversation_id = c.id
         WHERE c.tenant_id = $1 AND c.user_id = $2
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
  if (!req.tenant) req.tenant = DEFAULT_TENANT;
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const msgRes = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `SELECT m.id, m.conversation_id, m.role, m.content, m.tokens_used, m.created_at
         FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         WHERE m.conversation_id = $1 AND m.tenant_id = $2 AND c.user_id = $3
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
  if (!req.tenant) req.tenant = DEFAULT_TENANT;
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    await executeTenantQuery(req.tenant.id, async (client) => {
      await client.query(
        `DELETE FROM messages WHERE conversation_id = $1 AND tenant_id = $2
         AND EXISTS (SELECT 1 FROM conversations c WHERE c.id = $1 AND c.user_id = $3)`,
        [id, req.tenant.id, userId]
      );
      await client.query('DELETE FROM conversations WHERE id = $1 AND tenant_id = $2 AND user_id = $3', [id, req.tenant.id, userId]);
    });

    res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (err: any) {
    logger.error('Delete conversation error:', err);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// POST /api/chat & POST /api/v1/chat
async function handleChat(req: any, res: any) {
  if (!req.tenant) req.tenant = DEFAULT_TENANT;

  // Lock chat after Day 14 grace period if tenant is past_due
  if (req.tenant.status === 'past_due' && (req.tenant.metadata?.dunning_stage || 0) >= 4) {
    return res.status(403).json({
      error: 'Payment grace period expired. Please update your payment method to resume AI chat service.',
      lockReason: 'dunning_grace_period_expired',
      requireBillingUpdate: true,
    });
  }

  const { message, conversationId, agentId, model: rawModel = 'harikson-plus', stream = true, clientHistory } = req.body;
  if (!message) return res.status(400).json({ error: 'Message text is required' });

  // Map Xarwiz brand model names to real Ollama model names
  const MODEL_MAP: Record<string, string> = {
    'harikson-plus':  'qwen2.5:3b',
    'harikson-max':   'qwen2.5:3b',
    'harikson-pro':   'qwen2.5:3b',
    'harikson-mini':  'qwen2.5:3b',
    'harikson-8b':    'qwen2.5:3b',
    'harikson-plus-8b': 'qwen2.5:3b',
    'general':        'qwen2.5:3b',
    'qwen3-coder':    'qwen2.5:3b',
  };
  const model = MODEL_MAP[rawModel] || rawModel;

  const userId = req.user.userId;

  try {
    let currentConvId = conversationId;
    if (!currentConvId) {
      const title = message.length > 30 ? message.substring(0, 30) + '...' : message;
      try {
        const convRes = await executeTenantQuery(req.tenant.id, (client) =>
          client.query(
            `INSERT INTO conversations (tenant_id, user_id, agent_id, title, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             RETURNING id`,
            [req.tenant.id, userId, agentId || null, title]
          )
        );
        currentConvId = convRes.rows[0]?.id;
      } catch (e) {
        currentConvId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(7);
      }
    }
    if (!currentConvId) {
      currentConvId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    }

    // RAG Context retrieval
    const ragContext = await RagService.queryContext(req.tenant.id, message, 3).catch(() => '');
    const promptTokens = countExactTokens(message) + countExactTokens(ragContext);

    // Save user message
    executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        'INSERT INTO messages (tenant_id, conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4, $5)',
        [req.tenant.id, currentConvId, 'user', message, countExactTokens(message)]
      )
    ).catch(() => {});

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const ollamaUrl = process.env.OLLAMA_URL || 'http://ollama:11434';
      let fullResponseText = '';

      // Build Ollama message list — include conversation history for context
      const systemContent = ragContext && ragContext !== 'No matching context found in knowledge base.'
        ? `You are Xarwiz AI, a helpful enterprise AI assistant. Use this context to answer:\n\n${ragContext}`
        : `You are Xarwiz AI, a helpful and knowledgeable enterprise AI assistant. Answer questions accurately and helpfully.`;

      let ollamaMessages: Array<{ role: string; content: string }> = [
        { role: 'system', content: systemContent },
      ];

      // Inject prior conversation turns from clientHistory (skip system messages)
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
        const ollamaRes = await axios.post(
          `${ollamaUrl}/api/chat`,
          {
            model,
            messages: ollamaMessages,
            stream: true,
          },
          { responseType: 'stream', timeout: 60000 }
        );

        ollamaRes.data.on('data', (chunk: Buffer) => {
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
          const completionTokens = countExactTokens(fullResponseText);
          executeTenantQuery(req.tenant.id, (client) =>
            client.query(
              'INSERT INTO messages (tenant_id, conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4, $5)',
              [req.tenant.id, currentConvId, 'assistant', fullResponseText, completionTokens]
            )
          ).catch(() => {});
          res.write(`data: [DONE]\n\n`);
          res.end();
        });

        ollamaRes.data.on('error', async () => {
          const fallback = getMockResponse([], message, model);
          res.write(`data: ${JSON.stringify({ content: fallback, conversationId: currentConvId })}\n\n`);
          res.write(`data: [DONE]\n\n`);
          res.end();
        });
      } catch (ollamaErr) {
        const fallback = getMockResponse([], message, model);
        res.write(`data: ${JSON.stringify({ content: fallback, conversationId: currentConvId })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
      }
    } else {
      const fallback = getMockResponse([], message, model);
      const completionTokens = countExactTokens(fallback);
      res.json({
        conversationId: currentConvId,
        message: fallback,
        tokensUsed: promptTokens + completionTokens,
      });
    }
  } catch (err: any) {
    logger.error('Chat processing error:', err);
    const fallback = getMockResponse([], req.body?.message || 'hello', req.body?.model || 'harikson-plus');
    try {
      if (res.headersSent) {
        // Headers already sent in stream — just close the connection
        try { res.write(`data: [DONE]\n\n`); res.end(); } catch (_) {}
        return;
      }
      if (req.body?.stream !== false) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.write(`data: ${JSON.stringify({ content: fallback, conversationId: 'conv_fallback' })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
      } else {
        res.json({ conversationId: 'conv_fallback', message: fallback, tokensUsed: 150 });
      }
    } catch (writeErr) {
      logger.error('Failed to write error response:', writeErr);
    }
  }
}

router.post('/', handleChat);
router.post('/v1', handleChat);

export default router;
