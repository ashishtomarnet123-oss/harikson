import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { adminAuth } from './middleware/adminAuth.js';

dotenv.config();

const { Pool } = pg;

const app = express();
const port = process.env.PORT || 4000;

// Express setup
app.use(cors());
app.use(express.json());

// PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error', err);
});

// Protect all admin endpoints with adminAuth
app.use('/admin', adminAuth);

// 1. POST /admin/tenants - Create new tenant
app.post('/admin/tenants', async (req, res) => {
  const { name, slug, plan, adminEmail, adminPassword } = req.body;
  
  // Validation
  if (!name || !slug || !plan || !adminEmail || !adminPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Validate slug pattern: lowercase, alphanumeric and hyphens only
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    return res.status(400).json({ error: 'Slug must contain only lowercase letters, numbers, and hyphens' });
  }

  try {
    // Check slug uniqueness
    const slugCheck = await pool.query('SELECT id FROM tenants WHERE slug = $1', [slug]);
    if (slugCheck.rows.length > 0) {
      return res.status(409).json({ error: `Slug ${slug} is already taken` });
    }

    // Hash admin user password
    const hash = await bcrypt.hash(adminPassword, 10);

    // Run provisioning within transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create tenant
      const tenantResult = await client.query(
        'INSERT INTO tenants (name, slug, plan, status) VALUES ($1, $2, $3, $4) RETURNING id, slug, status',
        [name, slug, plan, 'active']
      );
      const tenant = tenantResult.rows[0];

      // Create admin user for that tenant
      await client.query(
        'INSERT INTO users (tenant_id, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        [tenant.id, adminEmail, hash, 'admin']
      );

      await client.query('COMMIT');
      res.status(201).json({
        tenantId: tenant.id,
        slug: tenant.slug,
        status: tenant.status
      });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Failed to create tenant:', err);
    res.status(500).json({ error: 'Failed to provision tenant' });
  }
});

