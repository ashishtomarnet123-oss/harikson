'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  CreditCard,
  Calendar,
  RefreshCw,
  Download,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Globe,
  PieChart as PieIcon,
  Layers,
  ChevronLeft,
  ChevronRight,
  FileText,
  ExternalLink,
  Zap,
  Activity,
} from 'lucide-react';
import {
  Card,
  Metric,
  Text,
  Grid,
  Flex,
  Badge,
  BadgeDelta,
  AreaChart,
  BarChart,
  DonutChart,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@tremor/react';
import { getCookie } from 'cookies-next';

interface OverviewPayload {
  period: string;
  dateRange: {
    start: string;
    end: string;
    compareStart: string | null;
    compareEnd: string | null;
    bucket: string;
  };
  kpis: {
    revenueToday: number;
    revenueYesterday: number;
    periodRevenue: number;
    lifetimeRevenue: number;
    grossRevenue: number;
    refunds: number;
    netRevenue: number;
    mrr: number;
    arr: number;
    arppu: number;
    averageTransactionValue: number;
    failedAmount: number;
    failedCount: number;
    pendingAmount: number;
    pendingCount: number;
    paidInvoicesCount: number;
    totalUsers: number;
    newUsersPeriod: number;
    activeUsers: number;
    payingCustomersPeriod: number;
    lifetimePayingCustomers: number;
    activePaidSubscriptions: number;
    trialUsers: number;
    freeUsers: number;
    cancelledSubscriptionsPeriod: number;
    churnRate: number;
    trialConversionRate: number;
    deltas: {
      grossRevenue: { absolute: number; percent: number };
      netRevenue: { absolute: number; percent: number };
      payingCustomers: { absolute: number; percent: number };
      invoices: { absolute: number; percent: number };
    };
  };
  revenueTimeSeries: Array<{
    label: string;
    date: string;
    revenue: number;
    orders: number;
    compareRevenue: number;
  }>;
  grossVsNet: Array<{
    label: string;
    gross: number;
    refunds: number;
    net: number;
  }>;
  plansBreakdown: Array<{
    id: string;
    name: string;
    price: number;
    billing: string;
    currency: string;
    revenue: number;
    share: number;
    successfulPayments: number;
    payingCustomers: number;
    activeSubscribers: number;
    mrr: number;
    cancellations: number;
    churnRate: number;
  }>;
  subscriptionDistribution: Array<{
    status: string;
    count: number;
    color: string;
  }>;
  userDistribution: Array<{
    category: string;
    count: number;
    color: string;
  }>;
  newUsersVsPaying: Array<{
    label: string;
    date: string;
    newUsers: number;
    newPayingCustomers: number;
  }>;
  paymentStatusDistribution: Array<{
    status: string;
    count: number;
    amount: number;
    color: string;
  }>;
  geographicBreakdown: Array<{
    countryCode: string;
    countryName: string;
    registeredUsers: number;
    payingCustomers: number;
    revenue: number;
    conversionRate: number;
  }>;
  conversionFunnel: Array<{
    stage: string;
    count: number;
    conversionRate: number;
    dropoffRate: number;
  }>;
  cohortRetention: Array<{
    cohort: string;
    signups: number;
    week1: number;
    month1: number;
    month2: number;
    month3: number;
  }>;
}

interface PaidUser {
  userId: string;
  userName: string;
  email: string;
  country: string;
  role: string;
  signupDate: string;
  tenantId: string;
  tenantName: string;
  currentPlan: string;
  subscriptionStatus: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  firstPaymentAt: string | null;
  lastPaymentAt: string | null;
  totalPaid: number;
  paidInvoicesCount: number;
  renewalAmount: number;
  currency: string;
}

interface Transaction {
  id: string;
  invoiceNumber: string;
  provider: string;
  providerInvoiceId: string | null;
  amount: number;
  currency: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  pdfUrl: string | null;
  invoiceUrl: string | null;
  tenantId: string;
  tenantName: string;
  planName: string;
}

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'This Week', value: 'this_week' },
  { label: 'Last Week', value: 'last_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'This Quarter', value: 'this_quarter' },
  { label: 'Last Quarter', value: 'last_quarter' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Last Year', value: 'last_year' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom Range', value: 'custom' },
];

