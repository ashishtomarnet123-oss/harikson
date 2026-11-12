import express from 'express';
import crypto from 'crypto';
import pool from '../db.js';
import redis from '../redis.js';
import logger from '../utils/logger.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { validate } from '../middleware/validation.middleware.js';
import { legalHoldSchema, legalHoldLiftSchema } from '../validators/admin.schema.js';
import { logAdminAction } from '../utils/auditLogger.js';

const router = express.Router();

// PUT /admin/tenants/:id/widget-config - Configure allowed origins and widget secret for a tenant
router.put('/admin/tenants/:id/widget-config', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { allowedOrigins = [] } = req.body;

    const widgetSecret = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      `UPDATE tenants
       SET widget_allowed_origins = $1,
           widget_secret = COALESCE(widget_secret, $2)
       WHERE id = $3
       RETURNING id, name, slug, widget_allowed_origins, widget_secret`,
      [allowedOrigins, widgetSecret, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Widget security configuration updated successfully',
      tenant: result.rows[0],
    });
  } catch (err) {
    logger.error('Update widget config error:', err);
    res.status(500).json({ error: 'Failed to update widget configuration', message: err.message });
  }
});

// GET /admin/tenants/:id/legal-holds
router.get('/admin/tenants/:id/legal-holds', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM legal_holds WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    const activeCount = result.rows.filter(r => r.status === 'active').length;

    res.status(200).json({
      success: true,
      tenantId: id,
      hasActiveLegalHold: activeCount > 0,
      legalHolds: result.rows,
    });
  } catch (err) {
    logger.error('Fetch legal holds error:', err);
    res.status(500).json({ error: 'Failed to fetch tenant legal holds', message: err.message });
  }
});

// POST /admin/tenants/:id/legal-holds - Place a legal hold on a tenant
router.post('/admin/tenants/:id/legal-holds', adminAuth, validate(legalHoldSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { caseName, description, expiresAt } = req.body;

    if (!caseName) {
      return res.status(400).json({ error: 'caseName is required to place a legal hold' });
    }

    const tenantRes = await pool.query(`SELECT id, name FROM tenants WHERE id = $1`, [id]);
    if (tenantRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const adminEmail = req.admin?.email || 'admin@xarwiz.com';
    const adminId = req.admin?.id || 'admin-system';

    const insertRes = await pool.query(
      `INSERT INTO legal_holds (tenant_id, case_name, description, created_by_admin_email, expires_at, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING *`,
      [id, caseName, description || null, adminEmail, expiresAt || null]
    );

    const newHold = insertRes.rows[0];

    // Immutable audit log (append-only)
    await pool.query(
      `INSERT INTO legal_hold_audit_logs (legal_hold_id, tenant_id, action, admin_id, admin_email, case_name, reason, metadata)
       VALUES ($1, $2, 'LEGAL_HOLD_CREATED', $3, $4, $5, $6, $7)`,
      [
        newHold.id,
        id,
        adminId,
        adminEmail,
        caseName,
        description || 'Legal hold placed during litigation',
        JSON.stringify({ expiresAt }),
      ]
    );

    logger.info(`⚖️ [LEGAL HOLD CREATED] Admin ${adminEmail} placed legal hold on tenant ${id} (Case: ${caseName})`);

    res.status(201).json({
      success: true,
      message: 'Legal hold placed successfully. Data retention deletion paused for this tenant.',
      legalHold: newHold,
    });
  } catch (err) {
    logger.error('Create legal hold error:', err);
    res.status(500).json({ error: 'Failed to create legal hold', message: err.message });
  }
});

