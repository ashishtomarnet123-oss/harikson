import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import os from "os";
import { exec, spawn } from "child_process";
import util from "util";
import pool from "../db.js";
import redis from "../redis.js";
import logger from "../utils/logger.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { sanitizeCsvCell } from "../utils/csv.js";
import { logAdminAction } from "../utils/auditLogger.js";
import { getBillingMetricsPrometheusText } from "../services/billingMetrics.js";

const execPromise = util.promisify(exec);
const router = express.Router();
router.post('/admin/cleanup', adminAuth, async (req, res) => {
  try {
    const tenantApiUrl = process.env.TENANT_API_URL || 'http://tenant-api:3008';
    const internalSecret = process.env.INTERNAL_API_SECRET;
    if (!internalSecret) {
      return res.status(503).json({ error: 'INTERNAL_API_SECRET is not configured on admin-api' });
    }

    const response = await fetch(`${tenantApiUrl}/api/admin/cleanup`, {
      method: 'POST',
      headers: { 'x-internal-secret': internalSecret },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || 'Manual cleanup failed', message: data.message });
    }

    res.status(200).json({
      success: true,
      message: 'Manual database cleanup completed successfully',
      deleted: data.deleted || {},
    });
  } catch (err) {
    logger.error('Manual cleanup execution error:', err);
    res.status(500).json({ error: 'Manual cleanup failed', message: err.message });
  }
});


router.post('/admin/documents/rotate-keys', adminAuth, async (req, res) => {
  try {
    const { newKeyId = 'v2', batchSize = 100 } = req.body || {};

    const docsRes = await pool.query(
      `SELECT id, content, content_iv, content_tag, key_id
       FROM knowledge_documents
       WHERE key_id IS NULL OR key_id != $1
       LIMIT $2`,
      [newKeyId, parseInt(batchSize)]
    );

    let processed = 0;
    const masterKey = process.env.TENANT_MASTER_KEY || process.env.JWT_SECRET;
    if (!masterKey) {
      return res.status(500).json({ error: 'TENANT_MASTER_KEY or JWT_SECRET must be set for encryption operations' });
    }

    for (const doc of docsRes.rows) {
      let plainText = doc.content;

      // Decrypt if previously encrypted
      if (doc.content_iv && doc.content_tag) {
        try {
          const oldSalt = `${doc.id}:${doc.key_id || 'v1'}`;
          const oldDerivedKey = crypto.pbkdf2Sync(masterKey, oldSalt, 100000, 32, 'sha256');
          const decipher = crypto.createDecipheriv('aes-256-gcm', oldDerivedKey, Buffer.from(doc.content_iv, 'hex'));
          decipher.setAuthTag(Buffer.from(doc.content_tag, 'hex'));
          plainText = decipher.update(doc.content, 'hex', 'utf8') + decipher.final('utf8');
        } catch (decErr) {
          logger.warn(`Failed to decrypt doc ${doc.id} during key rotation:`, decErr.message);
          continue;
        }
      }

      // Re-encrypt with new key version
      const newSalt = `${doc.id}:${newKeyId}`;
      const newDerivedKey = crypto.pbkdf2Sync(masterKey, newSalt, 100000, 32, 'sha256');
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', newDerivedKey, iv);
      let encrypted = cipher.update(plainText, 'utf8', 'hex') + cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');

      await pool.query(
        `UPDATE knowledge_documents
         SET content = $1, content_iv = $2, content_tag = $3, key_id = $4
         WHERE id = $5`,
        [encrypted, iv.toString('hex'), authTag, newKeyId, doc.id]
      );

      await redis.del(`cache:doc:${doc.id}`).catch(() => {});
      processed++;
    }

    const remainingRes = await pool.query(
      `SELECT COUNT(*)::int as count FROM knowledge_documents WHERE key_id IS NULL OR key_id != $1`,
      [newKeyId]
    );

    const remaining = remainingRes.rows[0]?.count || 0;

    logger.info(`🔄 [KEY ROTATION] Processed ${processed} documents with target key '${newKeyId}'. Remaining: ${remaining}`);

    res.status(200).json({
      success: true,
      message: `Batch document re-encryption completed. Processed ${processed} documents.`,
      targetKeyId: newKeyId,
      processed,
      remaining,
    });
  } catch (err) {
    logger.error('Document key rotation error:', err);
    res.status(500).json({ error: 'Failed to rotate document encryption keys', message: err.message });
  }
});

router.get('/admin/widget/analytics', adminAuth, async (req, res) => {
  try {
    const { tenantId } = req.query;
    let query = `
      SELECT wa.id, wa.tenant_id, t.name as tenant_name, t.slug as tenant_slug,
             wa.origin, wa.messages_sent, wa.sessions_count, wa.unique_users_count, wa.last_activity_at
      FROM widget_analytics wa
      JOIN tenants t ON wa.tenant_id = t.id
    `;
    const params = [];

    if (tenantId) {
      params.push(tenantId);
      query += ` WHERE wa.tenant_id = $1`;
    }

    query += ` ORDER BY wa.last_activity_at DESC LIMIT 100`;

    const result = await pool.query(query, params);
    res.status(200).json({
      success: true,
      analytics: result.rows,
    });
  } catch (err) {
    logger.error('Fetch widget analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch widget analytics', message: err.message });
  }
});


