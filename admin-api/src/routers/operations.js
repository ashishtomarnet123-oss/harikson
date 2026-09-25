import logger from '../utils/logger.js';
import express from 'express';
import { exec } from 'child_process';
import util from 'util';
import axios from 'axios';
import { adminAuth } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validation.middleware.js';
import {
  activitySchema,
  workflowSchema,
  updateWorkflowSchema,
  statusToggleSchema,
  bulkActionSchema,
  backupSchema,
  vectorSchema,
  costSchema,
  notificationSchema,
  integrationSchema,
} from '../validators/operations.schema.js';
import pool from '../db.js';

const router = express.Router();
const execPromise = util.promisify(exec);

const ollamaHost = process.env.OLLAMA_HOST || 'http://ollama:11434';

router.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/activity') {
    const secret = req.headers['x-internal-secret'];
    if (secret && secret === process.env.INTERNAL_API_SECRET) return next();
    return res.status(401).json({ error: 'Missing or invalid internal secret' });
  }
  return adminAuth(req, res, next);
});

// ─── ACTIVITY CENTER (Phase 1.2) ─────────────────────────────────────────────

// GET /admin/activity
router.get('/activity', async (req, res) => {
  const { tenant, model, status, limit = 50, offset = 0 } = req.query;
  try {
    let query = `
      SELECT a.id, a.model, a.endpoint, a.status, a.tokens_in, a.tokens_out,
             a.latency_ms, a.gpu_percent, a.error_message, a.created_at, a.completed_at,
             t.name as tenant_name
      FROM ai_activity a
      LEFT JOIN tenants t ON a.tenant_id = t.id
      WHERE 1=1
    `;
    const params = [];
    if (tenant) {
      params.push(tenant);
      query += ` AND a.tenant_id = $${params.length}`;
    }
    if (model) {
      params.push(`%${model}%`);
      query += ` AND a.model ILIKE $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND a.status = $${params.length}`;
    }
    query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    const result = await pool.query(query, params);

    // Summary stats (last 1 hour)
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status='processing') as processing,
        COUNT(*) FILTER (WHERE status='streaming') as streaming,
        COUNT(*) FILTER (WHERE status='waiting') as waiting,
        COUNT(*) FILTER (WHERE status='completed') as completed,
        COUNT(*) FILTER (WHERE status='failed') as failed,
        ROUND(AVG(latency_ms) FILTER (WHERE status='completed'))::int as avg_latency_ms
      FROM ai_activity WHERE created_at > NOW() - INTERVAL '1 hour'
    `);

    res.json({
      activity: result.rows,
      stats: stats.rows[0],
      total: result.rowCount,
    });
  } catch (err) {
    logger.error('Activity fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// POST /admin/activity (internal — called by tenant-api without admin token)
router.post('/activity', validate(activitySchema), async (req, res) => {
  const {
    tenant_id,
    user_id,
    agent_id,
    model,
    status,
    tokens_in,
    tokens_out,
    latency_ms,
    gpu_percent,
    error_message,
  } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO ai_activity (tenant_id, user_id, agent_id, model, status, tokens_in, tokens_out, latency_ms, gpu_percent, error_message, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        tenant_id,
        user_id,
        agent_id,
        model,
        status || 'completed',
        tokens_in || 0,
        tokens_out || 0,
        latency_ms,
        gpu_percent,
        error_message,
        status === 'completed' || status === 'failed' ? new Date() : null,
      ]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    logger.error('Activity log error:', err);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// GET /admin/activity/stream (SSE)
router.get('/activity/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const allowedOrigin = process.env.ADMIN_PANEL_ORIGIN || 'https://admin.xarwiz.com';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.flushHeaders();

  const sendData = async () => {
    try {
      const result = await pool.query(`
        SELECT a.id, a.model, a.status, a.tokens_in, a.tokens_out, a.latency_ms, a.created_at, t.name as tenant_name
        FROM ai_activity a LEFT JOIN tenants t ON a.tenant_id = t.id
        ORDER BY a.created_at DESC LIMIT 25
      `);
      res.write(`data: ${JSON.stringify(result.rows)}\n\n`);
    } catch (err) {
      logger.error('Error in sendData SSE callback:', err);
    }
  };

  await sendData();
  const interval = setInterval(sendData, 4000);
  req.on('close', () => clearInterval(interval));
});

// ─── KNOWLEDGE BASE (Phase 1.4) ───────────────────────────────────────────────

router.get('/knowledge', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT kb.*, t.name as tenant_name,
        (SELECT COUNT(*) FROM knowledge_documents kd WHERE kd.knowledge_base_id = kb.id) as doc_count
      FROM knowledge_bases kb
      LEFT JOIN tenants t ON kb.tenant_id = t.id
      ORDER BY kb.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch knowledge bases' });
  }
});

router.post('/knowledge', async (req, res) => {
  const { name, description, tenant_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = await pool.query(
      `INSERT INTO knowledge_bases (name, description, tenant_id, index_status) VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [name, description, tenant_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create knowledge base' });
  }
});

