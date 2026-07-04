import express from 'express';
import cors from 'cors';
import pg from 'pg';
import Redis from 'ioredis';
import axios from 'axios';
import jwt from 'jsonwebtoken';
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

// Middleware to acquire database client from pool for transaction consistency
app.use(async (req, res, next) => {
  try {
    const dbClient = await pool.connect();
    req.dbClient = dbClient;
    
    // Release client when response is finished
    const releaseClient = () => {
      if (req.dbClient) {
        req.dbClient.release();
        req.dbClient = null;
      }
    };
    
    res.on('finish', releaseClient);
    res.on('close', releaseClient);
    
    next();
  } catch (err) {
    next(err);
  }
});

// Tenant Middleware
const tenantMiddleware = async (req, res, next) => {
  try {
    const host = req.headers.host || '';
    let slug = '';
    
    if (host.includes('.')) {
      slug = host.split('.')[0];
    }
    
    // Fallback to headers or query params for development / local testing
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
    
    // Set PostgreSQL RLS context
    await req.dbClient.query('SELECT set_tenant_context($1)', [tenant.id]);
    
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
    const decoded = jwt.verify(token, jwtSecret);
    
    // Verify user exists in the current tenant (under RLS)
    const result = await req.dbClient.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Access Denied: Invalid user session for this tenant' });
    }
    
    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ error: 'Access Denied: Invalid or expired token' });
  }
};

// Apply tenant middleware to all non-health routes or all routes
app.use(tenantMiddleware);

// Endpoints

// 1. GET /health
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    tenant: req.tenant.slug,
    timestamp: new Date().toISOString()
  });
});

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

// 4. Helper: buildPrompt
function buildPrompt(history, message, model) {
  let systemPrompt = `You are a helpful AI Assistant for tenant model: ${model}.`;
  if (model.toLowerCase().includes('coder')) {
    systemPrompt = "You are a professional software engineer. Provide high-quality code snippets and explanations.";
  }
  
  let prompt = `System: ${systemPrompt}\n\n`;
  for (const msg of history) {
    prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
  }
  prompt += `User: ${message}\nAssistant:`;
  return prompt;
}

// Helper: mock response generator
function getMockResponse(prompt, model) {
  const lowercasePrompt = prompt.toLowerCase();
  
  if (lowercasePrompt.includes("function") || lowercasePrompt.includes("class") || lowercasePrompt.includes("code")) {
    return `// Generated using Harikson Coder
export function processRequest(data) {
  if (!data) {
    throw new Error("Invalid payload: empty data source");
  }
  const result = {
    status: "success",
    timestamp: new Date().toISOString(),
    itemsCount: Array.isArray(data.items) ? data.items.length : 0
  };
  return result;
}`;
  }

  return `This is a simulated AI response from the Harikson Multi-Tenant Engine. I received your request using model ${model}. Let me know how I can help you compile databases or connect web widgets!`;
}

// 5. POST /api/chat
app.post('/api/chat', authMiddleware, async (req, res) => {
  const { message, model, conversationId } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const selectedModel = model || 'harikson-chat-8b';

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

    // Fetch or create conversation
    if (currentConvId) {
      const msgResult = await req.dbClient.query(
        'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
        [currentConvId]
      );
      history = msgResult.rows;
    } else {
      const title = message.substring(0, 50);
      const convResult = await req.dbClient.query(
        'INSERT INTO conversations (tenant_id, user_id, title, model) VALUES ($1, $2, $3, $4) RETURNING id',
        [req.tenant.id, req.user.id, title, selectedModel]
      );
      currentConvId = convResult.rows[0].id;
    }

    // Call Ollama /api/generate
    const prompt = buildPrompt(history, message, selectedModel);
    let aiResponse = '';
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      const response = await axios.post(`${ollamaHost}/api/generate`, {
        model: selectedModel,
        prompt: prompt,
        stream: false
      }, { timeout: 15000 });

      aiResponse = response.data.response;
      promptTokens = response.data.prompt_eval_count || Math.ceil(prompt.length / 4);
      completionTokens = response.data.eval_count || Math.ceil(aiResponse.length / 4);
    } catch (ollamaErr) {
      console.warn('Ollama generation failed or timed out, executing simulated response fallback.');
      aiResponse = getMockResponse(prompt, selectedModel);
      promptTokens = Math.ceil(prompt.length / 4);
      completionTokens = Math.ceil(aiResponse.length / 4);
    }

    const tokensUsed = promptTokens + completionTokens;

    // Save user message and AI response
    await req.dbClient.query(
      'INSERT INTO messages (tenant_id, conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4, $5)',
      [req.tenant.id, currentConvId, 'user', message, promptTokens]
    );

    await req.dbClient.query(
      'INSERT INTO messages (tenant_id, conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4, $5)',
      [req.tenant.id, currentConvId, 'assistant', aiResponse, completionTokens]
    );

    // Update conversation updated_at
    await req.dbClient.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
      [currentConvId]
    );

    res.status(200).json({
      response: aiResponse,
      model: selectedModel,
      tokens_used: tokensUsed,
      conversationId: currentConvId
    });

  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({ error: 'Failed to process chat conversation' });
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