export default function RevenueDashboard() {
  const [period, setPeriod] = useState<string>('30d');
  const [comparison, setComparison] = useState<string>('previous_period');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<number>(0);

  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Paid users tab state
  const [users, setUsers] = useState<PaidUser[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [usersSearch, setUsersSearch] = useState<string>('');
  const [usersPlanFilter, setUsersPlanFilter] = useState<string>('all');
  const [usersStatusFilter, setUsersStatusFilter] = useState<string>('all');
  const [usersPage, setUsersPage] = useState<number>(1);
  const [usersTotalPages, setUsersTotalPages] = useState<number>(1);
  const [usersSummary, setUsersSummary] = useState<any>(null);

  // Transactions tab state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState<boolean>(false);
  const [txSearch, setTxSearch] = useState<string>('');
  const [txStatusFilter, setTxStatusFilter] = useState<string>('all');
  const [txProviderFilter, setTxProviderFilter] = useState<string>('all');
  const [txPage, setTxPage] = useState<number>(1);
  const [txTotalPages, setTxTotalPages] = useState<number>(1);
  const [txSummary, setTxSummary] = useState<any>(null);

  const apiBase = '/api-proxy';

  const getAuthHeaders = useCallback(() => {
    const token =
      getCookie('admin_access_token') ||
      getCookie('admin_token') ||
      (typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null);
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  // Fetch Overview Analytics
  const fetchOverview = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        period,
        comparison,
        ...(period === 'custom' && customStart ? { startDate: customStart } : {}),
        ...(period === 'custom' && customEnd ? { endDate: customEnd } : {}),
      });

      // Try proxy first, then fallback to direct Next.js API route
      let res = await fetch(`${apiBase}/v1/admin/analytics/overview?${params}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!res.ok) {
        res = await fetch(`/api/admin/analytics/overview?${params}`, {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch analytics (Status ${res.status})`);
      }

      const data = await res.json();
      setOverview(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Error fetching revenue analytics:', err);
      setError(err.message || 'An unexpected error occurred while loading analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, comparison, customStart, customEnd, apiBase, getAuthHeaders]);

  // Fetch Paid Users
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        page: usersPage.toString(),
        limit: '15',
        search: usersSearch,
        plan: usersPlanFilter,
        status: usersStatusFilter,
      });

      let res = await fetch(`${apiBase}/v1/admin/analytics/paid-users?${params}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!res.ok) {
        res = await fetch(`/api/admin/analytics/paid-users?${params}`, {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
      }

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setUsersTotalPages(data.pagination?.totalPages || 1);
        setUsersSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Failed to fetch paid users list:', err);
    } finally {
      setUsersLoading(false);
    }
  }, [usersPage, usersSearch, usersPlanFilter, usersStatusFilter, apiBase, getAuthHeaders]);

  // Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const params = new URLSearchParams({
        page: txPage.toString(),
        limit: '15',
        search: txSearch,
        status: txStatusFilter,
        provider: txProviderFilter,
      });

      let res = await fetch(`${apiBase}/v1/admin/analytics/transactions?${params}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!res.ok) {
        res = await fetch(`/api/admin/analytics/transactions?${params}`, {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
      }

      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setTxTotalPages(data.pagination?.totalPages || 1);
        setTxSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Failed to fetch transactions list:', err);
    } finally {
      setTxLoading(false);
    }
  }, [txPage, txSearch, txStatusFilter, txProviderFilter, apiBase, getAuthHeaders]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (selectedTab === 1) fetchUsers();
  }, [selectedTab, fetchUsers]);

  useEffect(() => {
    if (selectedTab === 3) fetchTransactions();
  }, [selectedTab, fetchTransactions]);

  // Export CSV Helper
  const handleExportCSV = () => {
    if (!overview) return;
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (selectedTab === 1 && users.length > 0) {
      csvContent += 'User ID,Customer Name,Email,Tenant Name,Plan,Status,Signup Date,First Payment,Total Paid (INR),Invoices Count\n';
      users.forEach((u) => {
        csvContent += `"${u.userId}","${u.userName}","${u.email}","${u.tenantName}","${u.currentPlan}","${u.subscriptionStatus}","${u.signupDate}","${u.firstPaymentAt || ''}",${u.totalPaid},${u.paidInvoicesCount}\n`;
      });
    } else if (selectedTab === 3 && transactions.length > 0) {
      csvContent += 'Invoice Number,Customer Organization,Plan,Amount,Currency,Provider,Status,Paid At,Created At\n';
      transactions.forEach((tx) => {
        csvContent += `"${tx.invoiceNumber}","${tx.tenantName}","${tx.planName}",${tx.amount},"${tx.currency}","${tx.provider}","${tx.status}","${tx.paidAt || ''}","${tx.createdAt}"\n`;
      });
    } else {
      csvContent += 'Period,Gross Revenue,Refunds,Net Revenue,MRR,ARR,ARPPU,Paying Customers,Active Subs,Total Users\n';
      const k = overview.kpis;
      csvContent += `"${overview.period}",${k.grossRevenue},${k.refunds},${k.netRevenue},${k.mrr},${k.arr},${k.arppu},${k.payingCustomersPeriod},${k.activePaidSubscriptions},${k.totalUsers}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `xarwiz_bi_report_${period}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatDeltaType = (pct: number) => {
    if (pct > 0) return 'increase';
    if (pct < 0) return 'decrease';
    return 'unchanged';
  };

  return (
    <div className="space-y-8 pb-16">
      {/* ─── Header & Global Controls ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Revenue & Business Intelligence
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Financial performance, subscription health, customer analytics & real-time reconciliation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Live Database Verified
            </span>
            <span>•</span>
            <span>Refreshed: {lastRefreshed.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchOverview(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white text-sm font-medium transition disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={loading || !overview}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-300 hover:text-white text-sm font-medium transition disabled:opacity-50"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ─── Global Filter Bar ─── */}
      <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Date Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Date Range:
          </span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-gray-950 border border-gray-800 text-gray-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
          >
            {DATE_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          {/* Custom Date Inputs if 'custom' is selected */}
          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-gray-950 border border-gray-800 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-gray-500 text-xs">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-gray-950 border border-gray-800 text-gray-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => fetchOverview(false)}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Comparison Option */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-400" /> Comparison:
          </span>
          <select
            value={comparison}
            onChange={(e) => setComparison(e.target.value)}
            className="bg-gray-950 border border-gray-800 text-gray-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="previous_period">Previous Equivalent Period</option>
            <option value="previous_month">Previous Month</option>
            <option value="previous_year">Previous Year</option>
            <option value="none">No Comparison</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50 flex items-center justify-between text-red-300 text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchOverview()}
            className="px-3 py-1 bg-red-900/50 hover:bg-red-800/60 rounded text-xs font-medium text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-900/40 border border-gray-800" />
          ))}
        </div>
      )}

      {/* ─── Executive Overview: Top Financial & Business KPIs ─── */}
      {overview && (
        <div className="space-y-6">
          {/* Row 1: Primary Financial Metrics */}
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Financial Revenue Snapshot
            </h2>
            <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-5">
              {/* Period Revenue */}
              <Card
                className="bg-gray-900/40 border-gray-800/80 hover:border-indigo-500/40 transition-all cursor-pointer"
                decoration="top"
                decorationColor="indigo"
                onClick={() => setSelectedTab(0)}
              >
                <Flex justifyContent="between" alignItems="center">
                  <Text className="text-gray-400 font-medium text-xs">Collected Revenue (Selected Period)</Text>
                  <DollarSign className="w-4 h-4 text-indigo-400" />
                </Flex>
                <Flex className="mt-2 items-baseline" justifyContent="between">
                  <Metric className="text-white text-2xl font-bold">
                    {formatINR(overview.kpis.periodRevenue)}
                  </Metric>
                  {comparison !== 'none' && (
                    <BadgeDelta
                      deltaType={formatDeltaType(overview.kpis.deltas.grossRevenue.percent)}
                      size="xs"
                    >
                      {overview.kpis.deltas.grossRevenue.percent >= 0 ? '+' : ''}
                      {overview.kpis.deltas.grossRevenue.percent}%
                    </BadgeDelta>
                  )}
                </Flex>
                <Text className="text-gray-500 text-xs mt-1.5">
                  Gross: {formatINR(overview.kpis.grossRevenue)} • Refunds: {formatINR(overview.kpis.refunds)}
                </Text>
              </Card>

              {/* Today vs Yesterday */}
              <Card className="bg-gray-900/40 border-gray-800/80" decoration="top" decorationColor="emerald">
                <Flex justifyContent="between" alignItems="center">
                  <Text className="text-gray-400 font-medium text-xs">Today's Collected Revenue</Text>
                  <Clock className="w-4 h-4 text-emerald-400" />
                </Flex>
                <Flex className="mt-2 items-baseline" justifyContent="between">
                  <Metric className="text-white text-2xl font-bold">
                    {formatINR(overview.kpis.revenueToday)}
                  </Metric>
                  <Badge size="xs" color="emerald">
                    Yesterday: {formatINR(overview.kpis.revenueYesterday)}
                  </Badge>
                </Flex>
                <Text className="text-gray-500 text-xs mt-1.5">
                  Real-time midnight-to-now collection
                </Text>
              </Card>

              {/* Monthly Recurring Revenue (MRR) */}
              <Card
                className="bg-gray-900/40 border-gray-800/80 hover:border-blue-500/40 transition-all cursor-pointer"
                decoration="top"
                decorationColor="blue"
                onClick={() => setSelectedTab(2)}
              >
                <Flex justifyContent="between" alignItems="center">
                  <Text className="text-gray-400 font-medium text-xs">Monthly Recurring Revenue (MRR)</Text>
                  <Zap className="w-4 h-4 text-blue-400" />
                </Flex>
                <Flex className="mt-2 items-baseline" justifyContent="between">
                  <Metric className="text-white text-2xl font-bold">
                    {formatINR(overview.kpis.mrr)}
                  </Metric>
                  <Badge size="xs" color="blue">
                    ARR: {formatINR(overview.kpis.arr)}
                  </Badge>
                </Flex>
                <Text className="text-gray-500 text-xs mt-1.5">
                  From {overview.kpis.activePaidSubscriptions} active recurring subscriptions
                </Text>
              </Card>

              {/* Lifetime Collected Revenue */}
              <Card className="bg-gray-900/40 border-gray-800/80" decoration="top" decorationColor="amber">
                <Flex justifyContent="between" alignItems="center">
                  <Text className="text-gray-400 font-medium text-xs">Lifetime Business Revenue</Text>
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                </Flex>
                <Flex className="mt-2 items-baseline" justifyContent="between">
                  <Metric className="text-white text-2xl font-bold">
                    {formatINR(overview.kpis.lifetimeRevenue)}
                  </Metric>
                  <Badge size="xs" color="amber">
                    {overview.kpis.lifetimePayingCustomers} Paying Customers
                  </Badge>
                </Flex>
                <Text className="text-gray-500 text-xs mt-1.5">
                  Earliest verified transactions to present
                </Text>
              </Card>
            </Grid>
          </div>

          {/* Row 2: Customer, Subscription & Unit Economics KPIs */}
          <div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Customers, Subscriptions & Conversion
            </h2>
            <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-5">
              {/* Unique Paying Customers */}
              <Card
                className="bg-gray-900/40 border-gray-800/80 hover:border-emerald-500/40 transition-all cursor-pointer"
                decoration="top"
                decorationColor="emerald"
                onClick={() => setSelectedTab(1)}
              >
                <Flex justifyContent="between" alignItems="center">
                  <Text className="text-gray-400 font-medium text-xs">Unique Paying Customers</Text>
                  <Users className="w-4 h-4 text-emerald-400" />
                </Flex>
                <Flex className="mt-2 items-baseline" justifyContent="between">
                  <Metric className="text-white text-2xl font-bold">
                    {overview.kpis.payingCustomersPeriod}
                  </Metric>
                  <Badge size="xs" color="emerald">
                    ARPPU: {formatINR(overview.kpis.arppu)}
                  </Badge>
                </Flex>
                <Text className="text-gray-500 text-xs mt-1.5">
                  Lifetime paying: {overview.kpis.lifetimePayingCustomers} • Click to view directory
                </Text>
              </Card>

              {/* Active Paid Subscriptions */}
              <Card
                className="bg-gray-900/40 border-gray-800/80 hover:border-indigo-500/40 transition-all cursor-pointer"
                decoration="top"
                decorationColor="indigo"
                onClick={() => setSelectedTab(2)}
              >
                <Flex justifyContent="between" alignItems="center">
                  <Text className="text-gray-400 font-medium text-xs">Active Paid Subscriptions</Text>
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                </Flex>
                <Flex className="mt-2 items-baseline" justifyContent="between">
                  <Metric className="text-white text-2xl font-bold">
                    {overview.kpis.activePaidSubscriptions}
                  </Metric>
                  <Badge size="xs" color="indigo">
                    Churn: {overview.kpis.churnRate}%
                  </Badge>
                </Flex>
                <Text className="text-gray-500 text-xs mt-1.5">
                  {overview.kpis.cancelledSubscriptionsPeriod} cancellations during selected period
                </Text>
              </Card>

              {/* Free vs Trial Users */}
              <Card className="bg-gray-900/40 border-gray-800/80" decoration="top" decorationColor="violet">
                <Flex justifyContent="between" alignItems="center">
                  <Text className="text-gray-400 font-medium text-xs">Free & Trial Audience</Text>
                  <Users className="w-4 h-4 text-violet-400" />
                </Flex>
                <Flex className="mt-2 items-baseline" justifyContent="between">
                  <Metric className="text-white text-2xl font-bold">
                    {overview.kpis.freeUsers} Free
                  </Metric>
                  <Badge size="xs" color="violet">
                    {overview.kpis.trialUsers} On Trial
                  </Badge>
                </Flex>
                <Text className="text-gray-500 text-xs mt-1.5">
                  Total users: {overview.kpis.totalUsers} • New in period: {overview.kpis.newUsersPeriod}
                </Text>
              </Card>

              {/* Payment Health & ATV */}
              <Card
                className="bg-gray-900/40 border-gray-800/80 hover:border-amber-500/40 transition-all cursor-pointer"
                decoration="top"
                decorationColor="amber"
                onClick={() => setSelectedTab(3)}
              >
                <Flex justifyContent="between" alignItems="center">
                  <Text className="text-gray-400 font-medium text-xs">Payment Success & Health</Text>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </Flex>
                <Flex className="mt-2 items-baseline" justifyContent="between">
                  <Metric className="text-white text-2xl font-bold">
                    {overview.kpis.paidInvoicesCount} Paid
                  </Metric>
                  <Badge size="xs" color={overview.kpis.failedCount > 0 ? 'rose' : 'emerald'}>
                    {overview.kpis.failedCount} Failed
                  </Badge>
                </Flex>
                <Text className="text-gray-500 text-xs mt-1.5">
                  Avg Transaction: {formatINR(overview.kpis.averageTransactionValue)} • Click for transactions
                </Text>
              </Card>
            </Grid>
          </div>

          {/* ─── Detailed Analytics Tabs ─── */}
          <div className="pt-4">
            <TabGroup index={selectedTab} onIndexChange={setSelectedTab}>
              <TabList className="border-b border-gray-800 mb-6">
                <Tab className="text-sm font-medium py-3 px-4 focus:outline-none">
                  Overview & Visual Analytics
                </Tab>
                <Tab className="text-sm font-medium py-3 px-4 focus:outline-none">
                  Paid Customers ({overview.kpis.payingCustomersPeriod})
                </Tab>
                <Tab className="text-sm font-medium py-3 px-4 focus:outline-none">
                  Plan Performance ({overview.plansBreakdown.length})
                </Tab>
                <Tab className="text-sm font-medium py-3 px-4 focus:outline-none">
                  Transactions & Reconciliation ({overview.kpis.paidInvoicesCount})
                </Tab>
              </TabList>

              <TabPanels>
                {/* ─── TAB 1: VISUAL ANALYTICS ─── */}
                <TabPanel className="space-y-8">
                  {/* Chart A: Revenue Over Time */}
                  <Card className="bg-gray-900/40 border-gray-800/80">
                    <Flex justifyContent="between" alignItems="center" className="mb-4">
                      <div>
                        <h3 className="text-base font-bold text-white">Revenue Over Time</h3>
                        <p className="text-xs text-gray-400">
                          {overview.dateRange.bucket === 'hour'
                            ? 'Hourly collected revenue in INR'
                            : overview.dateRange.bucket === 'day'
                              ? 'Daily collected revenue trend in INR'
                              : 'Monthly collected revenue in INR'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge size="xs" color="indigo">
                          Total Period: {formatINR(overview.kpis.periodRevenue)}
                        </Badge>
                      </div>
                    </Flex>
                    <AreaChart
                      className="h-72 mt-4"
                      data={overview.revenueTimeSeries}
                      index="label"
                      categories={
                        comparison !== 'none'
                          ? ['revenue', 'compareRevenue']
                          : ['revenue']
                      }
                      colors={['indigo', 'slate']}
                      valueFormatter={(v) => formatINR(v)}
                      showLegend={comparison !== 'none'}
                      showGridLines={true}
                    />
                  </Card>

                  {/* Grid: Charts B & C */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chart B: Gross vs Refunds vs Net */}
                    <Card className="bg-gray-900/40 border-gray-800/80">
                      <h3 className="text-base font-bold text-white mb-1">
                        Gross vs Refunds vs Net Revenue
                      </h3>
                      <p className="text-xs text-gray-400 mb-4">
                        Reconciliation of gross collections against processed refunds
                      </p>
                      <BarChart
                        className="h-64 mt-2"
                        data={overview.grossVsNet}
                        index="label"
                        categories={['gross', 'refunds', 'net']}
                        colors={['blue', 'rose', 'emerald']}
                        valueFormatter={(v) => formatINR(v)}
                        showLegend={true}
                      />
                    </Card>

                    {/* Chart C: Revenue by Subscription Plan */}
                    <Card className="bg-gray-900/40 border-gray-800/80">
                      <h3 className="text-base font-bold text-white mb-1">
                        Revenue by Subscription Plan
                      </h3>
                      <p className="text-xs text-gray-400 mb-4">
                        Collected revenue contribution per plan in INR
                      </p>
                      <BarChart
                        className="h-64 mt-2"
                        data={overview.plansBreakdown}
                        index="name"
                        categories={['revenue']}
                        colors={['indigo']}
                        valueFormatter={(v) => formatINR(v)}
                        showLegend={false}
                        layout="horizontal"
                      />
                    </Card>
                  </div>

                  {/* Grid: Donut Distributions (Charts D, E, H) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Chart D: Subscription Distribution */}
                    <Card className="bg-gray-900/40 border-gray-800/80">
                      <h3 className="text-sm font-bold text-white mb-1">
                        Subscription Status Distribution
                      </h3>
                      <p className="text-xs text-gray-400 mb-4">Current subscription breakdown</p>
                      <DonutChart
                        className="h-52 mt-2"
                        data={overview.subscriptionDistribution}
                        category="count"
                        index="status"
                        colors={['emerald', 'blue', 'amber', 'rose', 'slate']}
                        valueFormatter={(v) => `${v} subscriptions`}
                      />
                    </Card>

                    {/* Chart E: Paying vs Free Users */}
                    <Card className="bg-gray-900/40 border-gray-800/80">
                      <h3 className="text-sm font-bold text-white mb-1">
                        Paying vs Free Audience
                      </h3>
                      <p className="text-xs text-gray-400 mb-4">Customer conversion ratio</p>
                      <DonutChart
                        className="h-52 mt-2"
                        data={overview.userDistribution}
                        category="count"
                        index="category"
                        colors={['emerald', 'slate', 'blue']}
                        valueFormatter={(v) => `${v} users`}
                      />
                    </Card>

                    {/* Chart H: Payment Status Health */}
                    <Card className="bg-gray-900/40 border-gray-800/80">
                      <h3 className="text-sm font-bold text-white mb-1">
                        Payment Health Distribution
                      </h3>
                      <p className="text-xs text-gray-400 mb-4">Transaction outcome breakdown</p>
                      <DonutChart
                        className="h-52 mt-2"
                        data={overview.paymentStatusDistribution}
                        category="count"
                        index="status"
                        colors={['emerald', 'rose', 'amber', 'violet']}
                        valueFormatter={(v) => `${v} payments`}
                      />
                    </Card>
                  </div>

                  {/* Chart F: New Users vs New Paying Customers */}
                  <Card className="bg-gray-900/40 border-gray-800/80">
                    <h3 className="text-base font-bold text-white mb-1">
                      New User Registrations vs New Paying Customers
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">
                      Tracking customer conversion timeline against platform signups
                    </p>
                    <AreaChart
                      className="h-64 mt-2"
                      data={overview.newUsersVsPaying}
                      index="label"
                      categories={['newUsers', 'newPayingCustomers']}
                      colors={['cyan', 'emerald']}
                      showLegend={true}
                    />
                  </Card>

                  {/* Grid: Conversion Funnel & Geographic Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chart J: Conversion Funnel */}
                    <Card className="bg-gray-900/40 border-gray-800/80">
                      <h3 className="text-base font-bold text-white mb-1">
                        Audience Conversion Funnel
                      </h3>
                      <p className="text-xs text-gray-400 mb-4">
                        Step-by-step conversion from registration to paid customer
                      </p>
                      <div className="space-y-4 mt-4">
                        {overview.conversionFunnel.map((step, idx) => (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-gray-200">
                                {idx + 1}. {step.stage}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-bold">{step.count} users</span>
                                <Badge size="xs" color="indigo">
                                  {step.conversionRate}%
                                </Badge>
                              </div>
                            </div>
                            <div className="w-full h-3 rounded-full bg-gray-800 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(5, step.conversionRate)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Chart G: Geographic Breakdown */}
                    <Card className="bg-gray-900/40 border-gray-800/80">
                      <h3 className="text-base font-bold text-white mb-1">
                        Audience & Geographic Revenue
                      </h3>
                      <p className="text-xs text-gray-400 mb-4">
                        User population and collected revenue by country / region
                      </p>
                      <div className="overflow-x-auto">
                        <Table className="mt-2">
                          <TableHead>
                            <TableRow className="border-b border-gray-800 text-xs">
                              <TableHeaderCell className="text-gray-400">Country</TableHeaderCell>
                              <TableHeaderCell className="text-gray-400 text-right">Users</TableHeaderCell>
                              <TableHeaderCell className="text-gray-400 text-right">Paying</TableHeaderCell>
                              <TableHeaderCell className="text-gray-400 text-right">Revenue</TableHeaderCell>
                              <TableHeaderCell className="text-gray-400 text-right">Conv. Rate</TableHeaderCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {overview.geographicBreakdown.map((geo, idx) => (
                              <TableRow key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                                <TableCell className="font-medium text-white flex items-center gap-2">
                                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>{geo.countryName}</span>
                                  <span className="text-xs text-gray-500">({geo.countryCode})</span>
                                </TableCell>
                                <TableCell className="text-right text-gray-300">
                                  {geo.registeredUsers}
                                </TableCell>
                                <TableCell className="text-right text-emerald-400 font-semibold">
                                  {geo.payingCustomers}
                                </TableCell>
                                <TableCell className="text-right text-white font-bold">
                                  {formatINR(geo.revenue)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge size="xs" color="indigo">
                                    {geo.conversionRate}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  </div>

                  {/* Chart K: Cohort Retention */}
                  <Card className="bg-gray-900/40 border-gray-800/80">
                    <h3 className="text-base font-bold text-white mb-1">
                      Signup Cohort Retention
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">
                      Retention percentage of signups remaining active across weekly and monthly intervals
                    </p>
                    <div className="overflow-x-auto">
                      <Table className="mt-2">
                        <TableHead>
                          <TableRow className="border-b border-gray-800 text-xs">
                            <TableHeaderCell className="text-gray-400">Signup Cohort</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400 text-right">Signups</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400 text-right">Week 1</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400 text-right">Month 1</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400 text-right">Month 2</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400 text-right">Month 3</TableHeaderCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {overview.cohortRetention.map((cohort, idx) => (
                            <TableRow key={idx} className="border-b border-gray-800/50">
                              <TableCell className="font-medium text-white">{cohort.cohort}</TableCell>
                              <TableCell className="text-right text-gray-300 font-bold">{cohort.signups}</TableCell>
                              <TableCell className="text-right">
                                <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 text-xs font-semibold">
                                  {cohort.week1}%
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 text-xs font-semibold">
                                  {cohort.month1}%
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="px-2 py-0.5 rounded bg-blue-950/40 text-blue-300 text-xs font-semibold">
                                  {cohort.month2}%
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="px-2 py-0.5 rounded bg-indigo-950/40 text-indigo-300 text-xs font-semibold">
                                  {cohort.month3}%
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </TabPanel>

                {/* ─── TAB 2: PAID CUSTOMERS DIRECTORY ─── */}
                <TabPanel className="space-y-6">
                  {/* Summary Counters */}
                  {usersSummary && (
                    <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-5">
                      <Card className="bg-gray-900/40 border-gray-800">
                        <Text className="text-gray-400 text-xs font-medium">Total Paying Customers</Text>
                        <Metric className="text-white text-2xl font-bold mt-1">
                          {usersSummary.total_paying || 0}
                        </Metric>
                      </Card>
                      <Card className="bg-gray-900/40 border-gray-800">
                        <Text className="text-gray-400 text-xs font-medium">Active Paid Subscriptions</Text>
                        <Metric className="text-emerald-400 text-2xl font-bold mt-1">
                          {usersSummary.active_paying || 0}
                        </Metric>
                      </Card>
                      <Card className="bg-gray-900/40 border-gray-800">
                        <Text className="text-gray-400 text-xs font-medium">Churned Customers</Text>
                        <Metric className="text-rose-400 text-2xl font-bold mt-1">
                          {usersSummary.churned_paying || 0}
                        </Metric>
                      </Card>
                      <Card className="bg-gray-900/40 border-gray-800">
                        <Text className="text-gray-400 text-xs font-medium">Average Customer LTV</Text>
                        <Metric className="text-indigo-400 text-2xl font-bold mt-1">
                          {formatINR(parseFloat(usersSummary.avg_ltv || 0))}
                        </Metric>
                      </Card>
                    </Grid>
                  )}

                  {/* Filter & Search Bar */}
                  <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search customers by name, email, or organization..."
                        value={usersSearch}
                        onChange={(e) => {
                          setUsersSearch(e.target.value);
                          setUsersPage(1);
                        }}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={usersPlanFilter}
                        onChange={(e) => {
                          setUsersPlanFilter(e.target.value);
                          setUsersPage(1);
                        }}
                        className="bg-gray-950 border border-gray-800 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="all">All Plans</option>
                        <option value="professional">Professional</option>
                        <option value="starter">Starter</option>
                        <option value="enterprise">Enterprise</option>
                        <option value="free">Free</option>
                      </select>

                      <select
                        value={usersStatusFilter}
                        onChange={(e) => {
                          setUsersStatusFilter(e.target.value);
                          setUsersPage(1);
                        }}
                        className="bg-gray-950 border border-gray-800 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="past_due">Past Due</option>
                        <option value="free">Free</option>
                      </select>
                    </div>
                  </div>

                  {/* Customers Table */}
                  <Card className="bg-gray-900/40 border-gray-800/80 p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHead>
                          <TableRow className="border-b border-gray-800 bg-gray-950/40 text-xs">
                            <TableHeaderCell className="text-gray-400">Customer</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400">Workspace / Org</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400">Plan</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400">Status</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400">Signup Date</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400">Last Payment</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400 text-right">Total Paid</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400 text-right">Invoices</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400">Renewal</TableHeaderCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {usersLoading ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                <div className="flex items-center justify-center gap-2">
                                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                                  <span>Loading customer directory...</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : users.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                                No matching customers found.
                              </TableCell>
                            </TableRow>
                          ) : (
                            users.map((u) => (
                              <TableRow key={u.userId} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                                <TableCell>
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300">
                                      {u.userName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-white text-sm">{u.userName}</p>
                                      <p className="text-xs text-gray-400">{u.email}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-gray-300 font-medium">
                                  {u.tenantName}
                                </TableCell>
                                <TableCell>
                                  <Badge size="xs" color="indigo">
                                    {u.currentPlan.toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    size="xs"
                                    color={
                                      u.subscriptionStatus === 'active'
                                        ? 'emerald'
                                        : u.subscriptionStatus === 'cancelled'
                                          ? 'rose'
                                          : u.subscriptionStatus === 'past_due'
                                            ? 'amber'
                                            : 'slate'
                                    }
                                  >
                                    {u.subscriptionStatus.toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-gray-400">
                                  {new Date(u.signupDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-xs text-gray-300">
                                  {u.lastPaymentAt
                                    ? new Date(u.lastPaymentAt).toLocaleDateString()
                                    : 'None'}
                                </TableCell>
                                <TableCell className="text-right font-bold text-white">
                                  {formatINR(u.totalPaid)}
                                </TableCell>
                                <TableCell className="text-right text-gray-300 font-medium">
                                  {u.paidInvoicesCount}
                                </TableCell>
                                <TableCell className="text-xs text-gray-400">
                                  {u.currentPeriodEnd
                                    ? new Date(u.currentPeriodEnd).toLocaleDateString()
                                    : '—'}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {usersTotalPages > 1 && (
                      <div className="p-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
                        <span>Page {usersPage} of {usersTotalPages}</span>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={usersPage <= 1}
                            onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                            className="p-1.5 rounded bg-gray-950 border border-gray-800 hover:bg-gray-800 disabled:opacity-40"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            disabled={usersPage >= usersTotalPages}
                            onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))}
                            className="p-1.5 rounded bg-gray-950 border border-gray-800 hover:bg-gray-800 disabled:opacity-40"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                </TabPanel>

                {/* ─── TAB 3: SUBSCRIPTION PLANS PERFORMANCE ─── */}
                <TabPanel className="space-y-6">
                  <Card className="bg-gray-900/40 border-gray-800/80 p-0 overflow-hidden">
                    <div className="p-4 border-b border-gray-800">
                      <h3 className="text-base font-bold text-white">Configured Subscription Plans Comparison</h3>
                      <p className="text-xs text-gray-400">
                        Comprehensive revenue generation, subscriber count, MRR contribution, and churn metrics
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHead>
                          <TableRow className="border-b border-gray-800 bg-gray-950/40 text-xs">
                            <TableHeaderCell className="text-gray-400">Plan Name</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400">Billing</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400 text-right">Configured Price</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400 text-right">Subscribers</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400 text-right">Gross Volume</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400 text-right">Net Revenue</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400 text-right">MRR Contribution</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400 text-right">Revenue Share</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400 text-right">Cancellations</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400 text-right">Churn Rate</TableHeaderCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {overview.plansBreakdown.map((plan) => (
                            <TableRow key={plan.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                              <TableCell className="font-bold text-white flex items-center gap-2">
                                <span>{plan.name}</span>
                                {plan.revenue > 0 && (
                                  <Badge size="xs" color="emerald">
                                    Top Earner
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-gray-400 capitalize">{plan.billing}</TableCell>
                              <TableCell className="text-right font-medium text-gray-300">
                                {formatINR(plan.price)}
                              </TableCell>
                              <TableCell className="text-right font-bold text-indigo-400">
                                {plan.activeSubscribers}
                              </TableCell>
                              <TableCell className="text-right text-white font-bold">
                                {formatINR(plan.revenue)}
                              </TableCell>
                              <TableCell className="text-right text-emerald-400 font-bold">
                                {formatINR(plan.revenue)}
                              </TableCell>
                              <TableCell className="text-right font-bold text-blue-400">
                                {formatINR(plan.mrr)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge size="xs" color="indigo">
                                  {plan.share}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-gray-400">{plan.cancellations}</TableCell>
                              <TableCell className="text-right">
                                <Badge size="xs" color={plan.churnRate > 0 ? 'rose' : 'emerald'}>
                                  {plan.churnRate}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </TabPanel>

                {/* ─── TAB 4: TRANSACTIONS & RECONCILIATION ─── */}
                <TabPanel className="space-y-6">
                  {/* Summary row */}
                  {txSummary && (
                    <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-5">
                      <Card className="bg-gray-900/40 border-gray-800">
                        <Text className="text-gray-400 text-xs font-medium">Successful Payment Volume</Text>
                        <Metric className="text-emerald-400 text-2xl font-bold mt-1">
                          {formatINR(parseFloat(txSummary.successful_volume || 0))}
                        </Metric>
                      </Card>
                      <Card className="bg-gray-900/40 border-gray-800">
                        <Text className="text-gray-400 text-xs font-medium">Paid Invoices Count</Text>
                        <Metric className="text-white text-2xl font-bold mt-1">
                          {txSummary.successful_count || 0}
                        </Metric>
                      </Card>
                      <Card className="bg-gray-900/40 border-gray-800">
                        <Text className="text-gray-400 text-xs font-medium">Failed Invoices</Text>
                        <Metric className="text-rose-400 text-2xl font-bold mt-1">
                          {txSummary.failed_count || 0}
                        </Metric>
                      </Card>
                      <Card className="bg-gray-900/40 border-gray-800">
                        <Text className="text-gray-400 text-xs font-medium">Refunded Invoices</Text>
                        <Metric className="text-purple-400 text-2xl font-bold mt-1">
                          {txSummary.refunded_count || 0}
                        </Metric>
                      </Card>
                    </Grid>
                  )}

                  {/* Filter & Search Bar */}
                  <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search transactions by invoice #, provider reference, customer..."
                        value={txSearch}
                        onChange={(e) => {
                          setTxSearch(e.target.value);
                          setTxPage(1);
                        }}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={txStatusFilter}
                        onChange={(e) => {
                          setTxStatusFilter(e.target.value);
                          setTxPage(1);
                        }}
                        className="bg-gray-950 border border-gray-800 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="all">All Statuses</option>
                        <option value="paid">Paid</option>
                        <option value="failed">Failed</option>
                        <option value="open">Open / Pending</option>
                        <option value="refunded">Refunded</option>
                      </select>

                      <select
                        value={txProviderFilter}
                        onChange={(e) => {
                          setTxProviderFilter(e.target.value);
                          setTxPage(1);
                        }}
                        className="bg-gray-950 border border-gray-800 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="all">All Gateways</option>
                        <option value="cashfree">Cashfree</option>
                        <option value="razorpay">Razorpay</option>
                        <option value="stripe">Stripe</option>
                        <option value="phonepe">PhonePe</option>
                      </select>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <Card className="bg-gray-900/40 border-gray-800/80 p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHead>
                          <TableRow className="border-b border-gray-800 bg-gray-950/40 text-xs">
                            <TableHeaderCell className="text-gray-400">Invoice Number</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400">Customer Workspace</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400">Plan</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400 text-right">Amount</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400">Provider</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400">Status</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400">Date & Time</TableHeaderCell>
                            <TableHeaderCell className="text-gray-400 text-right">Receipt</TableHeaderCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {txLoading ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                <div className="flex items-center justify-center gap-2">
                                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                                  <span>Loading verified transaction records...</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : transactions.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                No transaction records found.
                              </TableCell>
                            </TableRow>
                          ) : (
                            transactions.map((tx) => (
                              <TableRow key={tx.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                                <TableCell className="font-mono text-xs text-indigo-400 font-semibold">
                                  {tx.invoiceNumber}
                                </TableCell>
                                <TableCell className="font-medium text-white text-sm">
                                  {tx.tenantName}
                                </TableCell>
                                <TableCell>
                                  <Badge size="xs" color="indigo">
                                    {tx.planName.toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-bold text-white">
                                  {formatINR(tx.amount)}
                                </TableCell>
                                <TableCell>
                                  <Badge size="xs" color="blue">
                                    {tx.provider.toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    size="xs"
                                    color={
                                      tx.status === 'paid'
                                        ? 'emerald'
                                        : tx.status === 'failed'
                                          ? 'rose'
                                          : tx.status === 'refunded'
                                            ? 'purple'
                                            : 'amber'
                                    }
                                  >
                                    {tx.status.toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-gray-400">
                                  {new Date(tx.createdAt).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  {tx.pdfUrl ? (
                                    <a
                                      href={tx.pdfUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                                    >
                                      <FileText className="w-3.5 h-3.5" /> Receipt
                                    </a>
                                  ) : (
                                    <span className="text-xs text-gray-600">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    {txTotalPages > 1 && (
                      <div className="p-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
                        <span>Page {txPage} of {txTotalPages}</span>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={txPage <= 1}
                            onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                            className="p-1.5 rounded bg-gray-950 border border-gray-800 hover:bg-gray-800 disabled:opacity-40"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            disabled={txPage >= txTotalPages}
                            onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))}
                            className="p-1.5 rounded bg-gray-950 border border-gray-800 hover:bg-gray-800 disabled:opacity-40"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                </TabPanel>
              </TabPanels>
            </TabGroup>
          </div>
        </div>
      )}
    </div>
  );
}