router.delete('/knowledge/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM knowledge_bases WHERE id = $1', [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete knowledge base' });
  }
});

router.get('/knowledge/:id/documents', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM knowledge_documents WHERE knowledge_base_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

router.post('/knowledge/:id/documents', async (req, res) => {
  const { filename, file_type, file_size_bytes } = req.body;
  try {
    const doc = await pool.query(
      `INSERT INTO knowledge_documents (knowledge_base_id, filename, file_type, file_size_bytes, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
      [req.params.id, filename, file_type, file_size_bytes]
    );
    await pool.query(
      `UPDATE knowledge_bases SET total_documents = total_documents + 1,
       storage_bytes = storage_bytes + $1 WHERE id=$2`,
      [file_size_bytes || 0, req.params.id]
    );
    res.json(doc.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add document' });
  }
});

router.delete('/knowledge/:id/documents/:docId', async (req, res) => {
  try {
    await pool.query('DELETE FROM knowledge_documents WHERE id = $1', [
      req.params.docId,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ─── PLAYGROUND (Phase 2.1) ───────────────────────────────────────────────────

router.post('/playground/chat', async (req, res) => {
  const {
    model,
    system_prompt,
    user_message,
    temperature = 0.7,
    max_tokens = 2048,
    agent_id,
  } = req.body;
  if (!user_message)
    return res.status(400).json({ error: 'user_message is required' });

  const startTime = Date.now();
  const selectedModel = model || 'harikson-plus';

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  try {
    const messages = [
      {
        role: 'system',
        content: system_prompt || 'You are a helpful AI assistant.',
      },
      { role: 'user', content: user_message },
    ];

    const response = await axios.post(
      `${ollamaHost}/api/chat`,
      {
        model: selectedModel,
        messages,
        stream: true,
        options: {
          temperature: parseFloat(temperature),
          num_predict: parseInt(max_tokens),
        },
      },
      { responseType: 'stream', timeout: 180000 }
    );

    let fullText = '',
      tokensOut = 0;
    response.data.on('data', (chunk) => {
      chunk
        .toString()
        .split('\n')
        .filter(Boolean)
        .forEach((line) => {
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              fullText += parsed.message.content;
              res.write(parsed.message.content);
            }
            if (parsed.eval_count) {
              tokensOut = parsed.eval_count;
            }
          } catch (e) {
            logger.warn(
              'Warning parsing playground Ollama stream chunk:',
              e.message
            );
          }
        });
    });
    response.data.on('end', async () => {
      const latency = Date.now() - startTime;
      const adminId = req.admin?.id || null;
      const tokensIn =
        Math.ceil((system_prompt || '').length / 4) +
        Math.ceil(user_message.length / 4);
      try {
        await pool.query(
          `INSERT INTO playground_sessions (admin_id, model, agent_id, system_prompt, messages, tokens_in, tokens_out, latency_ms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            adminId,
            selectedModel,
            agent_id || null,
            system_prompt,
            JSON.stringify([
              { role: 'user', content: user_message },
              { role: 'assistant', content: fullText },
            ]),
            tokensIn,
            tokensOut,
            latency,
          ]
        );
      } catch (err) {
        logger.warn('Warning saving playground session to DB:', err.message);
      }
      res.end();
    });
    response.data.on('error', () => {
      if (!res.writableEnded) res.end();
    });
  } catch (err) {
    logger.error('Playground chat error:', err.message);
    if (!res.headersSent)
      res.status(500).json({ error: 'Inference failed', details: err.message });
    else res.end();
  }
});

