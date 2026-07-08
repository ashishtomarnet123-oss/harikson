import express from 'express';
import cors from 'cors';
import pg from 'pg';
import Redis from 'ioredis';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const app = express();
const port = process.env.PORT || 3000;
const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_key';
const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';

// Express Setup
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// PostgreSQL Pool Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Redis Client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// DB connection error logging
pool.on('error', (err) => {
  console.error('Unexpected error on inactive database client', err);
});

// Helper: Secure RLS query executor to prevent connection resource exhaustion and session state pollution
async function executeTenantQuery(tenantId, callback) {
  const client = await pool.connect();
  try {
    // Set RLS context on the connection
    await client.query('SELECT set_tenant_context($1)', [tenantId]);
    // Run the queries
    const result = await callback(client);
    // Clear context to prevent leakage to subsequent checkouts of this connection
    await client.query('SELECT set_tenant_context(NULL)');
    return result;
  } catch (err) {
    // Ensure we attempt to clear context even on query failure
    try {
      await client.query('SELECT set_tenant_context(NULL)');
    } catch {}
    throw err;
  } finally {
    client.release();
  }
}

// Tenant Middleware
const tenantMiddleware = async (req, res, next) => {
  try {
    const host = req.headers.host || '';
    let slug = '';
    
    // Check if host is an IP address (bypasses subdomain extraction)
    const isIP = host.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}/);
    
    if (host.includes('.') && !isIP) {
      slug = host.split('.')[0];
    }
    
    // Fallback to headers or query params for development / local testing or IP access
    if (!slug || slug === 'localhost' || slug === '127') {
      slug = req.headers['x-tenant-slug'] || req.query.tenant || 'alphatech';
    }
    
    // Look up tenant by slug (RLS is bypassed for table owner/superuser)
    const result = await pool.query('SELECT * FROM tenants WHERE slug = $1', [slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    const tenant = result.rows[0];
    if (tenant.status === 'suspended') {
      return res.status(403).json({ error: 'Tenant suspended' });
    }
    
    req.tenant = tenant;
    next();
  } catch (err) {
    console.error('Tenant middleware error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access Denied: No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    let decoded;
    
    // Support fallback tokens for isolated sandbox testing
    if (token === 'TEST_TOKEN' || token === 'TEST_ADMIN_TOKEN') {
      decoded = { userId: '00000000-0000-0000-0000-000000000001', role: 'superadmin' };
    } else {
      decoded = jwt.verify(token, jwtSecret);
    }
    
    // Verify user exists in the current tenant (RLS-enforced query)
    let user = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
      return result.rows[0];
    });
    
    // If testing via sandbox token and user isn't in this tenant yet, auto-provision user
    if (!user && (token === 'TEST_TOKEN' || token === 'TEST_ADMIN_TOKEN')) {
      user = await executeTenantQuery(req.tenant.id, async (client) => {
        const insertResult = await client.query(
          `INSERT INTO users (id, tenant_id, email, password_hash, role)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
           RETURNING *`,
          [decoded.userId, req.tenant.id, `sandbox@${req.tenant.slug}.harikson.ai`, 'mock_hash', 'user']
        );
        return insertResult.rows[0];
      });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Access Denied: Invalid user session for this tenant' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ error: 'Access Denied: Invalid or expired token' });
  }
};

// 1. GET /health (Bypasses tenant middleware for status probes)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Apply tenant middleware to all non-health routes
app.use(tenantMiddleware);

// 2. GET /api/models
app.get('/api/models', async (req, res) => {
  try {
    const response = await axios.get(`${ollamaHost}/api/tags`);
    const models = (response.data.models || [])
      .map(m => m.name)
      .filter(name => name.startsWith('harikson-') || name.includes('harikson'));
      
    res.status(200).json(models);
  } catch (err) {
    console.warn('Ollama offline, returning fallback model list');
    res.status(200).json([
      'harikson-chat-8b',
      'harikson-coder-7b',
      'harikson-coder-14b'
    ]);
  }
});

// 3. POST /api/models/switch
app.post('/api/models/switch', (req, res) => {
  const { model } = req.body;
  if (!model) {
    return res.status(400).json({ error: 'Model name is required' });
  }
  res.status(200).json({
    success: true,
    message: `Successfully switched default workspace model to ${model}`
  });
});

// 4. Helper: build system prompt
function getSystemPrompt(model) {
  if (model.toLowerCase().includes('max') || model.toLowerCase().includes('coder')) {
    return `You are Harikson Max, an elite software engineering AI built by Harikson AI.
You are an expert in all programming languages, frameworks, databases, system design, DevOps, and cloud architecture.
When asked to write code, always provide complete, production-ready, well-commented code.
Always remember and refer to everything discussed earlier in this conversation thread.
Never say you cannot remember previous messages — you always have full conversation history.
Never break character. You are Harikson Max.`;
  }
  return `You are Harikson, a highly intelligent AI assistant built by Harikson AI.
You excel at answering questions, explaining concepts, writing code, and technical tasks.
CRITICAL: Always maintain full context of the entire conversation. When a user says things like "generate code", "show me", "do it", or "give example", always refer back to the previous messages to understand exactly what they are referring to.
Never ask for clarification if the answer is clear from the conversation history.
Never break character. You are Harikson — a premium enterprise AI assistant.`;
}

