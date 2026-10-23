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
    const status = searchParams.get('status') || 'all';
    const provider = searchParams.get('provider') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (page - 1) * limit;
    const pool = getDbPool();
    const params: any[] = [];
    let whereClause = `WHERE 1=1`;

    if (search) {
      params.push(`%${search.trim()}%`);
      whereClause += ` AND (i.invoice_number ILIKE $${params.length} OR i.provider_invoice_id ILIKE $${params.length} OR t.name ILIKE $${params.length})`;
    }

    if (status && status !== 'all') {
      params.push(status);
      whereClause += ` AND i.status = $${params.length}`;
    }

    if (provider && provider !== 'all') {
      params.push(provider);
      whereClause += ` AND i.provider ILIKE $${params.length}`;
    }

    const countQuery = `
      SELECT COUNT(i.id) AS total
      FROM invoices i
      JOIN tenants t ON i.tenant_id = t.id
      ${whereClause}
    `;
    const countRes = await pool.query(countQuery, params);
    const totalRecords = parseInt(countRes.rows[0].total, 10);

    const validSortCols: Record<string, string> = {
      created_at: 'i.created_at',
      amount: 'i.amount',
      status: 'i.status',
      paid_at: 'i.paid_at',
    };
    const orderCol = validSortCols[sortBy] || 'i.created_at';

    const dataQuery = `
      SELECT
        i.id,
        i.invoice_number,
        i.provider,
        i.provider_invoice_id,
        i.amount::numeric(10,2) AS amount,
        i.currency,
        i.status,
        i.paid_at,
        i.created_at,
        i.pdf_url,
        i.invoice_url,
        t.id AS tenant_id,
        t.name AS tenant_name,
        COALESCE(s.plan_id, t.plan, 'standard') AS plan_name
      FROM invoices i
      JOIN tenants t ON i.tenant_id = t.id
      LEFT JOIN subscriptions s ON i.subscription_id = s.id
      ${whereClause}
      ORDER BY ${orderCol} ${sortOrder}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    const dataRes = await pool.query(dataQuery, params);

    const summaryQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN
          CASE WHEN currency IS NOT NULL AND TRIM(currency) != '' AND UPPER(TRIM(currency)) = 'INR' THEN amount WHEN UPPER(TRIM(currency)) = 'USD' THEN amount * 84.50 ELSE 0 END
        ELSE 0 END), 0)::numeric(10,2) AS successful_volume,
        COUNT(CASE WHEN status = 'paid' THEN 1 END)::int AS successful_count,
        COUNT(CASE WHEN status IN ('failed', 'unpaid') THEN 1 END)::int AS failed_count,
        COUNT(CASE WHEN status = 'refunded' THEN 1 END)::int AS refunded_count,
        COUNT(CASE WHEN status IN ('pending', 'open', 'draft') THEN 1 END)::int AS pending_count,
        COUNT(CASE WHEN status = 'paid' AND (currency IS NULL OR TRIM(currency) = '' OR UPPER(TRIM(currency)) NOT IN ('INR', 'USD')) THEN 1 END)::int AS unconvertible_count,
        COALESCE(SUM(CASE WHEN status = 'paid' AND (currency IS NULL OR TRIM(currency) = '' OR UPPER(TRIM(currency)) NOT IN ('INR', 'USD')) THEN amount ELSE 0 END), 0)::numeric(10,2) AS unconvertible_amount
      FROM invoices
    `;
    const summaryRes = await pool.query(summaryQuery);
    const unconvCount = parseInt(summaryRes.rows[0].unconvertible_count, 10) || 0;
    const unconvAmount = parseFloat(summaryRes.rows[0].unconvertible_amount) || 0;
    const isComplete = unconvCount === 0;

    return NextResponse.json({
      success: true,
      transactions: dataRes.rows.map((row: any) => ({
        id: row.id,
        invoiceNumber: row.invoice_number || `INV-${row.id.substring(0, 8).toUpperCase()}`,
        provider: row.provider || 'direct',
        providerInvoiceId: row.provider_invoice_id,
        amount: parseFloat(row.amount),
        currency: row.currency ? String(row.currency).trim().toUpperCase() : null,
        status: row.status,
        paidAt: row.paid_at,
        createdAt: row.created_at,
        pdfUrl: row.pdf_url,
        invoiceUrl: row.invoice_url,
        tenantId: row.tenant_id,
        tenantName: row.tenant_name,
        planName: row.plan_name,
      })),
      pagination: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
      summary: {
        ...summaryRes.rows[0],
        successfulVolume: isComplete ? parseFloat(summaryRes.rows[0].successful_volume) : null,
        isComplete,
        completenessStatus: isComplete ? 'complete' : 'incomplete_unresolved_currencies',
        unresolvedInvoices: {
          count: unconvCount,
          amount: unconvAmount,
        },
      },
    });
  } catch (err: any) {
    console.error('[/api/admin/analytics/transactions] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch transactions', details: err.message },
      { status: 500 }
    );
  }
}