router.get('/playground/sessions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, model, agent_id, system_prompt, tokens_in, tokens_out, latency_ms, created_at FROM playground_sessions ORDER BY created_at DESC LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// ─── WORKFLOWS (Phase 2.2) ────────────────────────────────────────────────────

router.get('/workflows/stats/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int as total_workflows,
        COUNT(*) FILTER (WHERE status = 'active')::int as active_workflows,
        COUNT(*) FILTER (WHERE status = 'disabled')::int as disabled_workflows,
        COALESCE(SUM(execution_count), 0)::int as total_executions,
        ROUND(AVG(NULLIF(success_rate, 0))::numeric, 1) as avg_success_rate,
        COUNT(DISTINCT tenant_id)::int as tenant_count
      FROM workflows
    `);
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Failed to fetch workflow stats:', err);
    res.status(500).json({ error: 'Failed to fetch workflow stats' });
  }
});

router.get('/workflows', async (req, res) => {
  try {
    const { tenant_id, search, sort = 'created_at', order = 'desc' } = req.query;
    const allowedSorts = ['created_at', 'name', 'execution_count', 'success_rate', 'last_execution_at'];
    const sortCol = allowedSorts.includes(sort) ? `w.${sort}` : 'w.created_at';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    let where = [];
    let params = [];
    let paramIdx = 1;

    if (tenant_id) {
      where.push(`w.tenant_id = $${paramIdx}`);
      params.push(tenant_id);
      paramIdx++;
    }
    if (search) {
      where.push(`(w.name ILIKE $${paramIdx} OR w.description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const result = await pool.query(`
      SELECT w.*, t.name as tenant_name,
        (SELECT COUNT(*) FROM workflow_executions we WHERE we.workflow_id = w.id) as total_runs,
        (SELECT we2.status FROM workflow_executions we2 WHERE we2.workflow_id = w.id ORDER BY started_at DESC LIMIT 1) as last_status
      FROM workflows w LEFT JOIN tenants t ON w.tenant_id = t.id
      ${whereClause}
      ORDER BY ${sortCol} ${sortOrder} NULLS LAST
    `, params);
    res.json(result.rows);
  } catch (err) {
    logger.error('Failed to fetch workflows:', err);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

router.post('/workflows', validate(workflowSchema), async (req, res) => {
  const { name, description, trigger_type, steps, definition, tenant_id } = req.body;
  try {
    // Validate tenant_id exists if provided
    if (tenant_id) {
      const tenantCheck = await pool.query('SELECT id FROM tenants WHERE id=$1', [tenant_id]);
      if (!tenantCheck.rows.length) {
        return res.status(400).json({ error: 'Invalid tenant_id: tenant does not exist' });
      }
    }
    const result = await pool.query(
      `INSERT INTO workflows (name, description, trigger_type, steps, definition, tenant_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        name,
        description,
        trigger_type || 'manual',
        JSON.stringify(steps || []),
        definition ? JSON.stringify(definition) : null,
        tenant_id || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Failed to create workflow:', err);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

router.put(
  '/workflows/:id',
  validate(updateWorkflowSchema),
  async (req, res) => {
    const { name, description, trigger_type, steps, definition, status } = req.body;
    try {
      const result = await pool.query(
        `UPDATE workflows SET 
          name=COALESCE($1,name), 
          description=COALESCE($2,description), 
          trigger_type=COALESCE($3,trigger_type), 
          steps=COALESCE($4,steps), 
          definition=COALESCE($5,definition),
          status=COALESCE($6,status) 
        WHERE id=$7 RETURNING *`,
        [
          name,
          description,
          trigger_type,
          steps ? JSON.stringify(steps) : null,
          definition ? JSON.stringify(definition) : null,
          status,
          req.params.id,
        ]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update workflow' });
    }
  }
);

router.delete('/workflows/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM workflows WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

router.post('/workflows/:id/run', async (req, res) => {
  try {
    // First verify workflow exists
    const wfCheck = await pool.query('SELECT id, name, status FROM workflows WHERE id=$1', [req.params.id]);
    if (!wfCheck.rows.length) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    if (wfCheck.rows[0].status === 'disabled' || wfCheck.rows[0].status === 'archived') {
      return res.status(400).json({ error: `Workflow is ${wfCheck.rows[0].status} and cannot be run` });
    }

    const tenantApiUrl = process.env.TENANT_API_URL || 'http://tenant-api:3008';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(`${tenantApiUrl}/api/workflows/${req.params.id}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.INTERNAL_API_SECRET ? { 'x-internal-secret': process.env.INTERNAL_API_SECRET } : {}),
        },
        body: JSON.stringify(req.body || {}),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      // Fallback: create execution record directly in DB
      logger.warn('Tenant API unreachable for workflow run, falling back to DB:', fetchErr.message);
      const exec = await pool.query(
        `INSERT INTO workflow_executions (workflow_id, status, started_at) VALUES ($1,'running',NOW()) RETURNING *`,
        [req.params.id]
      );
      res.json({ execution: exec.rows[0], message: 'Workflow execution queued (tenant API unavailable, queued locally)' });
    }
  } catch (err) {
    logger.error('Failed to run workflow:', err);
    res.status(500).json({ error: 'Failed to run workflow' });
  }
});

router.get('/workflows/:id/executions', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 25, 100);
    const offset = parseInt(req.query.offset) || 0;
    const result = await pool.query(
      `SELECT id, workflow_id, status, started_at, completed_at, duration_ms, logs, error_message, step_results, trigger_type
       FROM workflow_executions WHERE workflow_id=$1 ORDER BY started_at DESC LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    );
    const countResult = await pool.query(
      `SELECT COUNT(*)::int as total FROM workflow_executions WHERE workflow_id=$1`,
      [req.params.id]
    );
    res.json({ executions: result.rows, total: countResult.rows[0].total, limit, offset });
  } catch (err) {
    logger.error('Failed to fetch executions:', err);
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

// PATCH /workflows/:id/status - Quick status toggle
router.patch('/workflows/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!status || !['active', 'disabled', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be active, disabled, or archived.' });
  }
  try {
    const result = await pool.query(
      `UPDATE workflows SET status=$1 WHERE id=$2 RETURNING id, name, status`,
      [status, req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Failed to toggle workflow status:', err);
    res.status(500).json({ error: 'Failed to update workflow status' });
  }
});

// POST /workflows/bulk-action - Batch operations
router.post('/workflows/bulk-action', async (req, res) => {
  const { action, workflow_ids } = req.body;
  if (!action || !Array.isArray(workflow_ids) || workflow_ids.length === 0) {
    return res.status(400).json({ error: 'action and workflow_ids[] are required' });
  }
  if (!['pause', 'resume', 'delete'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Must be pause, resume, or delete.' });
  }

  try {
    let affected = 0;
    if (action === 'delete') {
      const result = await pool.query(
        `DELETE FROM workflows WHERE id = ANY($1) RETURNING id`,
        [workflow_ids]
      );
      affected = result.rowCount;
    } else {
      const newStatus = action === 'pause' ? 'disabled' : 'active';
      const result = await pool.query(
        `UPDATE workflows SET status=$1 WHERE id = ANY($2) RETURNING id`,
        [newStatus, workflow_ids]
      );
      affected = result.rowCount;
    }
    res.json({ success: true, action, affected });
  } catch (err) {
    logger.error('Failed to perform bulk workflow action:', err);
    res.status(500).json({ error: 'Failed to perform bulk action' });
  }
});

// ─── WORKFLOW SEED DATA (auto-seed on first load) ─────────────────────────────

async function seedWorkflows() {
  try {
    const existing = await pool.query('SELECT COUNT(*) FROM workflows');
    if (parseInt(existing.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO workflows (name, description, trigger_type, status, execution_count, success_rate) VALUES
        ('Daily AI Report', 'Summarizes all tenant usage and sends email digest at 6am', 'scheduled', 'active', 24, 100),
        ('New Tenant Onboarding', 'Auto-sends welcome email, creates default agent, seeds KB', 'event', 'active', 12, 91.67),
        ('Weekly Backup Pipeline', 'Triggers DB snapshot, uploads to S3, verifies integrity', 'scheduled', 'active', 8, 100),
        ('GPU Alert Handler', 'When GPU > 90%, routes traffic to 8B model, alerts admin', 'event', 'active', 3, 66.67)
      `);
      logger.info('✅ Seeded default workflows');
    }
  } catch (err) {
    logger.error('Error seeding default workflows:', err);
  }
}
if (process.env.SEED_DATA === 'true') seedWorkflows();