router.get('/admin/token-analytics', adminAuth, async (req, res) => {
  try {
    const { tenantId } = req.query;

    const perModelQuery = `
      SELECT
        COALESCE(m.metadata->>'model', 'qwen3-coder') as model,
        COUNT(*)::int as request_count,
        ROUND(AVG(prompt_tokens))::int as avg_prompt_tokens,
        ROUND(AVG(completion_tokens))::int as avg_completion_tokens,
        ROUND(AVG(tokens_used))::int as avg_total_tokens,
        SUM(tokens_used)::bigint as total_tokens
      FROM messages m
      ${tenantId ? 'WHERE m.tenant_id = $1' : ''}
      GROUP BY 1 ORDER BY total_tokens DESC
    `;

    const perUserQuery = `
      SELECT
        u.id as user_id, u.email, u.name,
        DATE_TRUNC('month', m.created_at) as month,
        SUM(m.prompt_tokens)::bigint as prompt_tokens,
        SUM(m.completion_tokens)::bigint as completion_tokens,
        SUM(m.tokens_used)::bigint as total_tokens
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      JOIN users u ON c.user_id = u.id
      ${tenantId ? 'WHERE m.tenant_id = $1' : ''}
      GROUP BY u.id, u.email, u.name, 4
      ORDER BY 4 DESC, total_tokens DESC LIMIT 50
    `;

    const ragQuery = `
      SELECT
        kd.id as document_id, kd.filename, kd.file_type,
        COUNT(de.id)::int as chunk_count,
        COALESCE(SUM(LENGTH(de.content) / 4), 0)::bigint as estimated_tokens_contributed
      FROM knowledge_documents kd
      LEFT JOIN document_embeddings de ON de.knowledge_document_id = kd.id
      ${tenantId ? 'WHERE kd.tenant_id = $1' : ''}
      GROUP BY kd.id, kd.filename, kd.file_type
      ORDER BY estimated_tokens_contributed DESC LIMIT 50
    `;

    const params = tenantId ? [tenantId] : [];

    const [perModel, perUser, ragDocs] = await Promise.all([
      pool.query(perModelQuery, params),
      pool.query(perUserQuery, params),
      pool.query(ragQuery, params),
    ]);

    res.status(200).json({
      success: true,
      byModel: perModel.rows,
      byUserMonthly: perUser.rows,
      byRagDocument: ragDocs.rows,
    });
  } catch (err) {
    logger.error('Fetch token analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch token analytics', message: err.message });
  }
});


function parseCookies(cookieStr) {
  const cookies = {};
  if (!cookieStr) return cookies;
  cookieStr.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      cookies[pair.substring(0, idx).trim()] = pair.substring(idx + 1).trim();
    }
  });
  return cookies;
}

// Middleware: Metrics Auth / IP Whitelist Guard for /admin/metrics
const metricsAuthGuard = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  // No hardcoded fallback: if METRICS_BEARER_TOKEN isn't set, this layer simply
  // never matches (Bearer <undefined env var> can't equal any real header) and
  // falls through to admin-JWT / IP-whitelist checks below.
  const expectedToken = process.env.METRICS_BEARER_TOKEN;

  // 1. Bearer Token Auth (for Prometheus scrape job)
  if (expectedToken && authHeader === `Bearer ${expectedToken}`) {
    return next();
  }

  // 2. Admin JWT Cookie / Header Auth (for logged-in admin users) — reuses the
  // same cookie names and secret as adminAuth.js; this previously checked a
  // cookie name and secret that the login flow never actually sets/signs,
  // which made this branch permanently dead code.
  const cookies = parseCookies(req.headers.cookie || '');
  const token =
    cookies.admin_access_token ||
    cookies.admin_token ||
    (authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);
  if (token && process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded && (decoded.role === 'admin' || decoded.role === 'superadmin' || decoded.role === 'founder')) {
        req.admin = decoded;
        return next();
      }
    } catch (e) {
      // Invalid token, fall through to IP check
    }
  }

  // 3. IP Whitelist check (allow Docker container network 172.x.x.x, loopback 127.0.0.1, ::1)
  // Use socket address only — X-Forwarded-For is trivially spoofable by external clients.
  const rawIp = (req.socket.remoteAddress || '').toString();
  const cleanIp = rawIp.replace(/^::ffff:/, '').trim();

  const isInternalIp =
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp.startsWith('172.') ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('192.168.');

  if (isInternalIp) {
    return next();
  }

  logger.warn(`🚨 Unauthorized access attempt to /admin/metrics from IP: ${cleanIp}`);
  return res.status(403).json({
    error: 'Access Denied: /admin/metrics requires Bearer token or internal Prometheus network access',
  });
};

