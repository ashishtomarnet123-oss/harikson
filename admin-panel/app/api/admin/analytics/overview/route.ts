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

function parseDateRange(period: string, customStart?: string | null, customEnd?: string | null) {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);
  let compareStart: Date | null = null;
  let compareEnd: Date | null = null;
  let bucket = 'day';

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      compareStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
      compareEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      bucket = 'hour';
      break;

    case 'yesterday':
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      compareStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
      compareEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      bucket = 'hour';
      break;

    case '7d':
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      compareStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
      compareEnd = new Date(start.getTime() - 1);
      bucket = 'day';
      break;

    case 'this_week': {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      start.setDate(now.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      compareStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
      compareEnd = new Date(start.getTime() - 1);
      bucket = 'day';
      break;
    }

    case 'last_week': {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day - 7;
      start.setDate(now.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);
      end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      compareStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
      compareEnd = new Date(start.getTime() - 1);
      bucket = 'day';
      break;
    }

    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      compareStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      compareEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      bucket = 'day';
      break;

    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      compareStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      compareEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
      bucket = 'day';
      break;

    case 'this_quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qMonth, 1, 0, 0, 0, 0);
      compareStart = new Date(now.getFullYear(), qMonth - 3, 1, 0, 0, 0, 0);
      compareEnd = new Date(now.getFullYear(), qMonth, 0, 23, 59, 59, 999);
      bucket = 'month';
      break;
    }

    case 'last_quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3 - 3;
      start = new Date(now.getFullYear(), qMonth, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), qMonth + 3, 0, 23, 59, 59, 999);
      compareStart = new Date(now.getFullYear(), qMonth - 3, 1, 0, 0, 0, 0);
      compareEnd = new Date(now.getFullYear(), qMonth, 0, 23, 59, 59, 999);
      bucket = 'month';
      break;
    }

    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      compareStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      compareEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      bucket = 'month';
      break;

    case 'last_year':
      start = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      compareStart = new Date(now.getFullYear() - 2, 0, 1, 0, 0, 0, 0);
      compareEnd = new Date(now.getFullYear() - 2, 11, 31, 23, 59, 59, 999);
      bucket = 'month';
      break;

    case 'custom': {
      if (customStart) start = new Date(customStart);
      if (customEnd) end = new Date(customEnd);
      const spanMs = end.getTime() - start.getTime();
      compareStart = new Date(start.getTime() - spanMs);
      compareEnd = new Date(start.getTime() - 1);
      bucket = spanMs <= 86400000 ? 'hour' : spanMs <= 32 * 86400000 ? 'day' : 'month';
      break;
    }

    case 'all':
      start = new Date('2020-01-01T00:00:00Z');
      compareStart = null;
      compareEnd = null;
      bucket = 'month';
      break;

    case '30d':
    default:
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      compareStart = new Date(start.getTime() - 30 * 24 * 60 * 60 * 1000);
      compareEnd = new Date(start.getTime() - 1);
      bucket = 'day';
      break;
  }

  return { start, end, compareStart, compareEnd, bucket };
}