// ─── KNOWLEDGE BASE SEED DATA (auto-seed on first load) ───────────────────────
async function seedKnowledge() {
  try {
    const existing = await pool.query('SELECT COUNT(*) FROM knowledge_bases');
    if (parseInt(existing.rows[0].count) === 0) {
      const tenants = await pool.query('SELECT id FROM tenants LIMIT 1');
      const tenantId = tenants.rows.length > 0 ? tenants.rows[0].id : null;

      const kb1 = await pool.query(
        `
        INSERT INTO knowledge_bases (name, description, tenant_id, index_status, total_documents, total_embeddings, storage_bytes)
        VALUES ('Xarwiz Technical Docs', 'RAG reference manuals for model optimization, latency profiling, and vLLM parameter setups.', $1, 'completed', 2, 420, 2450000)
        RETURNING id
      `,
        [tenantId]
      );

      const kb2 = await pool.query(
        `
        INSERT INTO knowledge_bases (name, description, tenant_id, index_status, total_documents, total_embeddings, storage_bytes)
        VALUES ('Xarwiz SaaS Platform Guide', 'Sovereign platform capabilities, billing features, and vector drive setup guides.', $1, 'completed', 2, 185, 984000)
        RETURNING id
      `,
        [tenantId]
      );

      if (kb1.rows.length > 0) {
        await pool.query(
          `
          INSERT INTO knowledge_documents (knowledge_base_id, filename, file_type, file_size_bytes, status, chunk_count, embedding_count) VALUES
          ($1, 'gpu_optimization_guide.pdf', 'pdf', 1850000, 'indexed', 250, 250),
          ($1, 'vllm_config_parameters.txt', 'txt', 600000, 'indexed', 170, 170)
        `,
          [kb1.rows[0].id]
        );
      }

      if (kb2.rows.length > 0) {
        await pool.query(
          `
          INSERT INTO knowledge_documents (knowledge_base_id, filename, file_type, file_size_bytes, status, chunk_count, embedding_count) VALUES
          ($1, 'tenant_provisioning_flow.docx', 'docx', 784000, 'indexed', 125, 125),
          ($1, 'stripe_payment_setup.md', 'md', 200000, 'indexed', 60, 60)
        `,
          [kb2.rows[0].id]
        );
      }
      logger.info('✅ Seeded default knowledge bases and documents');
    }
  } catch (err) {
    logger.error('Failed to seed knowledge base:', err);
  }
}
if (process.env.NODE_ENV !== 'production') seedKnowledge();