// GET /admin/metrics - Secured Prometheus Metrics Scrape Endpoint
router.get('/admin/metrics', metricsAuthGuard, async (req, res) => {
  try {
    let dbStatusGauge = 1;
    let activeTenants = 0;
    let totalUsers = 0;
    let activeAgents = 0;
    let totalKbs = 0;

    try {
      const tenants = await pool.query("SELECT COUNT(*) FROM tenants WHERE status='active'");
      activeTenants = parseInt(tenants.rows[0]?.count, 10) || 0;
    } catch (dbErr) {
      dbStatusGauge = 0;
      logger.warn('[METRICS] Failed to query active tenants for metrics:', dbErr.message);
    }

    try {
      const users = await pool.query("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL");
      totalUsers = parseInt(users.rows[0]?.count, 10) || 0;
    } catch (dbErr) {
      dbStatusGauge = 0;
      logger.warn('[METRICS] Failed to query total users for metrics:', dbErr.message);
    }

    try {
      const agents = await pool.query("SELECT COUNT(*) FROM agents WHERE status='active'");
      activeAgents = parseInt(agents.rows[0]?.count, 10) || 0;
    } catch (dbErr) {
      dbStatusGauge = 0;
      logger.warn('[METRICS] Failed to query active agents for metrics:', dbErr.message);
    }

    try {
      const kbs = await pool.query("SELECT COUNT(*) FROM knowledge_bases");
      totalKbs = parseInt(kbs.rows[0]?.count, 10) || 0;
    } catch (dbErr) {
      dbStatusGauge = 0;
      logger.warn('[METRICS] Failed to query knowledge bases for metrics:', dbErr.message);
    }

    const memTotal = Math.round(os.totalmem() / (1024 * 1024));
    const memFree = Math.round(os.freemem() / (1024 * 1024));
    const memUsed = memTotal - memFree;
    const cpuLoad = os.loadavg()[0] || 0;

    let billingMetricsText = '';
    try {
      billingMetricsText = await getBillingMetricsPrometheusText(pool);
    } catch (metricsErr) {
      logger.warn('[METRICS] Failed to generate billing metrics text:', metricsErr.message);
      billingMetricsText = await getBillingMetricsPrometheusText(null);
    }

    const metricsText = [
      '# HELP system_cpu_load System 1-minute CPU load average',
      '# TYPE system_cpu_load gauge',
      `system_cpu_load ${cpuLoad.toFixed(2)}`,
      '',
      '# HELP system_memory_used_mb System memory used in MB',
      '# TYPE system_memory_used_mb gauge',
      `system_memory_used_mb ${memUsed}`,
      '',
      '# HELP system_memory_total_mb System total memory in MB',
      '# TYPE system_memory_total_mb gauge',
      `system_memory_total_mb ${memTotal}`,
      '',
      '# HELP harikson_database_metrics_query_success Database query status for metrics scrape (1=success, 0=query failure)',
      '# TYPE harikson_database_metrics_query_success gauge',
      `harikson_database_metrics_query_success ${dbStatusGauge}`,
      '',
      '# HELP harikson_active_tenants_total Total active tenants count',
      '# TYPE harikson_active_tenants_total gauge',
      `harikson_active_tenants_total ${activeTenants}`,
      '',
      '# HELP harikson_total_users Total active users count',
      '# TYPE harikson_total_users gauge',
      `harikson_total_users ${totalUsers}`,
      '',
      '# HELP harikson_active_agents_total Total active agents count',
      '# TYPE harikson_active_agents_total gauge',
      `harikson_active_agents_total ${activeAgents}`,
      '',
      '# HELP harikson_knowledge_bases_total Total knowledge bases count',
      '# TYPE harikson_knowledge_bases_total gauge',
      `harikson_knowledge_bases_total ${totalKbs}`,
      '',
      billingMetricsText
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.status(200).send(metricsText);
  } catch (err) {
    logger.error('Failed to generate Prometheus metrics:', err);
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.status(500).send('# ERROR: Failed to generate metrics\n');
  }
});

router.get('/admin/kpis', adminAuth, async (req, res) => {
  try {
    const tenants = await pool.query(
      "SELECT COUNT(*) FROM tenants WHERE status='active'"
    );
    const keys = await pool.query(
      "SELECT COUNT(*) FROM tenant_api_keys WHERE status='active'"
    );
    const agents = await pool.query(
      "SELECT COUNT(*) FROM agents WHERE status='active'"
    );
    const kbs = await pool.query('SELECT COUNT(*) FROM knowledge_bases');

    // For requests/tokens today, query messages table where created_at > CURRENT_DATE
    const usage = await pool.query(`
      SELECT COUNT(*) as requests, SUM(tokens_used) as tokens
      FROM messages
      WHERE created_at >= CURRENT_DATE
    `);

    const revenue = await pool.query(`
      SELECT SUM(amount) as revenue
      FROM invoices
      WHERE paid_at >= CURRENT_DATE AND status='paid'
    `);

    res.json({
      activeTenants: parseInt(tenants.rows[0].count),
      activeKeys: parseInt(keys.rows[0].count),
      activeAgents: parseInt(agents.rows[0].count),
      knowledgeBases: parseInt(kbs.rows[0].count),
      requestsToday: parseInt(usage.rows[0].requests || 0),
      tokensToday: parseInt(usage.rows[0].tokens || 0),
      revenueToday: parseFloat(revenue.rows[0].revenue || 0),
    });
  } catch (err) {
    logger.error('Failed to get KPIs:', err);
    res.status(500).json({ error: 'Failed to fetch KPIs' });
  }
});


router.get('/admin/system-status', adminAuth, async (req, res) => {
  const cacheKey = 'admin:system-status';
  try {
    let cached = null;
    try {
      cached = await redis.get(cacheKey);
    } catch (err) {
      logger.warn('Redis cache get system-status failed, bypassing:', err.message);
    }
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    // Measure system metrics using shell commands and OS queries
    let gpu_used = 0,
      gpu_total = 0;
    let ram_used = 0,
      ram_total = 0;
    let cpu_percent = 0;
    let disk_used = 0,
      disk_total = 0;
    let uptime = '0d:0h:0m';
    let vllm_status = 'inactive';
    let active_model = 'None';
    let queue_depth = 0;
    let tensor_parallel = 1;

    // 1.1 CPU Load Calculation
    try {
      const load = os.loadavg();
      cpu_percent = Math.min(
        100,
        Math.round((load[0] / os.cpus().length) * 100)
      );
    } catch (e) {
      cpu_percent = null;
    }

    // 1.2 Memory Utilization
    try {
      ram_total = Math.round(os.totalmem() / (1024 * 1024));
      ram_used = Math.round((os.totalmem() - os.freemem()) / (1024 * 1024));
    } catch (e) {
      ram_total = null;
      ram_used = null;
    }

    // 1.3 Disk Usage
    try {
      const { stdout } = await execPromise('df -h /');
      const lines = stdout.split('\n');
      if (lines.length > 1) {
        const diskLine = lines[1].split(/\s+/);
        const totalStr = diskLine[1];
        const usedStr = diskLine[2];
        disk_total = totalStr ? parseInt(totalStr.replace(/[^0-9]/g, '')) || null : null;
        disk_used = usedStr ? parseInt(usedStr.replace(/[^0-9]/g, '')) || null : null;
      } else {
        disk_total = null;
        disk_used = null;
      }
    } catch (e) {
      disk_total = null;
      disk_used = null;
    }

    // 1.4 System Uptime
    try {
      const upt = os.uptime();
      const days = Math.floor(upt / (24 * 3600));
      const hours = Math.floor((upt % (24 * 3600)) / 3600);
      const minutes = Math.floor((upt % 3600) / 60);
      uptime = `${days}d:${hours}h:${minutes}m`;
    } catch (e) {
      uptime = 'Unavailable';
    }

    // 1.5 check Ollama Status
    try {
      const ollamaHost = process.env.OLLAMA_HOST || 'http://ollama:11434';
      const resp = await fetch(`${ollamaHost}/api/ps`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.models && data.models.length > 0) {
          vllm_status = 'active'; // kept as vllm_status for frontend compatibility
          active_model = data.models[0].name;
          gpu_used = Math.round(
            (data.models[0].size_vram || 0) / (1024 * 1024)
          );
          if (gpu_used === 0) {
            // fallback if size_vram is missing
            gpu_used = active_model.includes('32b')
              ? 20480
              : active_model.includes('14b')
                ? 9216
                : active_model.includes('8b')
                  ? 6144
                  : 2048;
          }
        }
      }
    } catch (e) {
      logger.error('Failed to ping Ollama:', e.message);
    }

    const payload = {
      gpu: { used: gpu_used, total: gpu_total },
      ram: { used: ram_used, total: ram_total },
      cpu: { percent: cpu_percent },
      disk: { used: disk_used, total: disk_total },
      uptime,
      vllm_status,
      active_model,
      queue: queue_depth,
      tensor_parallel,
    };

    // Cache metrics in Redis for 5 seconds
    try {
      await redis.setex(cacheKey, 5, JSON.stringify(payload));
    } catch (err) {
      logger.warn('Redis cache set system-status failed:', err.message);
    }

    // Save to historical metrics table for graphing
    await pool.query(
      `INSERT INTO system_metrics (gpu_vram_used_mb, gpu_vram_total_mb, ram_used_mb, ram_total_mb, cpu_percent, disk_used_gb, disk_total_gb, active_model, vllm_status, tensor_parallel_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        gpu_used,
        gpu_total,
        ram_used,
        ram_total,
        cpu_percent,
        disk_used,
        disk_total,
        active_model,
        vllm_status,
        tensor_parallel,
      ]
    );

    res.status(200).json(payload);
  } catch (err) {
    logger.error('Failed to query system status:', err);
    res.status(500).json({ error: 'Failed to retrieve system status metrics' });
  }
});


router.post('/admin/models/:name/load', adminAuth, async (req, res) => {
  const { name } = req.params;
  if (!ALLOWED_MODELS.includes(name)) {
    return res.status(400).json({ error: `Invalid model name. Allowed: ${ALLOWED_MODELS.join(', ')}` });
  }
  try {
    logger.info(
      `🤖 Spawning vLLM OpenAI API Server for model Qwen/${name}-Instruct`
    );

    // Unload all active vLLM processes first
    await execPromise("pkill -f 'vllm.entrypoints'").catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Spawn the vLLM process (asynchronous run to keep server responsive)
    const vllmProcess = spawn(
      'python',
      [
        '-m',
        'vllm.entrypoints.openai.api_server',
        '--model',
        `Qwen/${name}-Instruct`,
        '--quantization',
        'awq',
        '--max-model-len',
        '32768',
        '--tensor-parallel-size',
        '1',
        '--gpu-memory-utilization',
        '0.90',
        '--enable-chunked-prefill',
        '--port',
        '8000',
      ],
      {
        detached: true,
        stdio: 'ignore',
      }
    );
    vllmProcess.unref();

    await logAdminAction(
      req.admin.id,
      'model_load',
      'model',
      name,
      null,
      { name, active: true },
      req
    );

    res.status(200).json({
      success: true,
      message: `vLLM model load process triggered for ${name}`,
    });
  } catch (err) {
    logger.error('Failed to trigger model load:', err);
    res.status(500).json({ error: 'Failed to load model weights' });
  }
});

// 3. POST /admin/models/:name/unload
router.post('/admin/models/:name/unload', adminAuth, async (req, res) => {
  const { name } = req.params;
  try {
    // Kill the vLLM processes gracefully
    await execPromise("pkill -f 'vllm.entrypoints'").catch(() => {});

    await logAdminAction(
      req.admin.id,
      'model_unload',
      'model',
      name,
      { name, active: true },
      null,
      req
    );

    res
      .status(200)
      .json({ success: true, message: `Model ${name} unloaded successfully` });
  } catch (err) {
    logger.error('Failed to unload model:', err);
    res.status(500).json({ error: 'Failed to unload model weights' });
  }
});

// 4. POST /admin/models/unload-all
router.post('/admin/models/unload-all', adminAuth, async (req, res) => {
  try {
    await execPromise("pkill -f 'vllm.entrypoints'").catch(() => {});
    await logAdminAction(
      req.admin.id,
      'model_unload_all',
      'system',
      'vllm',
      null,
      null,
      req
    );
    res.status(200).json({
      success: true,
      message: 'All model weights unloaded successfully',
    });
  } catch (err) {
    logger.error('Failed to unload all models:', err);
    res.status(500).json({ error: 'Emergency unload action failed' });
  }
});

// 5. POST /admin/vllm/restart
router.post('/admin/vllm/restart', adminAuth, async (req, res) => {
  try {
    await execPromise("pkill -f 'vllm.entrypoints'").catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Spawn default workhorse model (Qwen3-8B-Instruct)
    const vllm = spawn(
      'python',
      [
        '-m',
        'vllm.entrypoints.openai.api_server',
        '--model',
        'Qwen/Qwen3-8B-Instruct',
        '--quantization',
        'awq',
        '--port',
        '8000',
      ],
      { detached: true, stdio: 'ignore' }
    );
    vllm.unref();

    await logAdminAction(
      req.admin.id,
      'vllm_restart',
      'system',
      'vllm',
      null,
      null,
      req
    );

    res
      .status(200)
      .json({ success: true, message: 'vLLM server restart triggered' });
  } catch (err) {
    logger.error('vLLM restart failed:', err);
    res.status(500).json({ error: 'Failed to restart vLLM engine' });
  }
});


router.get('/admin/logs/requests', adminAuth, async (req, res) => {
  try {
    const query = `
      SELECT m.created_at as timestamp, t.name as tenant, c.model, '/api/chat' as endpoint,
             m.tokens_used as tokens, m.content as snippet
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      JOIN tenants t ON m.tenant_id = t.id
      ORDER BY m.created_at DESC
      LIMIT 100
    `;
    const result = await pool.query(query);
    res.status(200).json({ logs: result.rows });
  } catch (err) {
    logger.error('Failed to get request logs:', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// 14. GET /admin/logs/errors
router.get('/admin/logs/errors', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.model, a.status, COUNT(*)::int as count, t.name as tenant_name
      FROM ai_activity a
      LEFT JOIN tenants t ON a.tenant_id = t.id
      WHERE a.status NOT IN ('success', 'completed')
        AND a.created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY a.model, a.status, t.name
      ORDER BY count DESC LIMIT 50
    `);
    res.status(200).json({ errors: result.rows });
  } catch (err) {
    logger.error('Error log analysis failed:', err);
    res.status(500).json({ error: 'Failed to analyze failures' });
  }
});