// POST /admin/tenants/:id/legal-holds/:holdId/lift - Lift an active legal hold
router.post('/admin/tenants/:id/legal-holds/:holdId/lift', adminAuth, validate(legalHoldLiftSchema), async (req, res) => {
  try {
    const { id, holdId } = req.params;
    const { reason = 'Litigation concluded' } = req.body;

    const adminEmail = req.admin?.email || 'admin@xarwiz.com';
    const adminId = req.admin?.id || 'admin-system';

    const updateRes = await pool.query(
      `UPDATE legal_holds
       SET status = 'lifted',
           lifted_at = NOW(),
           lifted_by_admin_email = $1,
           lift_reason = $2
       WHERE id = $3 AND tenant_id = $4 AND status = 'active'
       RETURNING *`,
      [adminEmail, reason, holdId, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Active legal hold not found' });
    }

    const liftedHold = updateRes.rows[0];

    await pool.query(
      `INSERT INTO legal_hold_audit_logs (legal_hold_id, tenant_id, action, admin_id, admin_email, case_name, reason)
       VALUES ($1, $2, 'LEGAL_HOLD_LIFTED', $3, $4, $5, $6)`,
      [
        liftedHold.id,
        id,
        adminId,
        adminEmail,
        liftedHold.case_name,
        reason,
      ]
    );

    logger.info(`⚖️ [LEGAL HOLD LIFTED] Admin ${adminEmail} lifted legal hold ${holdId} for tenant ${id}`);

    res.status(200).json({
      success: true,
      message: 'Legal hold lifted successfully. Standard retention policies resumed.',
      legalHold: liftedHold,
    });
  } catch (err) {
    logger.error('Lift legal hold error:', err);
    res.status(500).json({ error: 'Failed to lift legal hold', message: err.message });
  }
});

// GET /admin/legal-holds/audit-logs - Fetch legal hold audit logs
router.get('/admin/legal-holds/audit-logs', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT al.*, t.name as tenant_name, t.slug as tenant_slug
       FROM legal_hold_audit_logs al
       JOIN tenants t ON al.tenant_id = t.id
       ORDER BY al.created_at DESC LIMIT 100`
    );

    res.status(200).json({
      success: true,
      auditLogs: result.rows,
    });
  } catch (err) {
    logger.error('Fetch legal hold audit logs error:', err);
    res.status(500).json({ error: 'Failed to fetch legal hold audit logs', message: err.message });
  }
});

// GET /admin/tenants & /v1/admin/tenants
router.get(['/admin/tenants', '/v1/admin/tenants'], adminAuth, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = req.query.offset !== undefined ? Math.max(0, parseInt(req.query.offset)) : (page - 1) * limit;

  try {
    const countRes = await pool.query('SELECT COUNT(*)::int as total FROM tenants');
    const total = countRes.rows[0]?.total || 0;

    const listQuery = `
      SELECT t.id, t.name, t.slug, t.plan, t.status, t.created_at,
             (SELECT COUNT(*)::int FROM users u WHERE u.tenant_id = t.id) as user_count,
             (SELECT COALESCE(SUM(tokens_used), 0)::int FROM messages m WHERE m.tenant_id = t.id) as tokens_used,
             p.price, p.billing, p.currency, p.token_limit, p.tenant_limit, p.agent_limit, p.features, p.model_access
      FROM tenants t
      LEFT JOIN plans p ON LOWER(t.plan) = LOWER(p.id)
      ORDER BY t.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(listQuery, [limit, offset]);
    const totalPages = Math.ceil(total / limit) || 1;
    const hasMore = (page * limit) < total;

    res.status(200).json({
      tenants: result.rows,
      total,
      page,
      limit,
      totalPages,
      hasMore,
    });
  } catch (err) {
    logger.error('List tenants failed:', err);
    res.status(500).json({ error: 'Failed to list tenants' });
  }
});