// ─── GPU MONITORING (Phase 3.1) ───────────────────────────────────────────────

router.get('/gpu', async (req, res) => {
  try {
    const { stdout } = await execPromise(
      'nvidia-smi --query-gpu=name,utilization.gpu,utilization.memory,memory.used,memory.total,temperature.gpu,power.draw,power.limit,fan.speed --format=csv,noheader,nounits 2>/dev/null || echo "NO_GPU"'
    );
    if (stdout.trim() === 'NO_GPU' || !stdout.trim()) {
      return res.json({
        gpus: [],
        message: 'No NVIDIA GPU detected on this host',
      });
    }
    const gpus = stdout
      .trim()
      .split('\n')
      .map((line, idx) => {
        const parts = line.split(',').map((s) => s.trim());
        return {
          index: idx,
          name: parts[0],
          utilization_gpu: parseInt(parts[1]) || 0,
          utilization_memory: parseInt(parts[2]) || 0,
          memory_used_mb: parseInt(parts[3]) || 0,
          memory_total_mb: parseInt(parts[4]) || 0,
          temperature_c: parseInt(parts[5]) || 0,
          power_draw_w: parseFloat(parts[6]) || 0,
          power_limit_w: parseFloat(parts[7]) || 0,
          fan_speed_pct: parseInt(parts[8]) || 0,
        };
      });
    let processes = [];
    try {
      const { stdout: pOut } = await execPromise(
        'nvidia-smi --query-compute-apps=gpu_uuid,pid,process_name,used_memory --format=csv,noheader,nounits 2>/dev/null'
      );
      processes = pOut
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((l) => {
          const p = l.split(',').map((s) => s.trim());
          return {
            gpu_uuid: p[0],
            pid: p[1],
            name: p[2],
            memory_mb: parseInt(p[3]) || 0,
          };
        });
    } catch (err) {
      logger.warn('Warning querying GPU processes:', err.message);
    }
    res.json({ gpus, processes });
  } catch (err) {
    res.json({ gpus: [], error: err.message });
  }
});

// ─── SECURITY CENTER (Phase 3.3) ─────────────────────────────────────────────

router.get('/security', async (req, res) => {
  try {
    // Failed login attempts from audit log
    const failedLogins = await pool
      .query(
        `
      SELECT ip_address, COUNT(*) as attempts, MAX(created_at) as last_attempt
      FROM admin_audit_log 
      WHERE action='LOGIN_FAILED' AND created_at > NOW() - INTERVAL '24 hours'
      GROUP BY ip_address ORDER BY attempts DESC LIMIT 20
    `
      )
      .catch(() => ({ rows: [] }));

    // Rate limit hits — count from Redis rate limit keys in ai_activity instead
    // (rate_limit_violations table does not exist; use ai_activity proxy)
    const rateLimitProxy = await pool
      .query(
        `
      SELECT COUNT(*) as total 
      FROM ai_activity 
      WHERE created_at > NOW() - INTERVAL '24 hours' AND status = 'failed'
    `
      )
      .catch(() => ({ rows: [{ total: 0 }] }));

    // Recent admin audit events
    const recentActivity = await pool
      .query(
        `
      SELECT action, target_type, ip_address, created_at, admin_id
      FROM admin_audit_log ORDER BY created_at DESC LIMIT 50
    `
      )
      .catch(() => ({ rows: [] }));

    // Unique suspicious IPs (multiple failed logins)
    const suspiciousIps = await pool
      .query(
        `
      SELECT ip_address, COUNT(*) as count 
      FROM admin_audit_log 
      WHERE action IN ('LOGIN_FAILED', 'UNAUTHORIZED') AND created_at > NOW() - INTERVAL '24 hours'
      GROUP BY ip_address HAVING COUNT(*) >= 3
    `
      )
      .catch(() => ({ rows: [] }));

    // Login success/fail breakdown
    const loginStats = await pool
      .query(
        `
      SELECT 
        COUNT(*) FILTER (WHERE action='LOGIN_FAILED') as failed,
        COUNT(*) FILTER (WHERE action='LOGIN') as success
      FROM admin_audit_log WHERE created_at > NOW() - INTERVAL '24 hours'
    `
      )
      .catch(() => ({ rows: [{ failed: 0, success: 0 }] }));

    res.json({
      failed_logins_24h: failedLogins.rows,
      failed_login_count_24h: parseInt(loginStats.rows[0]?.failed) || 0,
      successful_login_count_24h: parseInt(loginStats.rows[0]?.success) || 0,
      rate_limit_hits_24h: parseInt(rateLimitProxy.rows[0]?.total) || 0,
      suspicious_ips: suspiciousIps.rows,
      recent_activity: recentActivity.rows,
      audit_event_count: recentActivity.rows.length,
    });
  } catch (err) {
    logger.error('Security fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch security data' });
  }
});

