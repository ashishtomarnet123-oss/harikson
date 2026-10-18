import { NextRequest, NextResponse } from 'next/server';
import { getDbPool } from '../../../../../lib/db';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

function getJwtSecret(): string {
  return (
    process.env.JWT_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'neuravolt_dev_jwt_secret_key_extremely_long_and_secure_value_12345!'
  );
}

function verifyAdmin(req: NextRequest) {
  let token = null;
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    token =
      req.cookies.get('admin_access_token')?.value ||
      req.cookies.get('admin_token')?.value;
  }

  if (!token) {
    return { valid: false, error: 'Access Denied: No token provided' };
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    return { valid: true, user: decoded };
  } catch (err: any) {
    return { valid: false, error: 'Access Denied: Invalid token' };
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = verifyAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const plan = searchParams.get('plan') || 'all';
    const status = searchParams.get('status') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = searchParams.get('sortBy') || 'total_paid';
    const sortOrder = (searchParams.get('sortOrder') || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (page - 1) * limit;
    const pool = getDbPool();
    const params: any[] = [];
    let whereClause = `WHERE 1=1`;

    if (search) {
      params.push(`%${search.trim()}%`);
      whereClause += ` AND (u.email ILIKE $${params.length} OR u.name ILIKE $${params.length} OR t.name ILIKE $${params.length})`;
    }

    if (plan && plan !== 'all') {
      params.push(plan);
      whereClause += ` AND (s.plan_id = $${params.length} OR t.plan ILIKE $${params.length})`;
    }

    if (status && status !== 'all') {
      params.push(status);
      whereClause += ` AND s.status = $${params.length}`;
    }

    const validSortCols: Record<string, string> = {
      total_paid: 'total_paid',
      created_at: 'u.created_at',
      signup_date: 'u.created_at',
      email: 'u.email',
    };
    const orderCol = validSortCols[sortBy] || 'total_paid';

    const countQuery = `
      SELECT COUNT(DISTINCT u.id) AS total
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN subscriptions s ON s.tenant_id = t.id
      ${whereClause}
    `;
    const countRes = await pool.query(countQuery, params);
    const totalRecords = parseInt(countRes.rows[0].total, 10);

    const dataQuery = `
      SELECT
        u.id AS user_id,
        u.name AS user_name,
        u.email,
        u.country,
        u.role,
        u.created_at AS signup_date,
        t.id AS tenant_id,
        t.name AS tenant_name,
        COALESCE(s.plan_id, t.plan, 'free') AS current_plan,
        COALESCE(s.status, 'free') AS subscription_status,
        s.current_period_start,
        s.current_period_end,
        MIN(i.paid_at) AS first_payment_at,
        MAX(i.paid_at) AS last_payment_at,
        COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0)::numeric(10,2) AS total_paid,
        COUNT(CASE WHEN i.status = 'paid' THEN 1 END)::int AS paid_invoices_count,
        COALESCE(s.amount, 0)::numeric(10,2) AS renewal_amount,
        s.currency AS billing_currency
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN subscriptions s ON s.tenant_id = t.id
      LEFT JOIN invoices i ON i.tenant_id = t.id
      ${whereClause}
      GROUP BY u.id, u.name, u.email, u.country, u.role, u.created_at, t.id, t.name, s.plan_id, t.plan, s.status, s.current_period_start, s.current_period_end, s.amount, s.currency
      ORDER BY ${orderCol} ${sortOrder}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const dataRes = await pool.query(dataQuery, params);

    const summaryRes = await pool.query(`
      SELECT
        COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN u.id END)::int AS total_paying,
        COUNT(DISTINCT CASE WHEN s.status IN ('active', 'canceling') THEN u.id END)::int AS active_paying,
        COUNT(DISTINCT CASE WHEN s.status = 'cancelled' THEN u.id END)::int AS churned_paying,
        COALESCE(AVG(CASE WHEN i.status = 'paid' THEN i.amount END), 0)::numeric(10,2) AS avg_ltv
      FROM users u
      JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN subscriptions s ON s.tenant_id = t.id
      LEFT JOIN invoices i ON i.tenant_id = t.id
    `);

    return NextResponse.json({
      success: true,
      users: dataRes.rows.map((row: any) => ({
        userId: row.user_id,
        userName: row.user_name || row.email.split('@')[0],
        email: row.email,
        country: row.country || 'IN',
        role: row.role,
        signupDate: row.signup_date,
        tenantId: row.tenant_id,
        tenantName: row.tenant_name,
        currentPlan: row.current_plan,
        subscriptionStatus: row.subscription_status,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        firstPaymentAt: row.first_payment_at,
        lastPaymentAt: row.last_payment_at,
        totalPaid: parseFloat(row.total_paid),
        paidInvoicesCount: row.paid_invoices_count,
        renewalAmount: parseFloat(row.renewal_amount),
        currency: row.billing_currency || 'INR',
      })),
      pagination: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
      summary: summaryRes.rows[0],
    });
  } catch (err: any) {
    console.error('[/api/admin/analytics/paid-users] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch paid users', details: err.message },
      { status: 500 }
    );
  }
}