// POST /admin/tenants & /v1/admin/tenants
router.post(['/admin/tenants', '/v1/admin/tenants'], adminAuth, async (req, res) => {
  const { name, slug, plan, status } = req.body;
  if (!name || !slug || !plan) {
    return res.status(400).json({ error: 'Name, slug, and plan are required' });
  }

  try {
    const checkSlug = await pool.query(
      'SELECT id FROM tenants WHERE LOWER(slug) = LOWER($1)',
      [slug]
    );
    if (checkSlug.rows.length > 0) {
      return res.status(400).json({
        error: 'Slug must be unique. A tenant with this slug already exists.',
      });
    }

    const planLower = plan.toLowerCase();
    const statusVal = status || 'active';

    const result = await pool.query(
      `
      INSERT INTO tenants (name, slug, plan, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
      [name, slug.toLowerCase(), planLower, statusVal]
    );

    const tenant = result.rows[0];

    await logAdminAction(
      req.admin.id,
      'tenant_create',
      'tenant',
      tenant.id,
      null,
      tenant,
      req
    );

    res.status(201).json({ success: true, tenant });
  } catch (err) {
    logger.error('Failed to create tenant:', err);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// PUT /admin/tenants/:id & /v1/admin/tenants/:id
router.put(['/admin/tenants/:id', '/v1/admin/tenants/:id'], adminAuth, async (req, res) => {
  const { id } = req.params;
  const { name, slug, plan, status } = req.body;

  try {
    const oldQuery = await pool.query('SELECT * FROM tenants WHERE id = $1', [
      id,
    ]);
    if (oldQuery.rows.length === 0)
      return res.status(404).json({ error: 'Tenant not found' });
    const oldTenant = oldQuery.rows[0];

    if (slug && slug.toLowerCase() !== oldTenant.slug.toLowerCase()) {
      const checkSlug = await pool.query(
        'SELECT id FROM tenants WHERE LOWER(slug) = LOWER($1) AND id != $2',
        [slug, id]
      );
      if (checkSlug.rows.length > 0) {
        return res.status(400).json({
          error: 'Slug must be unique. A tenant with this slug already exists.',
        });
      }
    }

    const updatedName = name || oldTenant.name;
    const updatedSlug = slug ? slug.toLowerCase() : oldTenant.slug;
    const updatedPlan = plan ? plan.toLowerCase() : oldTenant.plan;
    const updatedStatus = status || oldTenant.status;

    const result = await pool.query(
      `
      UPDATE tenants
      SET name = $1, slug = $2, plan = $3, status = $4
      WHERE id = $5
      RETURNING *
    `,
      [updatedName, updatedSlug, updatedPlan, updatedStatus, id]
    );

    const newTenant = result.rows[0];

    await logAdminAction(
      req.admin.id,
      'tenant_update',
      'tenant',
      id,
      oldTenant,
      newTenant,
      req
    );

    res.status(200).json({ success: true, tenant: newTenant });
  } catch (err) {
    logger.error('Failed to update tenant details:', err);
    res.status(500).json({ error: 'Failed to update tenant details' });
  }
});

// GET /admin/tenants/:id & /v1/admin/tenants/:id
router.get(['/admin/tenants/:id', '/v1/admin/tenants/:id'], adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT t.id, t.name, t.slug, t.plan, t.status, t.created_at,
             (SELECT COUNT(*)::int FROM users u WHERE u.tenant_id = t.id) as user_count,
             (SELECT COALESCE(SUM(tokens_used), 0)::int FROM messages m WHERE m.tenant_id = t.id) as tokens_used,
             (SELECT COUNT(*)::int FROM conversations c WHERE c.tenant_id = t.id) as conversations_count,
             p.price, p.billing, p.currency, p.token_limit, p.tenant_limit, p.agent_limit, p.features, p.model_access
      FROM tenants t
      LEFT JOIN plans p ON LOWER(t.plan) = LOWER(p.id)
      WHERE t.id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Tenant not found' });
    const tenantData = result.rows[0];
    res.status(200).json({ ...tenantData, tenant: tenantData });
  } catch (err) {
    logger.error('Get tenant details failed:', err);
    res.status(500).json({ error: 'Failed to retrieve tenant info' });
  }
});

// PUT /admin/tenants/:id/plan & /v1/admin/tenants/:id/plan
router.put(['/admin/tenants/:id/plan', '/v1/admin/tenants/:id/plan'], adminAuth, async (req, res) => {
  const { id } = req.params;
  const { plan } = req.body;
  if (!plan) return res.status(400).json({ error: 'Plan is required' });

  const idempotencyKey = req.headers['idempotency-key'];
  let dedupKey = '';
  try {
    if (idempotencyKey) {
      const cached = await redis.get(`dedup:response:${idempotencyKey}`);
      if (cached) {
        return res.status(200).json(JSON.parse(cached));
      }
      dedupKey = `dedup:plan:${idempotencyKey}`;
      const exists = await redis.set(dedupKey, '1', 'EX', 300, 'NX');
      if (!exists) {
        return res.status(409).json({ error: 'Duplicate request' });
      }
    }

    const oldQuery = await pool.query(
      'SELECT plan FROM tenants WHERE id = $1',
      [id]
    );
    if (oldQuery.rows.length === 0) {
      if (idempotencyKey && dedupKey) {
        await redis.del(dedupKey);
      }
      return res.status(404).json({ error: 'Tenant not found' });
    }
    const oldPlanId = oldQuery.rows[0].plan;

    const oldPlanRes = await pool.query('SELECT * FROM plans WHERE id = $1', [
      oldPlanId.toLowerCase(),
    ]);
    const newPlanRes = await pool.query('SELECT * FROM plans WHERE id = $1', [
      plan.toLowerCase(),
    ]);

    let isDowngrade = false;
    let refundCredit = 0;

    if (oldPlanRes.rows.length > 0 && newPlanRes.rows.length > 0) {
      const oldPlan = oldPlanRes.rows[0];
      const newPlan = newPlanRes.rows[0];

      if (
        newPlan.price < oldPlan.price ||
        (newPlan.agent_limit !== -1 &&
          (oldPlan.agent_limit === -1 ||
            newPlan.agent_limit < oldPlan.agent_limit)) ||
        (newPlan.token_limit !== -1 &&
          (oldPlan.token_limit === -1 ||
            newPlan.token_limit < oldPlan.token_limit))
      ) {
        isDowngrade = true;
        const remainingDays = 15;
        const totalDays = 30;
        refundCredit = Math.max(
          0,
          (oldPlan.price - newPlan.price) * (remainingDays / totalDays)
        );
      }
    }

    const graceEnds = isDowngrade
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : null;

    await pool.query(
      `UPDATE tenants
       SET plan = $1,
           downgrade_grace_ends = $2,
           plan_downgraded_at = $3
       WHERE id = $4`,
      [plan.toLowerCase(), graceEnds, isDowngrade ? new Date() : null, id]
    );

    const planDetails = newPlanRes.rows[0];
    const planPrice = planDetails ? parseFloat(planDetails.price) || 0 : 0;
    const planCurrency = planDetails ? planDetails.currency || 'INR' : 'INR';
    const subStatus = 'active';

    try {
      const existingSub = await pool.query('SELECT id FROM subscriptions WHERE tenant_id = $1', [id]);
      if (existingSub.rows.length > 0) {
        await pool.query(
          `UPDATE subscriptions
           SET plan_id = $1, amount = $2, currency = $3, status = $4, updated_at = NOW()
           WHERE tenant_id = $5`,
          [plan.toLowerCase(), planPrice, planCurrency, subStatus, id]
        );
      } else {
        await pool.query(
          `INSERT INTO subscriptions (tenant_id, provider, provider_subscription_id, plan_id, status, amount, currency, created_at, updated_at)
           VALUES ($1, 'system', $2, $3, $4, $5, $6, NOW(), NOW())`,
          [id, `sub_${Date.now()}`, plan.toLowerCase(), subStatus, planPrice, planCurrency]
        );
      }
    } catch (subSyncErr) {
      logger.warn('Subscription sync warning on plan update:', subSyncErr.message);
    }

    await pool.query(
      `INSERT INTO activity_logs (tenant_id, action, details)
       VALUES ($1, $2, $3)`,
      [
        id,
        'PLAN_CHANGED',
        JSON.stringify({
          old_plan: oldPlanId,
          new_plan: plan,
          type: isDowngrade ? 'downgrade' : 'upgrade',
          grace_ends: graceEnds,
          pro_rated_credit: refundCredit,
        }),
      ]
    ).catch((logErr) => logger.warn('Failed to insert activity log for plan change:', logErr.message));

    const selectQuery = `
      SELECT t.id, t.name, t.slug, t.plan, t.status, t.created_at,
             COUNT(DISTINCT u.id)::int as user_count,
             COALESCE(SUM(m.tokens_used), 0)::int as tokens_used,
             p.price, p.billing, p.currency, p.token_limit, p.tenant_limit, p.agent_limit, p.features, p.model_access
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id
      LEFT JOIN messages m ON t.id = m.tenant_id
      LEFT JOIN plans p ON LOWER(t.plan) = LOWER(p.id)
      WHERE t.id = $1
      GROUP BY t.id, p.id
    `;
    const result = await pool.query(selectQuery, [id]);

    await logAdminAction(
      req.admin.id,
      'plan_change',
      'tenant',
      id,
      { plan: oldPlanId },
      { plan },
      req
    );

    const responsePayload = { success: true, tenant: result.rows[0] };

    if (idempotencyKey && dedupKey) {
      await redis.set(`dedup:response:${idempotencyKey}`, JSON.stringify(responsePayload), 'EX', 300);
      await redis.del(dedupKey);
    }

    res.status(200).json(responsePayload);
  } catch (err) {
    if (idempotencyKey && dedupKey) {
      await redis.del(dedupKey);
    }
    logger.error('Failed to change tenant plan:', err);
    res.status(500).json({ error: 'Failed to update subscription plan' });
  }
});

// POST /admin/tenants/:id/suspend & /v1/admin/tenants/:id/suspend
router.post(['/admin/tenants/:id/suspend', '/v1/admin/tenants/:id/suspend'], adminAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const newStatus = status || 'suspended';

  try {
    const oldQuery = await pool.query(
      'SELECT status FROM tenants WHERE id = $1',
      [id]
    );
    if (oldQuery.rows.length === 0)
      return res.status(404).json({ error: 'Tenant not found' });
    const oldStatus = oldQuery.rows[0].status;

    const result = await pool.query(
      'UPDATE tenants SET status = $1 WHERE id = $2 RETURNING id, name, status',
      [newStatus, id]
    );

    await logAdminAction(
      req.admin.id,
      'tenant_suspend',
      'tenant',
      id,
      { status: oldStatus },
      { status: newStatus },
      req
    );

    res.status(200).json({ success: true, tenant: result.rows[0] });
  } catch (err) {
    logger.error('Failed to suspend/active tenant:', err);
    res.status(500).json({ error: 'Failed to adjust tenant active state' });
  }
});

// GET /admin/usage/daily & /v1/admin/usage/daily
router.get(['/admin/usage/daily', '/v1/admin/usage/daily'], adminAuth, async (req, res) => {
  try {
    const query = `
      SELECT date_trunc('day', created_at)::date as day,
             COALESCE(SUM(CASE WHEN role = 'user' THEN tokens_used ELSE 0 END), 0)::int as tokens_in,
             COALESCE(SUM(CASE WHEN role = 'assistant' THEN tokens_used ELSE 0 END), 0)::int as tokens_out
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY day
      ORDER BY day ASC
    `;
    const result = await pool.query(query);
    res.status(200).json({ usage: result.rows });
  } catch (err) {
    logger.error('Daily usage retrieval failed:', err);
    res.status(500).json({ error: 'Failed to fetch usage logs' });
  }
});

// GET /admin/rate-limit-violations & /v1/admin/rate-limit-violations
router.get(['/admin/rate-limit-violations', '/v1/admin/rate-limit-violations'], adminAuth, async (req, res) => {
  try {
    const keys = await redis.keys('ratelimit:*');
    const violations = [];
    for (const key of keys.slice(0, 50)) {
      const ttl = await redis.ttl(key);
      const val = await redis.get(key);
      const count = parseInt(val) || 0;
      const parts = key.split(':');
      const endpoint = parts[1] || 'API';
      const tenant = parts[2] || 'Global';
      violations.push({
        key,
        tenant,
        endpoint,
        count,
        actual: count,
        limit: 100,
        action: 'Throttled',
        timestamp: new Date().toISOString(),
        ttl_seconds: ttl,
      });
    }
    res.status(200).json({ violations });
  } catch (err) {
    logger.error('Rate-limit violations fetch failed:', err);
    res.status(500).json({ error: 'Failed to fetch rate-limit logs' });
  }
});

export default router;