// ─── NOTIFICATIONS (Phase 4.3) ────────────────────────────────────────────────

router.get('/notifications', async (req, res) => {
  try {
    const adminId = req.admin?.id;
    if (!adminId) return res.json({ notifications: [], unread_count: 0 });

    // Get notifications for this admin + system-wide notifications (user_id IS NULL)
    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id=$1 OR user_id IS NULL ORDER BY created_at DESC LIMIT 50`,
      [adminId]
    );
    const unread = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE (user_id=$1 OR user_id IS NULL) AND is_read=false`,
      [adminId]
    );
    res.json({
      notifications: result.rows,
      unread_count: parseInt(unread.rows[0].count),
    });
  } catch (err) {
    logger.error('Notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.patch('/notifications/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=true WHERE id=$1', [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

router.patch('/notifications/read-all', async (req, res) => {
  try {
    const adminId = req.admin?.id;
    await pool.query(
      'UPDATE notifications SET is_read=true WHERE user_id=$1 OR user_id IS NULL',
      [adminId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all read' });
  }
});

// POST /admin/notifications — create system notification (internal use)
router.post(
  '/notifications',
  validate(notificationSchema),
  async (req, res) => {
    const { user_id, type, title, message, link } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [user_id || null, type, title, message, link || null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create notification' });
    }
  }
);

// ─── INFRASTRUCTURE COSTS (Phase 4.1) ────────────────────────────────────────

router.get('/costs', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM infrastructure_costs ORDER BY created_at DESC LIMIT 100`
    );
    const summary = await pool.query(`
      SELECT category, SUM(amount) as total, currency
      FROM infrastructure_costs
      WHERE period_start >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY category, currency
    `);

    // Revenue vs costs
    const revenue = await pool
      .query(
        `
      SELECT COALESCE(SUM(amount), 0) as total FROM invoices 
      WHERE status='paid' AND paid_at >= DATE_TRUNC('month', CURRENT_DATE)
    `
      )
      .catch(() => ({ rows: [{ total: 0 }] }));

    const totalCosts = summary.rows.reduce(
      (sum, r) => sum + parseFloat(r.total),
      0
    );
    const totalRevenue = parseFloat(revenue.rows[0]?.total) || 0;

    res.json({
      costs: result.rows,
      monthly_summary: summary.rows,
      monthly_total_costs: totalCosts,
      monthly_revenue: totalRevenue,
      monthly_profit: totalRevenue - totalCosts,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch costs' });
  }
});

router.post('/costs', validate(costSchema), async (req, res) => {
  const { category, description, amount, currency, period_start, period_end } =
    req.body;
  try {
    const result = await pool.query(
      `INSERT INTO infrastructure_costs (category, description, amount, currency, period_start, period_end) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        category,
        description,
        amount,
        currency || 'INR',
        period_start,
        period_end,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add cost' });
  }
});

router.delete('/costs/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM infrastructure_costs WHERE id=$1', [
      req.params.id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete cost' });
  }
});

// ─── INTEGRATIONS (Phase 4.2) ─────────────────────────────────────────────────

router.get('/integrations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, t.name as tenant_name FROM integrations i
      LEFT JOIN tenants t ON i.tenant_id = t.id
      ORDER BY i.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

router.post('/integrations', validate(integrationSchema), async (req, res) => {
  const { provider, display_name, tenant_id, status } = req.body;
  try {
    // Check if already exists, update status if so
    const existing = await pool.query(
      'SELECT id FROM integrations WHERE provider=$1 AND (tenant_id=$2 OR tenant_id IS NULL) LIMIT 1',
      [provider, tenant_id || null]
    );
    if (existing.rows.length > 0) {
      const updated = await pool.query(
        `UPDATE integrations SET connection_status=$1, connected_at=NOW(), last_sync_at=NOW() WHERE id=$2 RETURNING *`,
        [status || 'connected', existing.rows[0].id]
      );
      return res.json(updated.rows[0]);
    }
    const result = await pool.query(
      `INSERT INTO integrations (provider, display_name, tenant_id, connection_status, connected_at, last_sync_at) VALUES ($1,$2,$3,$4,NOW(),NOW()) RETURNING *`,
      [provider, display_name, tenant_id || null, status || 'connected']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create integration' });
  }
});

// PATCH /admin/integrations/:id/connect — toggle to connected
router.patch('/integrations/:id/connect', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE integrations SET connection_status='connected', connected_at=NOW(), last_sync_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ error: 'Integration not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to connect integration' });
  }
});