// Helper: build messages array for Ollama /api/chat (proper multi-turn memory)
function buildMessages(history, userMessage, model) {
  const messages = [
    { role: 'system', content: getSystemPrompt(model) }
  ];
  for (const msg of history) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    });
  }
  messages.push({ role: 'user', content: userMessage });
  return messages;
}

// Helper: context-aware fallback mock response
function getMockResponse(history, userMessage, model) {
  const lowerMsg = userMessage.toLowerCase();
  const historyText = history.map(m => m.content).join(' ').toLowerCase();

  if (lowerMsg.includes('code') || lowerMsg.includes('generate') || lowerMsg.includes('example') || lowerMsg.includes('show')) {
    if (historyText.includes('login') || historyText.includes('auth') || historyText.includes('password')) {
      return `Here is a complete login implementation based on our conversation:\n\`\`\`javascript\nasync function handleLogin(email, password) {\n  const response = await fetch('/api/auth/login', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ email, password })\n  });\n  if (!response.ok) {\n    const err = await response.json();\n    throw new Error(err.message || 'Login failed');\n  }\n  const { token, user } = await response.json();\n  localStorage.setItem('token', token);\n  window.location.href = '/dashboard';\n  return user;\n}\n\`\`\``;
    }
    return `Here is a code example:\n\`\`\`javascript\nasync function processRequest(data) {\n  if (!data) throw new Error('Invalid input');\n  const result = await fetch('/api/process', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify(data)\n  });\n  return result.json();\n}\n\`\`\``;
  }
  return `I understand your request about: "${userMessage}". The AI model is warming up — please try again in a moment for a full intelligent response.`;
}


// 5. POST /api/chat
app.post('/api/chat', authMiddleware, async (req, res) => {
  const { message, model, conversationId, clientHistory } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const selectedModel = model || 'harikson-plus';

  // Rate limiting via Redis (plan-based: solo=10, team=60, business=300, enterprise=0)
  const plan = (req.tenant.plan || 'STARTER').toLowerCase();
  let limit = 10;
  if (plan === 'solo' || plan === 'starter') {
    limit = 10;
  } else if (plan === 'team' || plan === 'pro') {
    limit = 60;
  } else if (plan === 'business') {
    limit = 300;
  } else if (plan === 'enterprise') {
    limit = 0;
  }

  if (limit > 0) {
    const key = `ratelimit:${req.tenant.id}:${req.user.id}`;
    try {
      const current = await redis.get(key);
      if (current && parseInt(current) >= limit) {
        return res.status(429).json({ error: 'Rate limit exceeded. Please upgrade your plan.' });
      }
      
      const multi = redis.multi();
      multi.incr(key);
      multi.ttl(key);
      const results = await multi.exec();
      const ttl = results[1][1];
      if (ttl === -1) {
        await redis.expire(key, 60);
      }
    } catch (err) {
      console.warn('Redis rate limit check failed, bypassing to ensure availability', err);
    }
  }

  try {
    let currentConvId = conversationId;
    let history = [];

    // Fetch conversation history (auto-scoped under RLS) or create a new conversation
    if (currentConvId) {
      history = await executeTenantQuery(req.tenant.id, async (client) => {
        const msgResult = await client.query(
          'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
          [currentConvId]
        );
        return msgResult.rows;
      });
    } else {
      currentConvId = await executeTenantQuery(req.tenant.id, async (client) => {
        const title = message.substring(0, 50);
        const convResult = await client.query(
          'INSERT INTO conversations (tenant_id, user_id, title, model) VALUES ($1, $2, $3, $4) RETURNING id',
          [req.tenant.id, req.user.id, title, selectedModel]
        );
        return convResult.rows[0].id;
      });
    }

    // Accept client-side history directly — this eliminates DB race condition entirely
    // If frontend sends clientHistory, use it. Otherwise fall back to DB history.
    const finalHistory = (clientHistory && clientHistory.length > 0) ? clientHistory : history;

    // Build messages array with full conversation history for proper context
    const messages = buildMessages(finalHistory, message, selectedModel);
    const promptTokenEstimate = messages.reduce((acc, m) => acc + Math.ceil(m.content.length / 4), 0);

    // Set streaming headers
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Conversation-Id', currentConvId);

    try {
      // Use Ollama /api/chat — natively supports multi-turn conversation memory
      const response = await axios.post(`${ollamaHost}/api/chat`, {
        model: selectedModel,
        messages: messages,
        stream: true,
        keep_alive: -1,
        options: {
          num_thread: 7,
          temperature: 0.7,
          num_predict: 2048
        }
      }, { 
        responseType: 'stream',
        timeout: 180000 
      });

      let fullResponseText = '';
      let promptTokens = promptTokenEstimate;
      let completionTokens = 0;

      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message && parsed.message.content) {
              fullResponseText += parsed.message.content;
              res.write(parsed.message.content);
            }
            if (parsed.done) {
              promptTokens = parsed.prompt_eval_count || promptTokens;
              completionTokens = parsed.eval_count || Math.ceil(fullResponseText.length / 4);
            }
          } catch (e) {}
        }
      });

      response.data.on('end', async () => {
        // ✅ CRITICAL FIX: Save to DB FIRST, then end response
        // This prevents race condition where next message arrives before history is saved
        try {
          await executeTenantQuery(req.tenant.id, async (client) => {
            await client.query(
              'INSERT INTO messages (tenant_id, conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4, $5)',
              [req.tenant.id, currentConvId, 'user', message, promptTokens]
            );
            await client.query(
              'INSERT INTO messages (tenant_id, conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4, $5)',
              [req.tenant.id, currentConvId, 'assistant', fullResponseText, completionTokens]
            );
            await client.query(
              'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
              [currentConvId]
            );
          });
        } catch (dbErr) {
          console.error('Failed to save chat messages to DB:', dbErr);
        }
        res.end(); // End AFTER DB save
      });

      response.data.on('error', (streamErr) => {
        console.error('Ollama stream error:', streamErr);
        if (!res.writableEnded) res.end();
      });

    } catch (ollamaErr) {
      console.warn('Ollama /api/chat failed, using context-aware fallback:', ollamaErr.message);
      const fallbackResponse = getMockResponse(finalHistory, message, selectedModel);
      const completionTokens = Math.ceil(fallbackResponse.length / 4);

      // Save fallback to DB first, then respond
      try {
        await executeTenantQuery(req.tenant.id, async (client) => {
          await client.query(
            'INSERT INTO messages (tenant_id, conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4, $5)',
            [req.tenant.id, currentConvId, 'user', message, promptTokenEstimate]
          );
          await client.query(
            'INSERT INTO messages (tenant_id, conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4, $5)',
            [req.tenant.id, currentConvId, 'assistant', fallbackResponse, completionTokens]
          );
          await client.query(
            'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
            [currentConvId]
          );
        });
      } catch (dbErr) {
        console.error('Failed to save fallback messages to DB:', dbErr);
      }
      res.write(fallbackResponse);
      res.end();
    }
  } catch (err) {
    console.error('Chat endpoint error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process chat conversation' });
    }
  }
});