function calculatePercentChange(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function GET(req: NextRequest) {
  try {
    const auth = verifyAdmin(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const comparison = searchParams.get('comparison') || 'previous_period';

    const { start, end, compareStart, compareEnd, bucket } = parseDateRange(period, startDate, endDate);
    const pool = getDbPool();

    // 1. Current Period Financial KPIs & Totals
    const currentKpisQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= CURRENT_DATE THEN amount ELSE 0 END), 0) AS revenue_today,
        COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= CURRENT_DATE - INTERVAL '1 day' AND paid_at < CURRENT_DATE THEN amount ELSE 0 END), 0) AS revenue_yesterday,
        COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= $1 AND paid_at <= $2 THEN amount ELSE 0 END), 0) AS period_gross_revenue,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS lifetime_revenue,
        COALESCE(SUM(CASE WHEN status = 'refunded' AND created_at >= $1 AND created_at <= $2 THEN amount ELSE 0 END), 0) AS period_refunds,
        COALESCE(SUM(CASE WHEN status IN ('failed', 'unpaid') AND created_at >= $1 AND created_at <= $2 THEN amount ELSE 0 END), 0) AS failed_amount,
        COUNT(CASE WHEN status IN ('failed', 'unpaid') AND created_at >= $1 AND created_at <= $2 THEN 1 END) AS failed_count,
        COALESCE(SUM(CASE WHEN status IN ('open', 'pending', 'draft') AND created_at >= $1 AND created_at <= $2 THEN amount ELSE 0 END), 0) AS pending_amount,
        COUNT(CASE WHEN status IN ('open', 'pending', 'draft') AND created_at >= $1 AND created_at <= $2 THEN 1 END) AS pending_count,
        COUNT(CASE WHEN status = 'paid' AND paid_at >= $1 AND paid_at <= $2 THEN 1 END) AS paid_invoice_count,
        COUNT(DISTINCT CASE WHEN status = 'paid' AND paid_at >= $1 AND paid_at <= $2 THEN tenant_id END) AS paying_customers_period,
        COUNT(DISTINCT CASE WHEN status = 'paid' THEN tenant_id END) AS lifetime_paying_customers
      FROM invoices
    `;
    const currentKpisRes = await pool.query(currentKpisQuery, [start, end]);
    const currKpi = currentKpisRes.rows[0];

    // 2. Comparison Period Financial KPIs
    let prevKpi: any = null;
    if (comparison !== 'none' && compareStart && compareEnd) {
      const prevKpisQuery = `
        SELECT
          COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= $1 AND paid_at <= $2 THEN amount ELSE 0 END), 0) AS period_gross_revenue,
          COALESCE(SUM(CASE WHEN status = 'refunded' AND created_at >= $1 AND created_at <= $2 THEN amount ELSE 0 END), 0) AS period_refunds,
          COUNT(CASE WHEN status = 'paid' AND paid_at >= $1 AND paid_at <= $2 THEN 1 END) AS paid_invoice_count,
          COUNT(DISTINCT CASE WHEN status = 'paid' AND paid_at >= $1 AND paid_at <= $2 THEN tenant_id END) AS paying_customers_period
        FROM invoices
      `;
      const prevKpisRes = await pool.query(prevKpisQuery, [compareStart, compareEnd]);
      prevKpi = prevKpisRes.rows[0];
    }

    // 3. Subscriptions & MRR snapshot
    const subsQuery = `
      SELECT
        COALESCE(SUM(
          CASE 
            WHEN s.status IN ('active', 'canceling') AND s.amount > 0 THEN s.amount 
            WHEN (s.id IS NULL OR s.status IN ('active', 'canceling')) AND p.price > 0 AND t.status = 'active' THEN p.price
            ELSE 0 
          END
        ), 0) AS mrr,
        COUNT(DISTINCT CASE 
          WHEN (s.status IN ('active', 'canceling') AND s.amount > 0) OR (p.price > 0 AND t.status = 'active') 
          THEN COALESCE(s.tenant_id, t.id) 
        END) AS active_paid_subs,
        COUNT(DISTINCT CASE WHEN s.status IN ('trial', 'trialing') THEN s.id END) AS trial_subs,
        COUNT(DISTINCT CASE WHEN s.status = 'cancelled' THEN s.id END) AS cancelled_subs_all,
        COUNT(DISTINCT CASE WHEN s.status = 'cancelled' AND s.updated_at >= $1 AND s.updated_at <= $2 THEN s.id END) AS cancelled_subs_period,
        COUNT(DISTINCT CASE WHEN s.status = 'past_due' THEN s.id END) AS past_due_subs
      FROM plans p
      LEFT JOIN subscriptions s ON LOWER(s.plan_id) = LOWER(p.id)
      LEFT JOIN tenants t ON LOWER(t.plan) = LOWER(p.id)
    `;
    const subsRes = await pool.query(subsQuery, [start, end]);
    const subsKpi = subsRes.rows[0];

    // 4. Users snapshot
    const usersQuery = `
      SELECT
        COUNT(*) AS total_users,
        COUNT(CASE WHEN created_at >= $1 AND created_at <= $2 THEN 1 END) AS new_users_period,
        COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_users
      FROM users
      WHERE deleted_at IS NULL
    `;
    const usersRes = await pool.query(usersQuery, [start, end]);
    const userKpi = usersRes.rows[0];

    // Derived Financial KPIs
    const grossRev = parseFloat(currKpi.period_gross_revenue);
    const refunds = parseFloat(currKpi.period_refunds);
    const netRev = Math.max(0, grossRev - refunds);
    const mrr = parseFloat(subsKpi.mrr);
    const arr = mrr * 12;
    const payingCustomers = parseInt(currKpi.paying_customers_period, 10);
    const paidInvoices = parseInt(currKpi.paid_invoice_count, 10);
    const arppu = payingCustomers > 0 ? Math.round((grossRev / payingCustomers) * 100) / 100 : 0;
    const atv = paidInvoices > 0 ? Math.round((grossRev / paidInvoices) * 100) / 100 : 0;

    // Derived User & Sub KPIs
    const totalUsers = parseInt(userKpi.total_users, 10);
    const newUsers = parseInt(userKpi.new_users_period, 10);
    const activeSubs = parseInt(subsKpi.active_paid_subs, 10);
    const trialSubs = parseInt(subsKpi.trial_subs, 10);
    const freeUsers = Math.max(0, totalUsers - payingCustomers - trialSubs);
    const cancelledPeriod = parseInt(subsKpi.cancelled_subs_period, 10);
    const totalSubsBase = activeSubs + cancelledPeriod;
    const churnRate = totalSubsBase > 0 ? Math.round((cancelledPeriod / totalSubsBase) * 1000) / 10 : 0;
    const trialConversionRate = trialSubs + payingCustomers > 0
      ? Math.round((payingCustomers / (trialSubs + payingCustomers)) * 1000) / 10
      : 0;

    // Comparisons
    const prevGross = prevKpi ? parseFloat(prevKpi.period_gross_revenue) : 0;
    const prevNet = prevKpi ? Math.max(0, prevGross - parseFloat(prevKpi.period_refunds)) : 0;
    const prevPaying = prevKpi ? parseInt(prevKpi.paying_customers_period, 10) : 0;
    const prevInvoices = prevKpi ? parseInt(prevKpi.paid_invoice_count, 10) : 0;

    const deltas = {
      grossRevenue: {
        absolute: grossRev - prevGross,
        percent: calculatePercentChange(grossRev, prevGross),
      },
      netRevenue: {
        absolute: netRev - prevNet,
        percent: calculatePercentChange(netRev, prevNet),
      },
      payingCustomers: {
        absolute: payingCustomers - prevPaying,
        percent: calculatePercentChange(payingCustomers, prevPaying),
      },
      invoices: {
        absolute: paidInvoices - prevInvoices,
        percent: calculatePercentChange(paidInvoices, prevInvoices),
      },
    };

    // Time Series
    let dateTruncFormat = 'day';
    let toCharPattern = 'YYYY-MM-DD';
    if (bucket === 'hour') {
      dateTruncFormat = 'hour';
      toCharPattern = 'HH24:00';
    } else if (bucket === 'month') {
      dateTruncFormat = 'month';
      toCharPattern = 'YYYY-MM';
    }

    const timeSeriesQuery = `
      SELECT
        TO_CHAR(date_trunc('${dateTruncFormat}', paid_at), '${toCharPattern}') AS bucket_key,
        COALESCE(SUM(amount), 0)::numeric(10,2) AS gross_revenue,
        COUNT(id)::int AS orders_count
      FROM invoices
      WHERE status = 'paid' AND paid_at >= $1 AND paid_at <= $2
      GROUP BY date_trunc('${dateTruncFormat}', paid_at)
      ORDER BY date_trunc('${dateTruncFormat}', paid_at) ASC
    `;
    const timeSeriesRes = await pool.query(timeSeriesQuery, [start, end]);

    let compSeriesMap: Record<number, number> = {};
    if (comparison !== 'none' && compareStart && compareEnd) {
      const compTimeSeriesRes = await pool.query(timeSeriesQuery, [compareStart, compareEnd]);
      compTimeSeriesRes.rows.forEach((r: any, idx: number) => {
        compSeriesMap[idx] = parseFloat(r.gross_revenue);
      });
    }

    const revenueTimeSeries = timeSeriesRes.rows.map((r: any, idx: number) => ({
      label: r.bucket_key,
      date: r.bucket_key,
      revenue: parseFloat(r.gross_revenue),
      orders: r.orders_count,
      compareRevenue: compSeriesMap[idx] !== undefined ? compSeriesMap[idx] : 0,
    }));

    if (revenueTimeSeries.length === 0) {
      const emptyLabel = bucket === 'hour' ? '12:00' : start.toISOString().split('T')[0];
      revenueTimeSeries.push({
        label: emptyLabel,
        date: emptyLabel,
        revenue: 0,
        orders: 0,
        compareRevenue: 0,
      });
    }

    // Gross vs Refunds vs Net
    const grossVsNet = revenueTimeSeries.map((item: any) => ({
      label: item.label,
      gross: item.revenue,
      refunds: 0,
      net: item.revenue,
    }));

    // Revenue by Plan
    const planBreakdownQuery = `
      SELECT
        p.id,
        p.name,
        COALESCE(p.tier, 'starter') AS tier,
        p.price::numeric(10,2) AS price,
        COALESCE(p.billing, 'monthly') AS billing,
        COALESCE(p.currency, 'INR') AS currency,
        COALESCE(p.token_limit, -1) AS token_limit,
        COALESCE(p.agent_limit, -1) AS agent_limit,
        COALESCE(p.is_active, true) AS is_active,
        COALESCE(p.is_recommended, false) AS is_recommended,
        COALESCE(SUM(CASE WHEN i.status = 'paid' AND i.paid_at >= $1 AND i.paid_at <= $2 THEN i.amount ELSE 0 END), 0)::numeric(10,2) AS net_collected,
        COUNT(DISTINCT CASE WHEN i.status = 'paid' AND i.paid_at >= $1 AND i.paid_at <= $2 THEN i.id END)::int AS successful_payments,
        COUNT(DISTINCT CASE WHEN i.status = 'paid' AND i.paid_at >= $1 AND i.paid_at <= $2 THEN i.tenant_id END)::int AS paying_customers,
        COUNT(DISTINCT CASE 
          WHEN (s.status IN ('active', 'canceling') OR (s.id IS NULL AND t.status = 'active'))
          THEN COALESCE(s.tenant_id, t.id) 
        END)::int AS active_subscribers,
        COUNT(DISTINCT CASE WHEN s.status = 'cancelled' AND s.updated_at >= $1 AND s.updated_at <= $2 THEN s.id END)::int AS cancellations
      FROM plans p
      LEFT JOIN subscriptions s ON LOWER(s.plan_id) = LOWER(p.id)
      LEFT JOIN tenants t ON LOWER(t.plan) = LOWER(p.id)
      LEFT JOIN invoices i ON (i.subscription_id = s.id OR i.tenant_id = s.tenant_id OR i.tenant_id = t.id)
      GROUP BY p.id, p.name, p.tier, p.price, p.billing, p.currency, p.token_limit, p.agent_limit, p.is_active, p.is_recommended
      ORDER BY p.price ASC, net_collected DESC
    `;
    const planBreakdownRes = await pool.query(planBreakdownQuery, [start, end]);

    const totalPlanRevenue = planBreakdownRes.rows.reduce(
      (sum: number, p: any) => sum + parseFloat(p.net_collected),
      0
    );

    const plansBreakdown = planBreakdownRes.rows.map((p: any) => {
      const rev = parseFloat(p.net_collected);
      const share = totalPlanRevenue > 0 ? Math.round((rev / totalPlanRevenue) * 1000) / 10 : 0;
      const subs = parseInt(p.active_subscribers, 10);
      const canc = parseInt(p.cancellations, 10);
      const planChurn = subs + canc > 0 ? Math.round((canc / (subs + canc)) * 1000) / 10 : 0;
      return {
        id: p.id,
        name: p.name,
        tier: p.tier,
        price: parseFloat(p.price),
        billing: p.billing || 'monthly',
        currency: p.currency || 'INR',
        tokenLimit: p.token_limit,
        agentLimit: p.agent_limit,
        isActive: p.is_active,
        isRecommended: p.is_recommended,
        revenue: rev,
        share,
        successfulPayments: p.successful_payments,
        payingCustomers: p.paying_customers,
        activeSubscribers: subs,
        mrr: p.billing === 'monthly' ? subs * parseFloat(p.price) : (p.billing === 'yearly' ? Math.round((subs * parseFloat(p.price)) / 12) : 0),
        cancellations: canc,
        churnRate: planChurn,
      };
    });

    const subscriptionDistribution = [
      { status: 'Active Paid', count: activeSubs, color: '#10b981' },
      { status: 'Trial', count: trialSubs, color: '#3b82f6' },
      { status: 'Past Due', count: parseInt(subsKpi.past_due_subs, 10), color: '#f59e0b' },
      { status: 'Cancelled', count: parseInt(subsKpi.cancelled_subs_all, 10), color: '#ef4444' },
      { status: 'Free Plan', count: freeUsers, color: '#6b7280' },
    ];

    const userDistribution = [
      { category: 'Paying Customers', count: payingCustomers, color: '#10b981' },
      { category: 'Free Users', count: freeUsers, color: '#6b7280' },
      { category: 'Trial Users', count: trialSubs, color: '#3b82f6' },
    ];

    // User registrations vs paying over time
    const userRegQuery = `
      SELECT
        TO_CHAR(date_trunc('${dateTruncFormat}', created_at), '${toCharPattern}') AS bucket_key,
        COUNT(id)::int AS new_users
      FROM users
      WHERE created_at >= $1 AND created_at <= $2 AND deleted_at IS NULL
      GROUP BY date_trunc('${dateTruncFormat}', created_at)
      ORDER BY date_trunc('${dateTruncFormat}', created_at) ASC
    `;
    const userRegRes = await pool.query(userRegQuery, [start, end]);

    const userRegMap: Record<string, number> = {};
    userRegRes.rows.forEach((r: any) => {
      userRegMap[r.bucket_key] = r.new_users;
    });

    const newUsersVsPaying = revenueTimeSeries.map((b: any) => ({
      label: b.label,
      date: b.date,
      newUsers: userRegMap[b.label] || 0,
      newPayingCustomers: b.orders > 0 ? 1 : 0,
    }));

    const paymentStatusDistribution = [
      { status: 'Successful', count: paidInvoices, amount: grossRev, color: '#10b981' },
      { status: 'Failed / Unpaid', count: parseInt(currKpi.failed_count, 10), amount: parseFloat(currKpi.failed_amount), color: '#ef4444' },
      { status: 'Pending / Open', count: parseInt(currKpi.pending_count, 10), amount: parseFloat(currKpi.pending_amount), color: '#f59e0b' },
      { status: 'Refunded', count: refunds > 0 ? 1 : 0, amount: refunds, color: '#8b5cf6' },
    ];

    const geoQuery = `
      SELECT
        COALESCE(u.country, 'IN') AS country_code,
        COUNT(DISTINCT u.id)::int AS registered_users,
        COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN u.id END)::int AS paying_customers,
        COALESCE(SUM(CASE WHEN i.status = 'paid' AND i.paid_at >= $1 AND i.paid_at <= $2 THEN i.amount ELSE 0 END), 0)::numeric(10,2) AS revenue
      FROM users u
      LEFT JOIN invoices i ON i.tenant_id = u.tenant_id
      WHERE u.deleted_at IS NULL
      GROUP BY COALESCE(u.country, 'IN')
      ORDER BY revenue DESC, registered_users DESC
    `;
    const geoRes = await pool.query(geoQuery, [start, end]);

    const countryNames: Record<string, string> = {
      IN: 'India',
      US: 'United States',
      GB: 'United Kingdom',
      AE: 'United Arab Emirates',
      SG: 'Singapore',
      CA: 'Canada',
      AU: 'Australia',
      DE: 'Germany',
    };

    const geographicBreakdown = geoRes.rows.map((g: any) => {
      const reg = parseInt(g.registered_users, 10);
      const pay = parseInt(g.paying_customers, 10);
      const conv = reg > 0 ? Math.round((pay / reg) * 1000) / 10 : 0;
      return {
        countryCode: g.country_code,
        countryName: countryNames[g.country_code] || g.country_code,
        registeredUsers: reg,
        payingCustomers: pay,
        revenue: parseFloat(g.revenue),
        conversionRate: conv,
      };
    });

    const checkoutInitiatedCount = Math.max(paidInvoices, parseInt(currKpi.failed_count, 10) + paidInvoices);
    const conversionFunnel = [
      { stage: 'Registered Users', count: totalUsers, conversionRate: 100, dropoffRate: 0 },
      { stage: 'Active Product Users', count: Math.min(totalUsers, parseInt(userKpi.active_users, 10) || totalUsers), conversionRate: totalUsers > 0 ? Math.round(((parseInt(userKpi.active_users, 10) || totalUsers) / totalUsers) * 100) : 0, dropoffRate: 0 },
      { stage: 'Checkout Initiated', count: checkoutInitiatedCount, conversionRate: totalUsers > 0 ? Math.round((checkoutInitiatedCount / totalUsers) * 100) : 0, dropoffRate: 100 - (totalUsers > 0 ? Math.round((checkoutInitiatedCount / totalUsers) * 100) : 0) },
      { stage: 'Payment Succeeded', count: payingCustomers, conversionRate: checkoutInitiatedCount > 0 ? Math.round((payingCustomers / checkoutInitiatedCount) * 100) : 0, dropoffRate: checkoutInitiatedCount > 0 ? Math.round(((checkoutInitiatedCount - payingCustomers) / checkoutInitiatedCount) * 100) : 0 },
    ];

    const cohortRetention = [
      { cohort: 'Oct 2026', signups: totalUsers, week1: 100, month1: 100, month2: 85, month3: 75 },
    ];

    return NextResponse.json({
      success: true,
      period,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
        compareStart: compareStart ? compareStart.toISOString() : null,
        compareEnd: compareEnd ? compareEnd.toISOString() : null,
        bucket,
      },
      kpis: {
        revenueToday: parseFloat(currKpi.revenue_today),
        revenueYesterday: parseFloat(currKpi.revenue_yesterday),
        periodRevenue: grossRev,
        lifetimeRevenue: parseFloat(currKpi.lifetime_revenue),
        grossRevenue: grossRev,
        refunds,
        netRevenue: netRev,
        mrr,
        arr,
        arppu,
        averageTransactionValue: atv,
        failedAmount: parseFloat(currKpi.failed_amount),
        failedCount: parseInt(currKpi.failed_count, 10),
        pendingAmount: parseFloat(currKpi.pending_amount),
        pendingCount: parseInt(currKpi.pending_count, 10),
        paidInvoicesCount: paidInvoices,
        totalUsers,
        newUsersPeriod: newUsers,
        activeUsers: parseInt(userKpi.active_users, 10),
        payingCustomersPeriod: payingCustomers,
        lifetimePayingCustomers: parseInt(currKpi.lifetime_paying_customers, 10),
        activePaidSubscriptions: activeSubs,
        trialUsers: trialSubs,
        freeUsers,
        cancelledSubscriptionsPeriod: cancelledPeriod,
        churnRate,
        trialConversionRate,
        deltas,
      },
      revenueTimeSeries,
      grossVsNet,
      plansBreakdown,
      subscriptionDistribution,
      userDistribution,
      newUsersVsPaying,
      paymentStatusDistribution,
      geographicBreakdown,
      conversionFunnel,
      cohortRetention,
    });
  } catch (err: any) {
    console.error('[/api/admin/analytics/overview] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch analytics overview', details: err.message },
      { status: 500 }
    );
  }
}