router.delete('/integrations/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM integrations WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete integration' });
  }
});

// ─── VECTOR COLLECTIONS (Phase 3.2) ──────────────────────────────────────────

router.get('/vectors', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM vector_collections ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vector collections' });
  }
});

router.post('/vectors', validate(vectorSchema), async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO vector_collections (name, description) VALUES ($1,$2) RETURNING *`,
      [name, description]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

// ─── BACKUPS (Phase 5.2) ──────────────────────────────────────────────────────

router.get('/backups', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM backups ORDER BY created_at DESC LIMIT 50`
    );
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status='completed' OR status='verified') as completed,
        COUNT(*) FILTER (WHERE status='failed') as failed,
        COALESCE(SUM(size_bytes) FILTER (WHERE status='completed' OR status='verified'), 0) as total_bytes
      FROM backups
    `);
    res.json({ backups: result.rows, stats: stats.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch backups' });
  }
});

router.post('/backups', validate(backupSchema), async (req, res) => {
  const { name, type = 'full', retention_days = 30 } = req.body;
  try {
    const backupName = name || `backup_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}`;
    const backup = await pool.query(
      `INSERT INTO backups (name, type, status, retention_days, started_at) VALUES ($1,$2,'running',$3,NOW()) RETURNING *`,
      [backupName, type, retention_days]
    );
    const backupId = backup.rows[0].id;
    const storagePath = `/backups/${backupId}.sql.gz`;

    setImmediate(async () => {
      try {
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) throw new Error('DATABASE_URL not set');
        const { stdout } = await execPromise(
          `pg_dump "${dbUrl}" --no-owner --no-acl | gzip > "${storagePath}"`,
          { timeout: 300000 }
        );
        const { stdout: sizeOut } = await execPromise(`stat -c%s "${storagePath}" 2>/dev/null || stat -f%z "${storagePath}"`);
        const sizeBytes = parseInt(sizeOut.trim()) || 0;
        await pool.query(
          `UPDATE backups SET status='completed', completed_at=NOW(), size_bytes=$1, storage_path=$2 WHERE id=$3`,
          [sizeBytes, storagePath, backupId]
        );
        logger.info(`Backup ${backupId} completed: ${storagePath} (${sizeBytes} bytes)`);
      } catch (err) {
        logger.error(`Backup ${backupId} failed:`, err.message);
        await pool.query(
          `UPDATE backups SET status='failed', completed_at=NOW(), error_message=$1 WHERE id=$2`,
          [err.message, backupId]
        ).catch(() => {});
      }
    });
    res.json(backup.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger backup' });
  }
});

router.post('/backups/:id/verify', async (req, res) => {
  try {
    await pool.query(
      `UPDATE backups SET status='verified', verified_at=NOW() WHERE id=$1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify backup' });
  }
});

// ─── GLOBAL SEARCH (Phase 5.1) ────────────────────────────────────────────────