// 15. GET /admin/models/performance
router.get('/admin/models/performance', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT model,
             COUNT(*)::int as requests,
             ROUND(AVG(latency_ms))::int as avg_latency,
             ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms))::int as p95_latency,
             ROUND(AVG(CASE WHEN status NOT IN ('success','completed') THEN 1 ELSE 0 END)::numeric, 4) as error_rate,
             ROUND(AVG(CASE WHEN latency_ms > 0 THEN (tokens_out::numeric / (latency_ms::numeric / 1000)) ELSE 0 END), 1) as tokens_sec
      FROM ai_activity
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY model
      ORDER BY requests DESC
    `);
    res.status(200).json({ performance: result.rows });
  } catch (err) {
    logger.error('Model performance fetch failed:', err);
    res.status(500).json({ error: 'Failed to compile models analytics' });
  }
});

// 16. GET /admin/logs/export
router.get('/admin/logs/export', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.created_at as timestamp, t.name as tenant, c.model, '/api/chat' as endpoint,
             m.tokens_used as tokens
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      JOIN tenants t ON m.tenant_id = t.id
      ORDER BY m.created_at DESC LIMIT 500
    `);
    const header = '"timestamp","tenant","model","endpoint","tokens"';
    const rows = result.rows.map(r =>
      `"${r.timestamp}","${sanitizeCsvCell(r.tenant)}","${sanitizeCsvCell(r.model)}","${sanitizeCsvCell(r.endpoint)}","${r.tokens || 0}"`
    );
    const csv = [header, ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="harikson_request_logs.csv"');
    res.status(200).send(csv);
  } catch (err) {
    logger.error('Log export failed:', err);
    res.status(500).json({ error: 'Failed to export log data' });
  }
});