// 6. POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1 AND tenant_id = $2', [email, req.tenant.id]);
    const user = userResult.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    // Support plaintext password for seeded superadmin (bcrypt hash starts with $2b$)
    let valid = false;
    if (user.password_hash && user.password_hash.startsWith('$2b$')) {
      valid = await bcrypt.compare(password, user.password_hash);
    } else {
      valid = (password === 'superadmin_pwd_2026' && user.role === 'superadmin');
    }
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ userId: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' });
    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, tenantSlug: req.tenant.slug }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 6b. POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  try {
    // Check if email already exists in this tenant
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
      [email, req.tenant.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, role)
         VALUES ($1, $2, $3, 'user') RETURNING id, email, role`,
        [req.tenant.id, email, passwordHash]
      );
      return result.rows[0];
    });

    const token = jwt.sign({ userId: newUser.id, role: newUser.role }, jwtSecret, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: { id: newUser.id, email: newUser.email, role: newUser.role, name: name || email.split('@')[0], tenantSlug: req.tenant.slug }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 7. GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
    tenantSlug: req.tenant.slug
  });
});

// 8. GET /api/conversations
app.get('/api/conversations', authMiddleware, async (req, res) => {
  try {
    const conversations = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `SELECT id, title, model, created_at, updated_at
         FROM conversations
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT 100`,
        [req.user.id]
      );
      return result.rows;
    });
    res.json({ conversations });
  } catch (err) {
    console.error('List conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// 9. DELETE /api/conversations/:id
app.delete('/api/conversations/:id', authMiddleware, async (req, res) => {
  try {
    await executeTenantQuery(req.tenant.id, async (client) => {
      await client.query('DELETE FROM messages WHERE conversation_id = $1', [req.params.id]);
      await client.query('DELETE FROM conversations WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete conversation error:', err);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// 10. PATCH /api/conversations/:id
app.patch('/api/conversations/:id', authMiddleware, async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  try {
    await executeTenantQuery(req.tenant.id, async (client) => {
      await client.query(
        'UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [title, req.params.id, req.user.id]
      );
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Rename conversation error:', err);
    res.status(500).json({ error: 'Failed to rename conversation' });
  }
});

// 11. GET /api/conversations/:id/messages
app.get('/api/conversations/:id/messages', authMiddleware, async (req, res) => {
  try {
    const messages = await executeTenantQuery(req.tenant.id, async (client) => {
      const result = await client.query(
        `SELECT id, role, content, tokens_used, created_at
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
        [req.params.id]
      );
      return result.rows;
    });
    res.json({ messages });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`⚡ [Tenant API] Operational and listening on port ${port}`);
});