router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ results: [] });
  const term = `%${q}%`;
  try {
    const [tenants, agents, knowledge, wfResults, users] = await Promise.all([
      pool.query(
        `SELECT id, name, 'tenant' as type, email as subtitle FROM tenants WHERE name ILIKE $1 OR email ILIKE $1 LIMIT 5`,
        [term]
      ),
      pool.query(
        `SELECT id, name, 'agent' as type, model as subtitle FROM agents WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 5`,
        [term]
      ),
      pool.query(
        `SELECT id, name, 'knowledge_base' as type, description as subtitle FROM knowledge_bases WHERE name ILIKE $1 LIMIT 5`,
        [term]
      ),
      pool.query(
        `SELECT id, name, 'workflow' as type, description as subtitle FROM workflows WHERE name ILIKE $1 LIMIT 5`,
        [term]
      ),
      pool
        .query(
          `SELECT id, email as name, 'user' as type, role as subtitle FROM users WHERE email ILIKE $1 LIMIT 3`,
          [term]
        )
        .catch(() => ({ rows: [] })),
    ]);
    const results = [
      ...tenants.rows,
      ...agents.rows,
      ...knowledge.rows,
      ...wfResults.rows,
      ...users.rows,
    ].slice(0, 20);
    res.json({ results, query: q });
  } catch (err) {
    logger.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ─── ADMIN STATS (for enhanced KPI dashboard) ─────────────────────────────────

router.get('/stats/overview', async (req, res) => {
  try {
    const [tenants, apiKeys, agents, kbs, requests, tokens] = await Promise.all(
      [
        pool
          .query(`SELECT COUNT(*) FROM tenants WHERE status='active'`)
          .catch(() => ({ rows: [{ count: 0 }] })),
        pool
          .query(`SELECT COUNT(*) FROM tenant_api_keys WHERE is_active=true`)
          .catch(() => ({ rows: [{ count: 0 }] })),
        pool
          .query(`SELECT COUNT(*) FROM agents WHERE status='active'`)
          .catch(() => ({ rows: [{ count: 0 }] })),
        pool
          .query(`SELECT COUNT(*) FROM knowledge_bases WHERE status='active'`)
          .catch(() => ({ rows: [{ count: 0 }] })),
        pool
          .query(
            `SELECT COUNT(*) as count, COALESCE(AVG(latency_ms),0) as avg_latency FROM ai_activity WHERE DATE(created_at)=CURRENT_DATE`
          )
          .catch(() => ({ rows: [{ count: 0, avg_latency: 0 }] })),
        pool
          .query(
            `SELECT COALESCE(SUM(tokens_in+tokens_out),0) as total FROM ai_activity WHERE DATE(created_at)=CURRENT_DATE`
          )
          .catch(() => ({ rows: [{ total: 0 }] })),
      ]
    );
    res.json({
      active_tenants: parseInt(tenants.rows[0].count),
      active_api_keys: parseInt(apiKeys.rows[0].count),
      active_agents: parseInt(agents.rows[0].count),
      active_knowledge_bases: parseInt(kbs.rows[0].count),
      requests_today: parseInt(requests.rows[0].count),
      avg_response_ms: Math.round(parseFloat(requests.rows[0].avg_latency)),
      tokens_today: parseInt(tokens.rows[0].total),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── Session Management ──────────────────────────────────────
router.get('/sessions', async (req, res) => {
  try {
    const { tenant_id, user_id, status } = req.query;
    let query = `
      SELECT s.id, s.user_id, u.email as user_email, s.tenant_id, t.name as tenant_name,
             s.device_name, s.ip_address, s.user_agent, s.expires_at, s.revoked_at,
             s.last_active_at, s.created_at
      FROM user_sessions s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN tenants t ON t.id = s.tenant_id
      WHERE 1=1
    `;
    const params = [];
    if (tenant_id) {
      params.push(tenant_id);
      query += ` AND s.tenant_id = $${params.length}`;
    }
    if (user_id) {
      params.push(user_id);
      query += ` AND s.user_id = $${params.length}`;
    }
    if (status === 'active') {
      query += ` AND s.revoked_at IS NULL AND s.expires_at > NOW()`;
    } else if (status === 'revoked') {
      query += ` AND s.revoked_at IS NOT NULL`;
    } else if (status === 'expired') {
      query += ` AND s.revoked_at IS NULL AND s.expires_at <= NOW()`;
    }
    query += ` ORDER BY s.last_active_at DESC NULLS LAST LIMIT 200`;

    const result = await pool.query(query, params);
    const countResult = await pool.query(
      `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE revoked_at IS NULL AND expires_at > NOW()) as active FROM user_sessions`
    );
    res.json({
      sessions: result.rows,
      total: parseInt(countResult.rows[0].total),
      active: parseInt(countResult.rows[0].active),
    });
  } catch (err) {
    logger.error('Failed to fetch sessions:', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.post('/sessions/:id/revoke', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or already revoked' });
    }
    res.json({ success: true });
  } catch (err) {
    logger.error('Failed to revoke session:', err);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

router.post('/sessions/revoke-all', async (req, res) => {
  try {
    const { tenant_id, user_id } = req.body;
    let query = `UPDATE user_sessions SET revoked_at = NOW() WHERE revoked_at IS NULL AND expires_at > NOW()`;
    const params = [];
    if (tenant_id) {
      params.push(tenant_id);
      query += ` AND tenant_id = $${params.length}`;
    }
    if (user_id) {
      params.push(user_id);
      query += ` AND user_id = $${params.length}`;
    }
    const result = await pool.query(query, params);
    res.json({ success: true, revoked: result.rowCount });
  } catch (err) {
    logger.error('Failed to revoke sessions:', err);
    res.status(500).json({ error: 'Failed to revoke sessions' });
  }
});

export default router;