// 2. GET /admin/tenants - List all tenants (paginated & filtered)
app.get('/admin/tenants', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const status = req.query.status || null;
  const plan = req.query.plan || null;
  const offset = (page - 1) * limit;

  try {
    // Build values dynamically
    const filterParams = [];
    let paramCount = 1;
    let filterQuery = 'WHERE 1=1';

    if (status) {
      filterQuery += ` AND t.status = $${paramCount}`;
      filterParams.push(status);
      paramCount++;
    }
    if (plan) {
      filterQuery += ` AND t.plan = $${paramCount}`;
      filterParams.push(plan);
      paramCount++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(id)::int as total FROM tenants t ${filterQuery}`,
      filterParams
    );
    const total = countResult.rows[0].total;

    // Get paginated rows
    const listQuery = `
      SELECT t.id, t.name, t.slug, t.plan, t.status, t.created_at,
             COUNT(u.id)::int as user_count
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id
      ${filterQuery}
      GROUP BY t.id
      ORDER BY t.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const listParams = [...filterParams, limit, offset];
    const listResult = await pool.query(listQuery, listParams);

    res.status(200).json({
      tenants: listResult.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Failed to list tenants:', err);
    res.status(500).json({ error: 'Failed to retrieve tenants list' });
  }
});

// 3. GET /admin/tenants/:slug - Get tenant details
app.get('/admin/tenants/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const query = `
      SELECT t.id, t.name, t.slug, t.plan, t.status, t.created_at,
             COUNT(DISTINCT u.id)::int as user_count,
             COUNT(DISTINCT m.id)::int as message_count,
             MAX(m.created_at) as last_active
      FROM tenants t
      LEFT JOIN users u ON t.id = u.tenant_id
      LEFT JOIN messages m ON t.id = m.tenant_id
      WHERE t.slug = $1
      GROUP BY t.id
    `;

    const result = await pool.query(query, [slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to get tenant details:', err);
    res.status(500).json({ error: 'Failed to retrieve tenant details' });
  }
});

// 4. PATCH /admin/tenants/:slug - Update tenant
app.patch('/admin/tenants/:slug', async (req, res) => {
  const { slug } = req.params;
  const { plan, status, name } = req.body;

  if (!plan && !status && !name) {
    return res.status(400).json({ error: 'At least one field (plan, status, name) must be provided for update' });
  }

  try {
    const fields = [];
    const values = [];
    let count = 1;

    if (plan) {
      fields.push(`plan = $${count}`);
      values.push(plan);
      count++;
    }
    if (status) {
      fields.push(`status = $${count}`);
      values.push(status);
      count++;
    }
    if (name) {
      fields.push(`name = $${count}`);
      values.push(name);
      count++;
    }

    values.push(slug);
    const updateQuery = `
      UPDATE tenants
      SET ${fields.join(', ')}
      WHERE slug = $${count}
      RETURNING id, name, slug, plan, status
    `;

    const result = await pool.query(updateQuery, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Failed to update tenant:', err);
    res.status(500).json({ error: 'Failed to update tenant configuration' });
  }
});

// 5. DELETE /admin/tenants/:slug - Suspend tenant (Soft Delete)
app.delete('/admin/tenants/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const query = `
      UPDATE tenants
      SET status = 'suspended'
      WHERE slug = $1
      RETURNING id, slug, status
    `;

    const result = await pool.query(query, [slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.status(200).json({
      message: `Tenant ${slug} suspended successfully`,
      tenant: result.rows[0]
    });
  } catch (err) {
    console.error('Failed to suspend tenant:', err);
    res.status(500).json({ error: 'Failed to suspend tenant operations' });
  }
});

// 6. GET /admin/tenants/:slug/usage - Get usage statistics
app.get('/admin/tenants/:slug/usage', async (req, res) => {
  const { slug } = req.params;

  try {
    // 1. Get Tenant details
    const tenantResult = await pool.query('SELECT id FROM tenants WHERE slug = $1', [slug]);
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    const tenantId = tenantResult.rows[0].id;

    // 2. Fetch messages per day (last 7 days)
    const messagesQuery = `
      SELECT date_trunc('day', created_at)::date as day, COUNT(id)::int as count
      FROM messages
      WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY day
      ORDER BY day ASC
    `;
    const messagesStats = await pool.query(messagesQuery, [tenantId]);

    // 3. Fetch token count (last 30 days)
    const tokensQuery = `
      SELECT COALESCE(SUM(tokens_used), 0)::int as total_tokens
      FROM messages
      WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
    `;
    const tokensStats = await pool.query(tokensQuery, [tenantId]);

    // 4. Fetch active user count (users who started or updated threads in the last 30 days)
    const activeUsersQuery = `
      SELECT COUNT(DISTINCT user_id)::int as active_users
      FROM conversations
      WHERE tenant_id = $1 AND updated_at >= NOW() - INTERVAL '30 days'
    `;
    const activeUsersStats = await pool.query(activeUsersQuery, [tenantId]);

    res.status(200).json({
      messagesPerDay: messagesStats.rows,
      tokensUsed30Days: tokensStats.rows[0].total_tokens,
      activeUsers30Days: activeUsersStats.rows[0].active_users
    });
  } catch (err) {
    console.error('Failed to get tenant usage:', err);
    res.status(500).json({ error: 'Failed to retrieve usage statistics' });
  }
});

// 7. GET /admin/dashboard - High-level overall metrics
app.get('/admin/dashboard', async (req, res) => {
  try {
    // Total & Active Tenant count
    const statsQuery = `
      SELECT COUNT(id)::int as total_tenants,
             COUNT(id) FILTER (WHERE status = 'active')::int as active_tenants
      FROM tenants
    `;
    const statsResult = await pool.query(statsQuery);
    const { total_tenants, active_tenants } = statsResult.rows[0];

    // Estimate Revenue based on Active Plans:
    // Solo = $29, Pro = $99, Business = $299, Enterprise = $999 monthly
    const planRevResult = await pool.query(`
      SELECT plan, COUNT(id)::int as count
      FROM tenants
      WHERE status = 'active'
      GROUP BY plan
    `);

    let estimatedRevenue = 0;
    for (const row of planRevResult.rows) {
      const plan = row.plan.toUpperCase();
      if (plan === 'SOLO' || plan === 'STARTER') estimatedRevenue += row.count * 29;
      else if (plan === 'TEAM' || plan === 'PRO') estimatedRevenue += row.count * 99;
      else if (plan === 'BUSINESS') estimatedRevenue += row.count * 299;
      else if (plan === 'ENTERPRISE') estimatedRevenue += row.count * 999;
    }

    // Recent signups (last 5 tenants)
    const recentSignups = await pool.query(`
      SELECT name, slug, plan, created_at 
      FROM tenants 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    // Alert thresholds for VM capacity (Assume single VM max limits around 40 active tenants before alert)
    const alerts = [];
    if (active_tenants >= 40) {
      alerts.push({
        level: 'warning',
        message: `High VM capacity alert: ${active_tenants} active tenants on single instance (Threshold: 40). Consider upgrading server resources.`
      });
    } else {
      alerts.push({
        level: 'info',
        message: `VM capacity is healthy: ${active_tenants} active tenants currently running.`
      });
    }

    res.status(200).json({
      metrics: {
        totalTenants: total_tenants,
        activeTenants: active_tenants,
        estimatedRevenueMonthly: estimatedRevenue
      },
      recentSignups: recentSignups.rows,
      alerts
    });
  } catch (err) {
    console.error('Failed to get dashboard stats:', err);
    res.status(500).json({ error: 'Failed to retrieve dashboard analytics' });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Admin server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(port, () => {
  console.log(`⚡ [Admin Management API] Operational and listening on port ${port}`);
});
