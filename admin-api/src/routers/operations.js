import express from 'express';
import pg from 'pg';
import { exec } from 'child_process';
import util from 'util';
import axios from 'axios';

const router = express.Router();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const execPromise = util.promisify(exec);

const ollamaHost = process.env.OLLAMA_HOST || 'http://ollama:11434';

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
    if (tenant) { params.push(tenant); query += ` AND a.tenant_id = $${params.length}`; }
    if (model) { params.push(`%${model}%`); query += ` AND a.model ILIKE $${params.length}`; }
    if (status) { params.push(status); query += ` AND a.status = $${params.length}`; }
    query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    const result = await pool.query(query, params);

    // Summary stats
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

    res.json({ activity: result.rows, stats: stats.rows[0], total: result.rowCount });
  } catch (err) {
    console.error('Activity fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// POST /admin/activity (internal — log a new entry, called by tenant-api)
router.post('/activity', async (req, res) => {
  const { tenant_id, user_id, agent_id, model, status, tokens_in, tokens_out, latency_ms, gpu_percent, error_message } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO ai_activity (tenant_id, user_id, agent_id, model, status, tokens_in, tokens_out, latency_ms, gpu_percent, error_message, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [tenant_id, user_id, agent_id, model, status || 'completed', tokens_in || 0, tokens_out || 0, latency_ms, gpu_percent, error_message, status === 'completed' || status === 'failed' ? new Date() : null]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Activity log error:', err);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// GET /admin/activity/stream (SSE)
router.get('/activity/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const sendData = async () => {
    try {
      const result = await pool.query(`
        SELECT a.id, a.model, a.status, a.tokens_in, a.tokens_out, a.latency_ms, a.created_at, t.name as tenant_name
        FROM ai_activity a LEFT JOIN tenants t ON a.tenant_id = t.id
        ORDER BY a.created_at DESC LIMIT 25
      `);
      res.write(`data: ${JSON.stringify({ activity: result.rows, ts: Date.now() })}\n\n`);
    } catch {}
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
    await pool.query('DELETE FROM knowledge_bases WHERE id = $1', [req.params.id]);
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
    // Simulate async indexing
    setImmediate(async () => {
      try {
        await pool.query(`UPDATE knowledge_documents SET status='processing' WHERE id=$1`, [doc.rows[0].id]);
        await new Promise(r => setTimeout(r, 2000));
        const chunks = Math.max(1, Math.ceil(file_size_bytes / 1000));
        await pool.query(
          `UPDATE knowledge_documents SET status='indexed', chunk_count=$1, embedding_count=$2 WHERE id=$3`,
          [chunks, chunks, doc.rows[0].id]
        );
        await pool.query(
          `UPDATE knowledge_bases SET total_documents = total_documents + 1, total_embeddings = total_embeddings + $1, 
           storage_bytes = storage_bytes + $2, index_status='completed', last_sync_at=NOW() WHERE id=$3`,
          [chunks, file_size_bytes, req.params.id]
        );
      } catch {}
    });
    res.json(doc.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add document' });
  }
});

router.delete('/knowledge/:id/documents/:docId', async (req, res) => {
  try {
    await pool.query('DELETE FROM knowledge_documents WHERE id = $1', [req.params.docId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// ─── PLAYGROUND (Phase 2.1) ───────────────────────────────────────────────────

router.post('/playground/chat', async (req, res) => {
  const { model, system_prompt, user_message, temperature = 0.7, max_tokens = 2048, agent_id } = req.body;
  if (!user_message) return res.status(400).json({ error: 'user_message is required' });

  const startTime = Date.now();
  const selectedModel = model || 'harikson-plus';

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  try {
    const messages = [
      { role: 'system', content: system_prompt || 'You are a helpful AI assistant.' },
      { role: 'user', content: user_message }
    ];

    const response = await axios.post(`${ollamaHost}/api/chat`, {
      model: selectedModel, messages, stream: true,
      options: { temperature: parseFloat(temperature), num_predict: parseInt(max_tokens) }
    }, { responseType: 'stream', timeout: 180000 });

    let fullText = '', tokensOut = 0;
    response.data.on('data', (chunk) => {
      chunk.toString().split('\n').filter(Boolean).forEach(line => {
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) { fullText += parsed.message.content; res.write(parsed.message.content); }
          if (parsed.done) tokensOut = parsed.eval_count || Math.ceil(fullText.length / 4);
        } catch {}
      });
    });
    response.data.on('end', async () => {
      const latency = Date.now() - startTime;
      const tokensIn = Math.ceil((system_prompt || '').length / 4) + Math.ceil(user_message.length / 4);
      try {
        await pool.query(
          `INSERT INTO playground_sessions (model, agent_id, system_prompt, messages, tokens_in, tokens_out, latency_ms) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [selectedModel, agent_id || null, system_prompt, JSON.stringify([{ role: 'user', content: user_message }, { role: 'assistant', content: fullText }]), tokensIn, tokensOut, latency]
        );
      } catch {}
      res.setHeader('X-Tokens-In', tokensIn);
      res.setHeader('X-Tokens-Out', tokensOut);
      res.setHeader('X-Latency-Ms', latency);
      res.end();
    });
  } catch (err) {
    console.error('Playground chat error:', err);
    res.status(500).json({ error: 'Inference failed', details: err.message });
  }
});

router.get('/playground/sessions', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, model, agent_id, system_prompt, tokens_in, tokens_out, latency_ms, created_at FROM playground_sessions ORDER BY created_at DESC LIMIT 50`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// ─── WORKFLOWS (Phase 2.2) ────────────────────────────────────────────────────

router.get('/workflows', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT w.*, t.name as tenant_name,
        (SELECT COUNT(*) FROM workflow_executions we WHERE we.workflow_id = w.id) as total_runs,
        (SELECT we2.status FROM workflow_executions we2 WHERE we2.workflow_id = w.id ORDER BY started_at DESC LIMIT 1) as last_status
      FROM workflows w LEFT JOIN tenants t ON w.tenant_id = t.id
      ORDER BY w.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

router.post('/workflows', async (req, res) => {
  const { name, description, trigger_type, steps, tenant_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  try {
    const result = await pool.query(
      `INSERT INTO workflows (name, description, trigger_type, steps, tenant_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, description, trigger_type || 'manual', JSON.stringify(steps || []), tenant_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

router.put('/workflows/:id', async (req, res) => {
  const { name, description, trigger_type, steps, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE workflows SET name=COALESCE($1,name), description=COALESCE($2,description), trigger_type=COALESCE($3,trigger_type), steps=COALESCE($4,steps), status=COALESCE($5,status) WHERE id=$6 RETURNING *`,
      [name, description, trigger_type, steps ? JSON.stringify(steps) : null, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

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
    const wf = await pool.query('SELECT * FROM workflows WHERE id=$1', [req.params.id]);
    if (!wf.rows.length) return res.status(404).json({ error: 'Workflow not found' });

    const exec = await pool.query(
      `INSERT INTO workflow_executions (workflow_id, status, started_at) VALUES ($1,'running',NOW()) RETURNING *`,
      [req.params.id]
    );

    // Simulate execution
    setImmediate(async () => {
      const start = Date.now();
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 3000));
      const success = Math.random() > 0.15;
      const duration = Date.now() - start;
      await pool.query(
        `UPDATE workflow_executions SET status=$1, completed_at=NOW(), duration_ms=$2, logs=$3, error_message=$4 WHERE id=$5`,
        [success ? 'completed' : 'failed', duration, 'Workflow executed successfully.', success ? null : 'Random step failure', exec.rows[0].id]
      );
      await pool.query(
        `UPDATE workflows SET execution_count=execution_count+1, last_execution_at=NOW() WHERE id=$1`,
        [req.params.id]
      );
    });

    res.json({ execution: exec.rows[0], message: 'Workflow started' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to run workflow' });
  }
});

router.get('/workflows/:id/executions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM workflow_executions WHERE workflow_id=$1 ORDER BY started_at DESC LIMIT 25`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
});

// ─── GPU MONITORING (Phase 3.1) ───────────────────────────────────────────────

router.get('/gpu', async (req, res) => {
  try {
    const { stdout } = await execPromise('nvidia-smi --query-gpu=name,utilization.gpu,utilization.memory,memory.used,memory.total,temperature.gpu,power.draw,power.limit,fan.speed --format=csv,noheader,nounits 2>/dev/null || echo "NO_GPU"');
    if (stdout.trim() === 'NO_GPU' || !stdout.trim()) {
      return res.json({ gpus: [], message: 'No NVIDIA GPU detected' });
    }
    const gpus = stdout.trim().split('\n').map((line, idx) => {
      const parts = line.split(',').map(s => s.trim());
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
        fan_speed_pct: parseInt(parts[8]) || 0
      };
    });
    // Get running processes
    let processes = [];
    try {
      const { stdout: pOut } = await execPromise('nvidia-smi --query-compute-apps=gpu_uuid,pid,process_name,used_memory --format=csv,noheader,nounits 2>/dev/null');
      processes = pOut.trim().split('\n').filter(Boolean).map(l => {
        const p = l.split(',').map(s => s.trim());
        return { gpu_uuid: p[0], pid: p[1], name: p[2], memory_mb: parseInt(p[3]) || 0 };
      });
    } catch {}
    res.json({ gpus, processes });
  } catch (err) {
    res.json({ gpus: [], error: err.message });
  }
});

// ─── SECURITY CENTER (Phase 3.3) ─────────────────────────────────────────────

router.get('/security', async (req, res) => {
  try {
    const [failedLogins, rateLimits, recentActivity] = await Promise.all([
      pool.query(`
        SELECT ip_address, COUNT(*) as attempts, MAX(created_at) as last_attempt
        FROM admin_audit_log WHERE action='LOGIN_FAILED' AND created_at > NOW() - INTERVAL '24 hours'
        GROUP BY ip_address ORDER BY attempts DESC LIMIT 20
      `).catch(() => ({ rows: [] })),
      pool.query(`
        SELECT COUNT(*) as total FROM rate_limit_violations WHERE created_at > NOW() - INTERVAL '24 hours'
      `).catch(() => ({ rows: [{ total: 0 }] })),
      pool.query(`
        SELECT action, target_type, ip_address, created_at
        FROM admin_audit_log ORDER BY created_at DESC LIMIT 50
      `).catch(() => ({ rows: [] }))
    ]);

    res.json({
      failed_logins_24h: failedLogins.rows,
      rate_limit_hits_24h: parseInt(rateLimits.rows[0]?.total) || 0,
      recent_activity: recentActivity.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch security data' });
  }
});

// ─── NOTIFICATIONS (Phase 4.3) ────────────────────────────────────────────────

router.get('/notifications', async (req, res) => {
  try {
    // Get admin user id from token
    const userId = req.user?.userId;
    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    const unread = await pool.query(`SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false`, [userId]);
    res.json({ notifications: result.rows, unread_count: parseInt(unread.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.patch('/notifications/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=true WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

router.patch('/notifications/read-all', async (req, res) => {
  try {
    const userId = req.user?.userId;
    await pool.query('UPDATE notifications SET is_read=true WHERE user_id=$1', [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all read' });
  }
});

// ─── INFRASTRUCTURE COSTS (Phase 4.1) ────────────────────────────────────────

router.get('/costs', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM infrastructure_costs ORDER BY created_at DESC LIMIT 100`);
    const summary = await pool.query(`
      SELECT category, SUM(amount) as total, currency
      FROM infrastructure_costs
      WHERE period_start >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY category, currency
    `);
    res.json({ costs: result.rows, monthly_summary: summary.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch costs' });
  }
});

router.post('/costs', async (req, res) => {
  const { category, description, amount, currency, period_start, period_end } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO infrastructure_costs (category, description, amount, currency, period_start, period_end) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [category, description, amount, currency || 'INR', period_start, period_end]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add cost' });
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

router.post('/integrations', async (req, res) => {
  const { provider, display_name, tenant_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO integrations (provider, display_name, tenant_id, connection_status) VALUES ($1,$2,$3,'disconnected') RETURNING *`,
      [provider, display_name, tenant_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create integration' });
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
    const result = await pool.query(`SELECT * FROM vector_collections ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vector collections' });
  }
});

router.post('/vectors', async (req, res) => {
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
    const result = await pool.query(`SELECT * FROM backups ORDER BY created_at DESC LIMIT 50`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch backups' });
  }
});

router.post('/backups', async (req, res) => {
  const { name, type = 'full', retention_days = 30 } = req.body;
  try {
    const backup = await pool.query(
      `INSERT INTO backups (name, type, status, retention_days, started_at) VALUES ($1,$2,'running',$3,NOW()) RETURNING *`,
      [name || `backup_${new Date().toISOString().slice(0,10)}`, type, retention_days]
    );

    // Simulate async backup
    setImmediate(async () => {
      await new Promise(r => setTimeout(r, 3000));
      const sizeBytes = Math.floor(Math.random() * 500000000) + 100000000;
      await pool.query(
        `UPDATE backups SET status='completed', completed_at=NOW(), size_bytes=$1, storage_path=$2 WHERE id=$3`,
        [sizeBytes, `/backups/${backup.rows[0].id}.tar.gz`, backup.rows[0].id]
      );
    });

    res.json(backup.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger backup' });
  }
});

router.post('/backups/:id/verify', async (req, res) => {
  try {
    await pool.query(`UPDATE backups SET status='verified', verified_at=NOW() WHERE id=$1`, [req.params.id]);
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
    const [tenants, agents, knowledge, workflows] = await Promise.all([
      pool.query(`SELECT id, name, 'tenant' as type, email as subtitle FROM tenants WHERE name ILIKE $1 OR email ILIKE $1 LIMIT 5`, [term]),
      pool.query(`SELECT id, name, 'agent' as type, model as subtitle FROM agents WHERE name ILIKE $1 OR description ILIKE $1 LIMIT 5`, [term]),
      pool.query(`SELECT id, name, 'knowledge_base' as type, description as subtitle FROM knowledge_bases WHERE name ILIKE $1 LIMIT 5`, [term]),
      pool.query(`SELECT id, name, 'workflow' as type, description as subtitle FROM workflows WHERE name ILIKE $1 LIMIT 5`, [term])
    ]);
    const results = [
      ...tenants.rows, ...agents.rows, ...knowledge.rows, ...workflows.rows
    ].slice(0, 20);
    res.json({ results, query: q });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