// 17. GET /admin/audit-log
router.get('/admin/audit-log', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.action, a.target_type, a.target_id, a.old_value, a.new_value, a.ip_address, a.created_at,
              COALESCE(u.email, 'superadmin@harikson.ai') as admin_email
       FROM admin_audit_log a
       LEFT JOIN users u ON a.admin_id = u.id
       ORDER BY a.created_at DESC
       LIMIT 100`
    );
    res.status(200).json({ audit: result.rows });
  } catch (err) {
    logger.error('Failed to get audit log:', err);
    res.status(500).json({ error: 'Failed to retrieve audits' });
  }
});

// GET /admin/impersonation/audit-logs - View impersonation audit logs with optional filter
router.get('/admin/impersonation/audit-logs', adminAuth, async (req, res) => {
  try {
    const { impersonatedOnly, limit = 100 } = req.query;
    const isImpersonatedFilter = impersonatedOnly === 'true';

    const result = await pool.query(
      `SELECT a.id, a.user_id, a.tenant_id, a.action, a.details as metadata, a.ip_address, a.user_agent,
              a.impersonated_by, a.is_impersonation, a.created_at,
              u.email as user_email,
              adm.email as impersonator_email
       FROM activity_logs a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN users adm ON a.impersonated_by = adm.id
       WHERE ($1::boolean IS FALSE OR a.is_impersonation = true)
       ORDER BY a.created_at DESC
       LIMIT $2`,
      [isImpersonatedFilter, parseInt(limit)]
    );

    res.status(200).json({
      success: true,
      logs: result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email || 'Unknown User',
        action: row.action,
        metadata: row.metadata,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        impersonatedBy: row.impersonated_by,
        impersonatorEmail: row.impersonator_email || 'Admin',
        isImpersonation: Boolean(row.is_impersonation),
        createdAt: row.created_at,
      })),
    });
  } catch (err) {
    logger.error('Failed to fetch impersonation audit logs:', err);
    res.status(500).json({ error: 'Failed to retrieve impersonation audit logs' });
  }
});

// GET /admin/impersonation/audit-logs/export - Export impersonation audit logs as CSV
router.get('/admin/impersonation/audit-logs/export', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.created_at, u.email as user_email, a.action, a.is_impersonation, adm.email as impersonator_email, a.ip_address
       FROM activity_logs a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN users adm ON a.impersonated_by = adm.id
       ORDER BY a.created_at DESC
       LIMIT 1000`
    );

    let csv = 'ID,Timestamp,User Email,Action,Is Impersonated,Impersonated By Admin,IP Address\n';
    for (const row of result.rows) {
      csv += `"${sanitizeCsvCell(row.id)}","${new Date(row.created_at).toISOString()}","${sanitizeCsvCell(row.user_email)}","${sanitizeCsvCell(row.action)}","${row.is_impersonation ? 'YES' : 'NO'}","${sanitizeCsvCell(row.impersonator_email)}","${sanitizeCsvCell(row.ip_address)}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="impersonation_audit_logs.csv"');
    res.status(200).send(csv);
  } catch (err) {
    logger.error('Failed to export CSV audit logs:', err);
    res.status(500).json({ error: 'Failed to export audit logs CSV' });
  }
});

// 18. GET /admin/api-keys
router.get('/admin/api-keys', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT k.id, k.name, k.key_prefix, k.tpm_limit, k.rpm_limit, k.status, k.created_at, t.name as tenant_name
       FROM tenant_api_keys k
       JOIN tenants t ON k.tenant_id = t.id
       ORDER BY k.created_at DESC`
    );
    res.status(200).json({ keys: result.rows });
  } catch (err) {
    logger.error('Failed to get API keys:', err);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

// 19. POST /admin/api-keys
router.post('/admin/api-keys', adminAuth, async (req, res) => {
  const { tenant_id, name, tpm_limit, rpm_limit } = req.body;
  if (!tenant_id || !name) {
    return res.status(400).json({ error: 'tenant_id and name are required' });
  }

  try {
    // Check if target tenant has api_access enabled on their plan
    const tenantRes = await pool.query(
      `SELECT t.id, t.plan, p.features
       FROM tenants t
       LEFT JOIN plans p ON LOWER(t.plan) = LOWER(p.id)
       WHERE t.id = $1`,
      [tenant_id]
    );

    if (tenantRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenantRow = tenantRes.rows[0];
    let featuresObj = {};
    if (typeof tenantRow.features === 'string') {
      try { featuresObj = JSON.parse(tenantRow.features); } catch (_) {}
    } else if (tenantRow.features && typeof tenantRow.features === 'object') {
      featuresObj = tenantRow.features;
    }

    const planId = (tenantRow.plan || 'free').toLowerCase();
    let hasApiAccess = false;
    if (typeof featuresObj.api_access === 'boolean') {
      hasApiAccess = featuresObj.api_access;
    } else {
      hasApiAccess = ['starter', 'professional', 'enterprise'].includes(planId);
    }

    if (!hasApiAccess) {
      return res.status(403).json({
        error: 'API access is not enabled for the tenant\'s subscription plan. Upgrade the plan to enable API key generation.',
        code: 'PLAN_FEATURE_DISABLED',
        feature: 'api_access',
        plan: planId,
      });
    }

    const crypto = await import('crypto');
    const rawKey = 'hk_live_' + crypto.randomBytes(24).toString('hex');
    const keyPrefix = rawKey.substring(0, 12); // "hk_live_xxxx"
    const hashed = await bcrypt.hash(rawKey, 10);

    const result = await pool.query(
      `INSERT INTO tenant_api_keys (tenant_id, name, key_prefix, key_hash, tpm_limit, rpm_limit)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, key_prefix, created_at`,
      [
        tenant_id,
        name,
        keyPrefix,
        hashed,
        tpm_limit || 100000,
        rpm_limit || 100,
      ]
    );

    const createdKey = result.rows[0];
    await logAdminAction(
      req.admin.id,
      'create_api_key',
      'api_key',
      createdKey.id,
      null,
      { name, keyPrefix },
      req
    );

    res.status(201).json({
      success: true,
      key: {
        ...createdKey,
        plaintext: rawKey, // only returned once
      },
    });
  } catch (err) {
    logger.error('Failed to create API key:', err);
    res.status(500).json({ error: 'Failed to generate new client key' });
  }
});

// 20. DELETE /admin/api-keys/:id
router.delete('/admin/api-keys/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM tenant_api_keys WHERE id = $1 RETURNING id, name',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Key not found' });
    }
    await logAdminAction(
      req.admin.id,
      'revoke_api_key',
      'api_key',
      id,
      result.rows[0],
      null,
      req
    );
    res
      .status(200)
      .json({ success: true, message: 'API key revoked successfully' });
  } catch (err) {
    logger.error('Failed to delete API key:', err);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// 21. GET /admin/vllm/params
router.get('/admin/vllm/params', adminAuth, async (req, res) => {
  try {
    let data = null;
    try {
      data = await redis.get('vllm:hyperparams');
    } catch (redisErr) {
      logger.warn('Failed to read hyperparams from Redis, using defaults:', redisErr.message);
    }
    const params = data
      ? JSON.parse(data)
      : {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 4096,
          system_restrict: true,
        };
    res.status(200).json(params);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read parameters' });
  }
});

// 22. POST /admin/vllm/params
router.post('/admin/vllm/params', adminAuth, async (req, res) => {
  const { temperature, top_p, max_tokens, system_restrict } = req.body;
  try {
    const payload = { temperature, top_p, max_tokens, system_restrict };
    try {
      await redis.set('vllm:hyperparams', JSON.stringify(payload));
    } catch (redisErr) {
      logger.error('Failed to save hyperparams in Redis:', redisErr.message);
    }
    await logAdminAction(
      req.admin.id,
      'update_vllm_params',
      'vllm',
      'params',
      null,
      payload,
      req
    );
    res.status(200).json({ success: true, params: payload });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write parameters' });
  }
});


router.get('/admin/voice/stats', adminAuth, async (req, res) => {
  try {
    // 1. Global Overview
    const overviewRes = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM voice_sessions) AS total_sessions,
        COUNT(u.id) AS total_turns,
        ROUND(AVG(u.ttfa_ms)) AS avg_ttfa_ms,
        ROUND(COALESCE((COUNT(*) FILTER (WHERE u.interrupted = true)::numeric / NULLIF(COUNT(*), 0)) * 100, 0), 1) AS interrupt_rate_pct,
        ROUND(COALESCE((COUNT(*) FILTER (WHERE u.stt_error = true)::numeric / NULLIF(COUNT(*), 0)) * 100, 0), 1) AS stt_error_rate_pct,
        COALESCE(SUM(u.stt_chars), 0) AS total_stt_chars,
        COALESCE(SUM(u.tts_chars), 0) AS total_tts_chars,
        COALESCE(SUM(u.llm_tokens), 0) AS total_llm_tokens
      FROM voice_usage u
    `);

    // 2. Breakdown by Tenant
    const tenantRes = await pool.query(`
      SELECT
        t.id AS tenant_id,
        t.name AS tenant_name,
        t.slug AS tenant_slug,
        COUNT(DISTINCT s.id) AS sessions_count,
        COUNT(u.id) AS turns_count,
        ROUND(AVG(u.ttfa_ms)) AS avg_ttfa_ms,
        ROUND(COALESCE((COUNT(*) FILTER (WHERE u.interrupted = true)::numeric / NULLIF(COUNT(u.id), 0)) * 100, 0), 1) AS interrupt_rate_pct
      FROM tenants t
      LEFT JOIN voice_sessions s ON s.tenant_id = t.id
      LEFT JOIN voice_usage u ON u.tenant_id = t.id
      GROUP BY t.id, t.name, t.slug
      HAVING COUNT(DISTINCT s.id) > 0 OR COUNT(u.id) > 0
      ORDER BY sessions_count DESC, turns_count DESC
      LIMIT 50
    `);

    // 3. Breakdown by Browser
    const browserRes = await pool.query(`
      SELECT
        COALESCE(NULLIF(browser, ''), 'Unknown') AS browser,
        COUNT(*) AS turns_count,
        ROUND(AVG(ttfa_ms)) AS avg_ttfa_ms,
        COUNT(*) FILTER (WHERE stt_error = true) AS stt_errors_count,
        ROUND(COALESCE((COUNT(*) FILTER (WHERE stt_error = true)::numeric / NULLIF(COUNT(*), 0)) * 100, 0), 1) AS stt_error_rate_pct,
        COUNT(*) FILTER (WHERE interrupted = true) AS interrupt_count,
        ROUND(COALESCE((COUNT(*) FILTER (WHERE interrupted = true)::numeric / NULLIF(COUNT(*), 0)) * 100, 0), 1) AS interrupt_rate_pct
      FROM voice_usage
      GROUP BY COALESCE(NULLIF(browser, ''), 'Unknown')
      ORDER BY turns_count DESC
    `);

    res.json({
      overview: overviewRes.rows[0] || {
        total_sessions: 0,
        total_turns: 0,
        avg_ttfa_ms: null,
        interrupt_rate_pct: 0,
        stt_error_rate_pct: 0,
        total_stt_chars: 0,
        total_tts_chars: 0,
        total_llm_tokens: 0,
      },
      by_tenant: tenantRes.rows || [],
      by_browser: browserRes.rows || [],
    });
  } catch (err) {
    logger.error('Failed to get voice stats:', err);
    res.status(500).json({ error: 'Failed to retrieve voice statistics' });
  }
});

router.get('/admin/voice/sessions', adminAuth, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const offset = Math.max(0, parseInt(req.query.offset) || 0);

    const query = `
      SELECT
        s.id,
        s.tenant_id,
        t.name AS tenant_name,
        t.slug AS tenant_slug,
        s.user_id,
        u.email AS user_email,
        s.conversation_id,
        s.language,
        s.started_at,
        s.ended_at,
        s.turn_count,
        s.ended_reason,
        ROUND(AVG(vu.ttfa_ms)) AS avg_ttfa_ms
      FROM voice_sessions s
      LEFT JOIN tenants t ON t.id = s.tenant_id
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN voice_usage vu ON vu.session_id = s.id
      GROUP BY s.id, s.tenant_id, t.name, t.slug, s.user_id, u.email, s.conversation_id, s.language, s.started_at, s.ended_at, s.turn_count, s.ended_reason
      ORDER BY s.started_at DESC
      LIMIT $1 OFFSET $2
    `;

    const totalRes = await pool.query('SELECT COUNT(*) FROM voice_sessions');
    const sessionsRes = await pool.query(query, [limit, offset]);

    res.json({
      total: parseInt(totalRes.rows[0].count, 10),
      sessions: sessionsRes.rows,
      limit,
      offset,
    });
  } catch (err) {
    logger.error('Failed to list voice sessions:', err);
    res.status(500).json({ error: 'Failed to retrieve voice sessions' });
  }
});

export default router;
