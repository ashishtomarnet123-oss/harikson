'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Crown,
  Star,
  Package,
  Edit2,
  X,
  Check,
  Percent,
  Sliders,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { getCookie } from 'cookies-next';
import Link from 'next/link';

// ─── Interfaces ─────────────────────────────────────────────────────────────

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
    tier?: string;
    price: number;
    billing: string;
    currency: string;
    tokenLimit?: number;
    agentLimit?: number;
    isActive?: boolean;
    isRecommended?: boolean;
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

interface LivePlan {
  id: string;
  name: string;
  tier?: string;
  price: number;
  billing: string;
  currency: string;
  token_limit?: number;
  agent_limit?: number;
  is_active?: boolean;
  is_recommended?: boolean;
  description?: string;
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
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'This Quarter', value: 'this_quarter' },
  { label: 'This Year', value: 'this_year' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom', value: 'custom' },
];

// ─── Number & Currency Formatter ─────────────────────────────────────────────

function formatINR(val: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

function formatCompactINR(val: number) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
  return `₹${Math.round(val)}`;
}

// ─── Native SVG Chart Components ─────────────────────────────────────────────

// 1. Interactive Area / Spline Chart for Revenue Over Time
function InteractiveSplineChart({
  data,
  showComparison = true,
}: {
  data: Array<{ label: string; date: string; revenue: number; orders: number; compareRevenue: number }>;
  showComparison?: boolean;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
        No time-series data available for this range
      </div>
    );
  }

  const width = 800;
  const height = 260;
  const padding = { top: 20, right: 30, bottom: 35, left: 60 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(
    ...data.map((d) => d.revenue),
    ...(showComparison ? data.map((d) => d.compareRevenue || 0) : []),
    100
  );

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return padding.top + chartHeight - (val / maxVal) * chartHeight;
  };

  // Build smooth cubic bezier curve
  const buildSmoothPath = (values: number[]) => {
    if (values.length === 0) return '';
    const points = values.map((v, i) => ({ x: getX(i), y: getY(v) }));
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const revValues = data.map((d) => d.revenue);
  const compValues = data.map((d) => d.compareRevenue || 0);

  const splinePath = buildSmoothPath(revValues);
  const compPath = showComparison ? buildSmoothPath(compValues) : '';

  const areaPath = `${splinePath} L ${getX(data.length - 1)} ${padding.top + chartHeight} L ${getX(0)} ${padding.top + chartHeight} Z`;

  // Grid line values
  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  // Mouse move handler for interactive crosshair
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * width;

    if (svgX < padding.left || svgX > padding.left + chartWidth) {
      setHoverIndex(null);
      return;
    }

    const relX = svgX - padding.left;
    const ratio = relX / chartWidth;
    const index = Math.round(ratio * (data.length - 1));
    if (index >= 0 && index < data.length) {
      setHoverIndex(index);
    }
  };

  const activePoint = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div ref={containerRef} className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="revenueGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#4f46e5" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#312e81" stopOpacity="0" />
          </linearGradient>
          <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Horizontal Grid lines */}
        {yTicks.map((tick, i) => {
          const y = getY(tick);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-gray-500 font-mono"
              >
                {formatCompactINR(tick)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#revenueGlow)" />

        {/* Comparison Line */}
        {showComparison && compPath && (
          <path
            d={compPath}
            fill="none"
            stroke="#64748b"
            strokeWidth="2"
            strokeDasharray="5 5"
            opacity="0.7"
          />
        )}

        {/* Main Spline Curve */}
        <path
          d={splinePath}
          fill="none"
          stroke="#818cf8"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glowEffect)"
        />

        {/* X-axis labels */}
        {data.map((d, i) => {
          // Show ~6 evenly spaced labels
          const step = Math.max(1, Math.floor(data.length / 6));
          if (i % step !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={i}
              x={getX(i)}
              y={height - 8}
              textAnchor="middle"
              className="text-[10px] fill-gray-400 font-sans"
            >
              {d.label}
            </text>
          );
        })}

        {/* Interactive Hover Crosshair */}
        {hoverIndex !== null && (
          <g>
            <line
              x1={getX(hoverIndex)}
              y1={padding.top}
              x2={getX(hoverIndex)}
              y2={padding.top + chartHeight}
              stroke="#818cf8"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.8"
            />
            {showComparison && (
              <circle
                cx={getX(hoverIndex)}
                cy={getY(data[hoverIndex].compareRevenue || 0)}
                r="4.5"
                fill="#64748b"
                stroke="#0f172a"
                strokeWidth="2"
              />
            )}
            <circle
              cx={getX(hoverIndex)}
              cy={getY(data[hoverIndex].revenue)}
              r="6.5"
              fill="#818cf8"
              stroke="#ffffff"
              strokeWidth="2.5"
              filter="url(#glowEffect)"
            />
          </g>
        )}
      </svg>

      {/* Floating Glassmorphic Tooltip */}
      {activePoint && hoverIndex !== null && (
        <div
          className="absolute pointer-events-none bg-slate-900/95 border border-indigo-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-md transition-all text-xs z-30"
          style={{
            left: `${Math.min(78, Math.max(18, (getX(hoverIndex) / width) * 100))}%`,
            top: '8px',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-bold text-gray-200 border-b border-slate-800 pb-1 mb-1.5 flex items-center justify-between gap-4">
            <span>{activePoint.label}</span>
            <span className="text-[10px] text-gray-400 font-normal">{activePoint.orders} order{activePoint.orders !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-emerald-400 font-bold">
            <span className="flex items-center gap-1.5 text-gray-300">
              <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
              Collected:
            </span>
            <span>{formatINR(activePoint.revenue)}</span>
          </div>
          {showComparison && (
            <div className="flex items-center justify-between gap-4 text-gray-400 mt-1 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                Previous:
              </span>
              <span>{formatINR(activePoint.compareRevenue || 0)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 2. Interactive SVG Bar Chart for Gross vs Refunds vs Net
function InteractiveBarChart({
  data,
}: {
  data: Array<{ label: string; gross: number; refunds: number; net: number }>;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-60 flex items-center justify-center text-gray-500 text-sm">
        No breakdown data available
      </div>
    );
  }

  const width = 600;
  const height = 240;
  const padding = { top: 20, right: 20, bottom: 35, left: 55 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.gross, d.net, d.refunds)),
    100
  );

  const groupWidth = chartWidth / data.length;
  const barWidth = Math.min(18, (groupWidth - 8) / 3);

  const getY = (val: number) => {
    return padding.top + chartHeight - (val / maxVal) * chartHeight;
  };

  const getBarHeight = (val: number) => {
    return Math.max(2, (val / maxVal) * chartHeight);
  };

  const yTicks = [0, maxVal * 0.5, maxVal];

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Horizontal grid lines */}
        {yTicks.map((tick, i) => {
          const y = getY(tick);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-gray-500 font-mono"
              >
                {formatCompactINR(tick)}
              </text>
            </g>
          );
        })}

        {/* Grouped Bars */}
        {data.map((d, i) => {
          const groupX = padding.left + i * groupWidth + (groupWidth - barWidth * 3 - 4) / 2;
          const isHovered = hoverIndex === i;

          return (
            <g
              key={i}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              className="cursor-pointer transition-opacity"
              opacity={hoverIndex === null || isHovered ? 1 : 0.4}
            >
              {/* Gross Bar (Indigo) */}
              <rect
                x={groupX}
                y={getY(d.gross)}
                width={barWidth}
                height={getBarHeight(d.gross)}
                fill="#6366f1"
                rx="3"
              />

              {/* Refunds Bar (Rose) */}
              <rect
                x={groupX + barWidth + 2}
                y={getY(d.refunds)}
                width={barWidth}
                height={getBarHeight(d.refunds)}
                fill="#f43f5e"
                rx="3"
              />

              {/* Net Bar (Emerald) */}
              <rect
                x={groupX + (barWidth + 2) * 2}
                y={getY(d.net)}
                width={barWidth}
                height={getBarHeight(d.net)}
                fill="#10b981"
                rx="3"
              />

              {/* Label */}
              <text
                x={groupX + (barWidth * 3 + 4) / 2}
                y={height - 10}
                textAnchor="middle"
                className={`text-[9px] font-sans ${isHovered ? 'fill-indigo-300 font-bold' : 'fill-gray-400'}`}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Hover tooltip for Bar Chart */}
      {hoverIndex !== null && data[hoverIndex] && (
        <div className="absolute top-2 right-4 bg-slate-900/95 border border-indigo-500/40 rounded-xl p-2.5 shadow-xl text-xs z-20 pointer-events-none">
          <div className="font-bold text-gray-200 border-b border-slate-800 pb-1 mb-1">
            {data[hoverIndex].label}
          </div>
          <div className="text-indigo-400">Gross: {formatINR(data[hoverIndex].gross)}</div>
          <div className="text-rose-400">Refunds: {formatINR(data[hoverIndex].refunds)}</div>
          <div className="text-emerald-400 font-bold">Net: {formatINR(data[hoverIndex].net)}</div>
        </div>
      )}
    </div>
  );
}

// 3. Precision Interactive SVG Donut / Ring Chart
function InteractiveDonutChart({
  data,
  centerLabel = 'Total',
}: {
  data: Array<{ status?: string; category?: string; count: number; color: string }>;
  centerLabel?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = useMemo(() => data.reduce((sum, d) => sum + (d.count || 0), 0), [data]);

  if (total === 0) {
    return (
      <div className="h-52 flex flex-col items-center justify-center text-gray-500 text-xs">
        <PieIcon className="w-8 h-8 text-gray-600 mb-2 opacity-40" />
        <span>No distribution data recorded</span>
      </div>
    );
  }

  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#1e293b"
            strokeWidth={strokeWidth - 6}
          />

          {/* Slices */}
          {data.map((item, idx) => {
            if (item.count <= 0) return null;
            const slicePercent = item.count / total;
            const strokeDasharray = `${slicePercent * circumference} ${circumference}`;
            const strokeDashoffset = -currentOffset * circumference;
            currentOffset += slicePercent;

            const isHovered = hoveredIdx === idx;

            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          {hoveredIdx !== null && data[hoveredIdx] ? (
            <>
              <span className="text-[11px] text-gray-400 font-medium">
                {data[hoveredIdx].status || data[hoveredIdx].category}
              </span>
              <span className="text-lg font-black text-white">
                {data[hoveredIdx].count}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {Math.round((data[hoveredIdx].count / total) * 100)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-xl font-black text-white tracking-tight">{total}</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">{centerLabel}</span>
            </>
          )}
        </div>
      </div>

      {/* Legend chips */}
      <div className="grid grid-cols-2 gap-2 mt-4 w-full text-xs">
        {data.map((item, idx) => {
          const label = item.status || item.category || 'Unknown';
          const pct = Math.round((item.count / total) * 100);
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center justify-between p-1.5 rounded-lg border cursor-pointer transition ${
                isHovered
                  ? 'bg-slate-800/90 border-indigo-500/60 text-white'
                  : 'bg-slate-900/40 border-slate-800/60 text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-[11px] font-medium">{label}</span>
              </div>
              <span className="font-mono text-[11px] text-gray-300 ml-1">
                {item.count} <span className="text-[9px] text-gray-500">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 4. Sparkline helper for Top KPI Cards
function Sparkline({ data, color = '#6366f1' }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const width = 80;
  const height = 28;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg width={width} height={height} className="overflow-visible opacity-75">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(' ')}
      />
    </svg>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function RevenueDashboard() {
  const [period, setPeriod] = useState<string>('30d');
  const [comparison, setComparison] = useState<string>('previous_period');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<number>(0);

  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [livePlans, setLivePlans] = useState<LivePlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Plan upgrade modal state
  const [upgradeModalOpen, setUpgradeModalOpen] = useState<boolean>(false);
  const [targetUser, setTargetUser] = useState<PaidUser | null>(null);
  const [selectedNewPlan, setSelectedNewPlan] = useState<string>('');
  const [upgrading, setUpgrading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Paid users tab state
  const [users, setUsers] = useState<PaidUser[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [usersSearch, setUsersSearch] = useState<string>('');
  const [usersPlanFilter, setUsersPlanFilter] = useState<string>('all');
  const [usersStatusFilter, setUsersStatusFilter] = useState<string>('all');
  const [usersPage, setUsersPage] = useState<number>(1);
  const [usersTotalPages, setUsersTotalPages] = useState<number>(1);

  // Transactions tab state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState<boolean>(false);
  const [txSearch, setTxSearch] = useState<string>('');
  const [txStatusFilter, setTxStatusFilter] = useState<string>('all');
  const [txProviderFilter, setTxProviderFilter] = useState<string>('all');
  const [txPage, setTxPage] = useState<number>(1);
  const [txTotalPages, setTxTotalPages] = useState<number>(1);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Live Subscription Plans from the Plan Section API
  const fetchLivePlans = useCallback(async () => {
    try {
      let res = await fetch(`${apiBase}/v1/admin/plans`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        res = await fetch(`${apiBase}/admin/plans`, {
          headers: getAuthHeaders(),
          credentials: 'include',
        });
      }
      if (res.ok) {
        const data = await res.json();
        setLivePlans(data.plans || []);
      }
    } catch (err) {
      console.warn('Could not fetch live plans catalog:', err);
    }
  }, [apiBase, getAuthHeaders]);

  // Fetch Overview Analytics
  const fetchOverview = useCallback(
    async (isSilent = false) => {
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
          throw new Error(`Failed to load analytics: HTTP ${res.status}`);
        }

        const data: OverviewPayload = await res.json();
        setOverview(data);
        setLastRefreshed(new Date());
      } catch (err: any) {
        setError(err.message || 'Error fetching analytics overview');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, comparison, customStart, customEnd, apiBase, getAuthHeaders]
  );

  // Fetch Paid Users Directory
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
      }
    } catch (err) {
      console.error('Failed to fetch paid users list:', err);
    } finally {
      setUsersLoading(false);
    }
  }, [usersPage, usersSearch, usersPlanFilter, usersStatusFilter, apiBase, getAuthHeaders]);

  // Fetch Transactions Ledger
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
      }
    } catch (err) {
      console.error('Failed to fetch transactions list:', err);
    } finally {
      setTxLoading(false);
    }
  }, [txPage, txSearch, txStatusFilter, txProviderFilter, apiBase, getAuthHeaders]);

  // Execute Plan Upgrade / Downgrade for a Tenant
  const handleExecutePlanUpgrade = async () => {
    if (!targetUser || !selectedNewPlan) return;
    setUpgrading(true);
    try {
      const idempotencyKey = `plan:rev:${targetUser.tenantId}:${selectedNewPlan}:${Date.now()}`;
      const res = await fetch(`${apiBase}/v1/admin/tenants/${targetUser.tenantId}/plan`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Idempotency-Key': idempotencyKey,
        },
        credentials: 'include',
        body: JSON.stringify({ plan: selectedNewPlan }),
      });

      if (!res.ok) throw new Error('Plan change failed');

      showToast(`Successfully upgraded ${targetUser.tenantName} to ${selectedNewPlan.toUpperCase()}`);
      setUpgradeModalOpen(false);
      setTargetUser(null);

      // Re-fetch both users and overview to immediately update revenue & MRR in real time
      fetchUsers();
      fetchOverview(true);
    } catch (err: any) {
      showToast(`Upgrade error: ${err.message || 'Operation failed'}`);
    } finally {
      setUpgrading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchLivePlans();
  }, [fetchOverview, fetchLivePlans]);

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
    link.setAttribute('download', `xarwiz_bi_report_${period}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-16 min-h-screen text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 border border-emerald-500/60 shadow-2xl text-emerald-400 text-sm font-medium animate-bounce">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── Header & Live Synchronization Controls ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 shadow-lg shadow-indigo-600/10">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Revenue & Business Intelligence
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-emerald-400 text-[11px] font-semibold tracking-wide">
                  <ShieldCheck className="w-3.5 h-3.5" /> Plan Sync Active
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Real-time financial performance, paying customer directory, live plan sync & reconciliation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
            <span className="flex items-center gap-1 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-indigo-400" /> Last updated: {lastRefreshed.toLocaleTimeString()}
            </span>
            <span>•</span>
            <Link
              href="/admin/tenants?tab=plans"
              className="text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1 transition"
            >
              <span>Manage Pricing in Plan Section</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              fetchOverview(true);
              fetchLivePlans();
            }}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-gray-200 hover:text-white text-xs font-semibold transition disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Sync Now'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={loading || !overview}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-300 hover:text-white text-xs font-semibold transition disabled:opacity-50 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ─── Date Filter Pills & Comparison Selector ─── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
        {/* Preset Date Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-400 flex items-center gap-1.5 mr-2 font-medium">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Range:
          </span>
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                period === p.value
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold'
                  : 'bg-slate-950/60 text-gray-400 hover:text-gray-200 hover:bg-slate-800/60 border border-slate-800/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Comparison Dropdown */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
            <Activity className="w-3.5 h-3.5 text-indigo-400" /> Compare:
          </span>
          <select
            value={comparison}
            onChange={(e) => setComparison(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-gray-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="previous_period">Previous Period</option>
            <option value="previous_month">Previous Month</option>
            <option value="previous_year">Previous Year</option>
            <option value="none">No Comparison</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-900/50 flex items-center justify-between text-red-300 text-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchOverview()}
            className="px-3.5 py-1.5 bg-red-900/50 hover:bg-red-800/60 rounded-xl text-xs font-bold text-white transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-900/50 border border-slate-800" />
          ))}
        </div>
      )}

      {/* ─── Executive KPI Cards Snapshot ─── */}
      {overview && (
        <div className="space-y-6">
          {/* Row 1: Primary Financial Metrics */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-indigo-400" /> Financial Performance Snapshot
              </h2>
              <span className="text-[10px] text-gray-500 font-mono">
                {overview.dateRange.bucket === 'hour' ? 'Hourly Granularity' : 'Daily Granularity'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Period Revenue */}
              <div
                onClick={() => setSelectedTab(0)}
                className="group relative bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 transition-all cursor-pointer shadow-lg overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-600" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">Collected Revenue</span>
                  <div className="p-2 rounded-xl bg-indigo-600/10 text-indigo-400 group-hover:scale-110 transition">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-white tracking-tight">
                    {formatINR(overview.kpis.periodRevenue)}
                  </span>
                  {comparison !== 'none' && (
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5 ${
                        overview.kpis.deltas.grossRevenue.percent >= 0
                          ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-400'
                          : 'bg-rose-950/60 border border-rose-800 text-rose-400'
                      }`}
                    >
                      {overview.kpis.deltas.grossRevenue.percent >= 0 ? '+' : ''}
                      {overview.kpis.deltas.grossRevenue.percent}%
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Gross: {formatCompactINR(overview.kpis.grossRevenue)}</span>
                  <span>Refunds: {formatCompactINR(overview.kpis.refunds)}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 font-mono">Net: {formatINR(overview.kpis.netRevenue)}</span>
                  <Sparkline
                    data={overview.revenueTimeSeries.map((d) => d.revenue)}
                    color="#818cf8"
                  />
                </div>
              </div>

              {/* Card 2: Today vs Yesterday */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">Today's Revenue</span>
                  <div className="p-2 rounded-xl bg-emerald-600/10 text-emerald-400">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-white tracking-tight">
                    {formatINR(overview.kpis.revenueToday)}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
                    Live
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-gray-400">
                  Yesterday: <span className="text-gray-200 font-medium">{formatINR(overview.kpis.revenueYesterday)}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-gray-500">
                  Real-time 00:00 to now collection
                </div>
              </div>

              {/* Card 3: MRR / ARR */}
              <div
                onClick={() => setSelectedTab(2)}
                className="group relative bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-5 transition-all cursor-pointer shadow-lg overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">Monthly Recurring (MRR)</span>
                  <div className="p-2 rounded-xl bg-blue-600/10 text-blue-400 group-hover:scale-110 transition">
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-white tracking-tight">
                    {formatINR(overview.kpis.mrr)}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-blue-950/40 border border-blue-800/40 text-blue-400">
                    ARR: {formatCompactINR(overview.kpis.arr)}
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
                  <span>{overview.kpis.activePaidSubscriptions} active paid subscriptions</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-indigo-400 flex items-center justify-between">
                  <span>Click to inspect plan metrics</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Card 4: Lifetime Revenue */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">Lifetime Collections</span>
                  <div className="p-2 rounded-xl bg-amber-600/10 text-amber-400">
                    <Crown className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-white tracking-tight">
                    {formatINR(overview.kpis.lifetimeRevenue)}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-amber-950/40 border border-amber-800/40 text-amber-400">
                    {overview.kpis.lifetimePayingCustomers} Paid Users
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-gray-400">
                  Verified payments across all gateways
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] text-gray-500">
                  All-time cumulative financial volume
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Customer & Subscription Health */}
          <div>
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-indigo-400" /> Customers & Subscription Dynamics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 5: Paying Customers */}
              <div
                onClick={() => setSelectedTab(1)}
                className="group relative bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 transition-all cursor-pointer shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">Unique Paying Customers</span>
                  <Users className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-white">
                    {overview.kpis.payingCustomersPeriod}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
                    ARPPU: {formatCompactINR(overview.kpis.arppu)}
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
                  <span>View customer directory</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
                </div>
              </div>

              {/* Card 6: Active Paid Subscriptions */}
              <div
                onClick={() => setSelectedTab(2)}
                className="group relative bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 transition-all cursor-pointer shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">Active Paid Subscriptions</span>
                  <CreditCard className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition" />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-white">
                    {overview.kpis.activePaidSubscriptions}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-indigo-950/40 border border-indigo-800/40 text-indigo-400">
                    Churn: {overview.kpis.churnRate}%
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-gray-400">
                  {overview.kpis.cancelledSubscriptionsPeriod} cancellations in period
                </div>
              </div>

              {/* Card 7: Free & Trial Audience */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">Free & Trial Audience</span>
                  <Users className="w-4 h-4 text-violet-400" />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-white">
                    {overview.kpis.freeUsers} Free
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-violet-950/40 border border-violet-800/40 text-violet-400">
                    {overview.kpis.trialUsers} Trial
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-gray-400">
                  Conv. rate: <span className="text-emerald-400 font-bold">{overview.kpis.trialConversionRate}%</span>
                </div>
              </div>

              {/* Card 8: Payment Success & ATV */}
              <div
                onClick={() => setSelectedTab(3)}
                className="group relative bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 transition-all cursor-pointer shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-medium">Payment Health & ATV</span>
                  <CheckCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-black text-white">
                    {overview.kpis.paidInvoicesCount} Paid
                  </span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                      overview.kpis.failedCount > 0
                        ? 'bg-rose-950/40 border border-rose-800/40 text-rose-400'
                        : 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-400'
                    }`}
                  >
                    {overview.kpis.failedCount} Failed
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-gray-400 flex items-center justify-between">
                  <span>ATV: {formatINR(overview.kpis.averageTransactionValue)}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
                </div>
              </div>
            </div>
          </div>

          {/* ─── Detailed Tabs ─── */}
          <div className="pt-4">
            <div className="flex items-center gap-2 border-b border-slate-800 mb-6 overflow-x-auto">
              {[
                { label: 'Overview & Visual Graphs', tab: 0, icon: TrendingUp },
                {
                  label: `Paid Customers (${overview.kpis.payingCustomersPeriod})`,
                  tab: 1,
                  icon: Users,
                },
                {
                  label: `Plan Performance & Sync (${overview.plansBreakdown.length})`,
                  tab: 2,
                  icon: Layers,
                },
                {
                  label: `Transactions & Ledger (${overview.kpis.paidInvoicesCount})`,
                  tab: 3,
                  icon: FileText,
                },
              ].map((t) => {
                const Icon = t.icon;
                const isActive = selectedTab === t.tab;
                return (
                  <button
                    key={t.tab}
                    onClick={() => setSelectedTab(t.tab)}
                    className={`flex items-center gap-2 py-3 px-4 font-semibold text-xs rounded-t-xl transition border-b-2 whitespace-nowrap ${
                      isActive
                        ? 'border-indigo-500 text-white bg-slate-900/60 shadow-sm'
                        : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-slate-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-gray-500'}`} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* ─── TAB 0: VISUAL ANALYTICS & GRAPHS ─── */}
            {selectedTab === 0 && (
              <div className="space-y-8">
                {/* Graph A: Revenue Over Time Spline Area Chart */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-white tracking-tight">
                          Revenue Over Time (Interactive Spline)
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-800/60 text-indigo-400 text-[10px] font-semibold">
                          Live Curve
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {overview.dateRange.bucket === 'hour'
                          ? 'Hourly revenue trajectory in ₹ INR with mouse hover tracking'
                          : 'Daily revenue trend in ₹ INR with comparison curve and order counts'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-gray-300">
                        <span className="w-3 h-0.5 bg-indigo-400 rounded-full" />
                        <span>Current Period</span>
                      </div>
                      {comparison !== 'none' && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <span className="w-3 h-0.5 border-b border-dashed border-gray-400" />
                          <span>Comparison</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <InteractiveSplineChart
                    data={overview.revenueTimeSeries}
                    showComparison={comparison !== 'none'}
                  />
                </div>

                {/* Grid: Charts B & C */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Graph B: Gross vs Refunds vs Net */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-sm font-bold text-white">Gross vs Refunds vs Net</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Reconciliation of collections & refunds</p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="flex items-center gap-1 text-indigo-400">
                          <span className="w-2 h-2 rounded bg-indigo-500 inline-block" /> Gross
                        </span>
                        <span className="flex items-center gap-1 text-rose-400">
                          <span className="w-2 h-2 rounded bg-rose-500 inline-block" /> Refunds
                        </span>
                        <span className="flex items-center gap-1 text-emerald-400">
                          <span className="w-2 h-2 rounded bg-emerald-500 inline-block" /> Net
                        </span>
                      </div>
                    </div>
                    <InteractiveBarChart data={overview.grossVsNet} />
                  </div>

                  {/* Graph C: Revenue Contribution by Subscription Plan */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-bold text-white">Revenue by Subscription Plan</h3>
                        <Link
                          href="/admin/tenants?tab=plans"
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          <span>Plan Settings</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                      <p className="text-xs text-gray-400 mb-5">
                        Synchronized live with the Plan Section
                      </p>

                      <div className="space-y-4">
                        {overview.plansBreakdown.map((p) => {
                          const tierColor =
                            p.id === 'enterprise'
                              ? 'bg-amber-500'
                              : p.id === 'professional'
                              ? 'bg-indigo-500'
                              : p.id === 'starter'
                              ? 'bg-blue-500'
                              : 'bg-emerald-500';

                          return (
                            <div key={p.id} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-gray-200 flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${tierColor}`} />
                                  <span>{p.name}</span>
                                  <span className="text-[10px] text-gray-500 font-mono">
                                    ({p.activeSubscribers} sub{p.activeSubscribers !== 1 ? 's' : ''})
                                  </span>
                                </span>
                                <span className="font-mono text-gray-300 font-bold">
                                  {formatINR(p.revenue)} <span className="text-gray-500 text-[10px]">({p.share}%)</span>
                                </span>
                              </div>
                              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                <div
                                  className={`h-full ${tierColor} transition-all duration-500`}
                                  style={{ width: `${Math.max(2, p.share)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-gray-400">
                      <span>Total Active MRR from Plans:</span>
                      <span className="font-black text-white">{formatINR(overview.kpis.mrr)}</span>
                    </div>
                  </div>
                </div>

                {/* Grid: 3 Interactive Ring / Donut Charts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Donut 1: Subscriptions Distribution */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <h3 className="text-sm font-bold text-white mb-1">
                      Subscription Distribution
                    </h3>
                    <p className="text-xs text-gray-400 mb-2">Live subscriber breakdown</p>
                    <InteractiveDonutChart
                      data={overview.subscriptionDistribution}
                      centerLabel="Subs"
                    />
                  </div>

                  {/* Donut 2: Paying vs Free Audience */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <h3 className="text-sm font-bold text-white mb-1">
                      Paying vs Free Audience
                    </h3>
                    <p className="text-xs text-gray-400 mb-2">Conversion ratio across platform</p>
                    <InteractiveDonutChart
                      data={overview.userDistribution}
                      centerLabel="Users"
                    />
                  </div>

                  {/* Donut 3: Payment Health Distribution */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-xl">
                    <h3 className="text-sm font-bold text-white mb-1">
                      Payment Outcome Health
                    </h3>
                    <p className="text-xs text-gray-400 mb-2">Transaction settlement status</p>
                    <InteractiveDonutChart
                      data={overview.paymentStatusDistribution}
                      centerLabel="Transactions"
                    />
                  </div>
                </div>

                {/* Conversion Funnel & Retention Snapshot */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Conversion Funnel */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-sm font-bold text-white mb-1">Customer Conversion Funnel</h3>
                    <p className="text-xs text-gray-400 mb-4">
                      Stage progression from registration to active renewal
                    </p>
                    <div className="space-y-3">
                      {overview.conversionFunnel.map((step, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-300 font-medium">{step.stage}</span>
                            <span className="font-mono text-gray-300">
                              {step.count.toLocaleString()} users{' '}
                              <span className="text-emerald-400 font-bold ml-1">({step.conversionRate}%)</span>
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                              style={{ width: `${Math.max(4, step.conversionRate)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Geographic & Regional Breakdown */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-sm font-bold text-white mb-1">Geographic Distribution</h3>
                    <p className="text-xs text-gray-400 mb-4">
                      Revenue and customers by registered country
                    </p>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {overview.geographicBreakdown.map((geo, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-800 text-xs">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-indigo-400" />
                            <span className="font-semibold text-gray-200">{geo.countryName}</span>
                            <span className="text-[10px] text-gray-500 uppercase">({geo.countryCode})</span>
                          </div>
                          <div className="text-right">
                            <div className="font-black text-white">{formatINR(geo.revenue)}</div>
                            <div className="text-[10px] text-gray-400">
                              {geo.payingCustomers} customer{geo.payingCustomers !== 1 ? 's' : ''} ({geo.conversionRate}%)
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 1: PAID CUSTOMERS DIRECTORY WITH PLAN UPGRADE ─── */}
            {selectedTab === 1 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search customer by name, email, workspace..."
                      value={usersSearch}
                      onChange={(e) => {
                        setUsersSearch(e.target.value);
                        setUsersPage(1);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Live Plans Filter Dropdown */}
                    <select
                      value={usersPlanFilter}
                      onChange={(e) => {
                        setUsersPlanFilter(e.target.value);
                        setUsersPage(1);
                      }}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="all">All Plans</option>
                      {livePlans.map((lp) => (
                        <option key={lp.id} value={lp.id}>
                          {lp.name} ({lp.price > 0 ? formatINR(lp.price) : 'Free'})
                        </option>
                      ))}
                    </select>

                    <select
                      value={usersStatusFilter}
                      onChange={(e) => {
                        setUsersStatusFilter(e.target.value);
                        setUsersPage(1);
                      }}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="past_due">Past Due</option>
                      <option value="trial">Trial</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  {usersLoading ? (
                    <div className="p-12 text-center text-gray-500 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
                      Loading customer directory...
                    </div>
                  ) : users.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 text-xs">
                      No customer records match your filter criteria.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-gray-400">
                          <tr>
                            <th className="py-3.5 px-4 font-semibold">Customer</th>
                            <th className="py-3.5 px-4 font-semibold">Organization / Workspace</th>
                            <th className="py-3.5 px-4 font-semibold">Current Plan</th>
                            <th className="py-3.5 px-4 font-semibold">Status</th>
                            <th className="py-3.5 px-4 font-semibold">Total Paid</th>
                            <th className="py-3.5 px-4 font-semibold">Invoices</th>
                            <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {users.map((u) => (
                            <tr key={u.userId} className="hover:bg-slate-800/30 transition">
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-white">{u.userName}</div>
                                <div className="text-[11px] text-gray-400">{u.email}</div>
                              </td>
                              <td className="py-3.5 px-4 font-medium text-gray-300">
                                <div>{u.tenantName}</div>
                                <div className="text-[10px] text-gray-500 font-mono">{u.tenantId.slice(0, 8)}...</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-950/50 border border-indigo-800/50 text-indigo-300">
                                  <Crown className="w-3 h-3 text-amber-400" />
                                  {u.currentPlan}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                                    u.subscriptionStatus === 'active'
                                      ? 'bg-emerald-950/50 border border-emerald-800/40 text-emerald-400'
                                      : 'bg-slate-800 text-gray-400'
                                  }`}
                                >
                                  {u.subscriptionStatus}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-black text-white font-mono">
                                {formatINR(u.totalPaid)}
                              </td>
                              <td className="py-3.5 px-4 text-gray-300 font-mono">
                                {u.paidInvoicesCount}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => {
                                    setTargetUser(u);
                                    setSelectedNewPlan(u.currentPlan.toLowerCase());
                                    setUpgradeModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-white text-[11px] font-semibold transition"
                                >
                                  Change / Upgrade Plan
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination */}
                  <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-gray-400">
                    <span>Page {usersPage} of {usersTotalPages}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                        disabled={usersPage <= 1}
                        className="p-1.5 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))}
                        disabled={usersPage >= usersTotalPages}
                        className="p-1.5 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB 2: LIVE PLAN PERFORMANCE & SYNCHRONIZATION ─── */}
            {selectedTab === 2 && (
              <div className="space-y-6">
                {/* Synchronization Banner */}
                <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900/60 to-purple-950/60 p-5 rounded-2xl border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Synchronized with Admin Plan Management
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Whenever you create, edit, or adjust pricing/limits in the Plan Section, this dashboard automatically fetches the updated metrics.
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/admin/tenants?tab=plans"
                    className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <span>Open Plan Section</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Plan Performance Matrix Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {overview.plansBreakdown.map((plan) => {
                    const isEnterprise = plan.id === 'enterprise';
                    const isProfessional = plan.id === 'professional';

                    return (
                      <div
                        key={plan.id}
                        className="bg-slate-900/50 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 shadow-xl transition flex flex-col justify-between relative overflow-hidden"
                      >
                        <div
                          className={`absolute top-0 left-0 right-0 h-1 ${
                            isEnterprise
                              ? 'bg-amber-500'
                              : isProfessional
                              ? 'bg-indigo-500'
                              : 'bg-emerald-500'
                          }`}
                        />

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-white flex items-center gap-1.5">
                              {isEnterprise ? (
                                <Crown className="w-4 h-4 text-amber-400" />
                              ) : isProfessional ? (
                                <Zap className="w-4 h-4 text-indigo-400" />
                              ) : (
                                <Package className="w-4 h-4 text-emerald-400" />
                              )}
                              {plan.name}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-800 border border-slate-700 text-gray-300">
                              {plan.billing}
                            </span>
                          </div>

                          <div className="text-2xl font-black text-white mt-1">
                            {plan.price > 0 ? `${formatINR(plan.price)}` : 'Free'}
                            <span className="text-[10px] text-gray-500 font-normal ml-1">/mo</span>
                          </div>

                          {/* Token & Agent Limits */}
                          <div className="mt-3 py-2 px-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-gray-400 space-y-1">
                            <div className="flex justify-between">
                              <span>Token Quota:</span>
                              <span className="font-mono text-gray-200">
                                {plan.tokenLimit === -1 ? 'Unlimited' : `${(Number(plan.tokenLimit) || 0).toLocaleString()} tokens`}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Active Subscribers:</span>
                              <span className="font-bold text-emerald-400 font-mono">
                                {plan.activeSubscribers}
                              </span>
                            </div>
                          </div>

                          {/* Financials for this plan */}
                          <div className="mt-4 space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">MRR Contribution:</span>
                              <span className="font-bold text-white">{formatINR(plan.mrr)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Period Revenue:</span>
                              <span className="font-bold text-white">{formatINR(plan.revenue)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Revenue Share:</span>
                              <span className="font-bold text-indigo-400">{plan.share}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Link to Plan Section */}
                        <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                          <Link
                            href={`/admin/tenants?tab=plans&edit=${plan.id}`}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition"
                          >
                            <span>Configure Plan in Plans Section</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── TAB 3: TRANSACTIONS & RECONCILIATION LEDGER ─── */}
            {selectedTab === 3 && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search invoice number, organization..."
                      value={txSearch}
                      onChange={(e) => {
                        setTxSearch(e.target.value);
                        setTxPage(1);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={txStatusFilter}
                      onChange={(e) => {
                        setTxStatusFilter(e.target.value);
                        setTxPage(1);
                      }}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="all">All Statuses</option>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                      <option value="pending">Pending</option>
                      <option value="refunded">Refunded</option>
                    </select>

                    <select
                      value={txProviderFilter}
                      onChange={(e) => {
                        setTxProviderFilter(e.target.value);
                        setTxPage(1);
                      }}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="all">All Providers</option>
                      <option value="razorpay">Razorpay</option>
                      <option value="stripe">Stripe</option>
                      <option value="phonepe">PhonePe</option>
                      <option value="cashfree">Cashfree</option>
                      <option value="neuracollect">NeuraCollect</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  {txLoading ? (
                    <div className="p-12 text-center text-gray-500 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
                      Loading ledger records...
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 text-xs">
                      No transaction records match the specified filters.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase tracking-wider text-gray-400">
                          <tr>
                            <th className="py-3.5 px-4 font-semibold">Invoice #</th>
                            <th className="py-3.5 px-4 font-semibold">Workspace / Organization</th>
                            <th className="py-3.5 px-4 font-semibold">Plan</th>
                            <th className="py-3.5 px-4 font-semibold">Amount</th>
                            <th className="py-3.5 px-4 font-semibold">Gateway</th>
                            <th className="py-3.5 px-4 font-semibold">Status</th>
                            <th className="py-3.5 px-4 font-semibold text-right">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                              <td className="py-3.5 px-4 font-mono font-bold text-gray-200">
                                {tx.invoiceNumber}
                              </td>
                              <td className="py-3.5 px-4 font-medium text-gray-300">
                                {tx.tenantName}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-gray-300">
                                  {tx.planName}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-black text-white font-mono">
                                {formatINR(tx.amount)}
                              </td>
                              <td className="py-3.5 px-4 capitalize text-gray-400 font-medium">
                                {tx.provider}
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    tx.status === 'paid'
                                      ? 'bg-emerald-950/60 border border-emerald-800/50 text-emerald-400'
                                      : tx.status === 'failed'
                                      ? 'bg-rose-950/60 border border-rose-800/50 text-rose-400'
                                      : 'bg-amber-950/60 border border-amber-800/50 text-amber-400'
                                  }`}
                                >
                                  {tx.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right text-gray-400 font-mono text-[11px]">
                                {tx.paidAt ? new Date(tx.paidAt).toLocaleDateString() : new Date(tx.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination */}
                  <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-gray-400">
                    <span>Page {txPage} of {txTotalPages}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                        disabled={txPage <= 1}
                        className="p-1.5 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))}
                        disabled={txPage >= txTotalPages}
                        className="p-1.5 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Plan Upgrade / Downgrade Modal ─── */}
      {upgradeModalOpen && targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  Upgrade / Change Customer Plan
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Directly synchronize subscription & database permissions
                </p>
              </div>
              <button
                onClick={() => setUpgradeModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target workspace info */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-400">Customer:</span>
                <span className="font-bold text-white">{targetUser.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Workspace / Tenant:</span>
                <span className="font-semibold text-indigo-300">{targetUser.tenantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Current Plan:</span>
                <span className="font-bold uppercase text-amber-400">{targetUser.currentPlan}</span>
              </div>
            </div>

            {/* Select New Plan from Synchronized Plans */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                Select Destination Subscription Plan:
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {livePlans.map((lp) => {
                  const isSelected = selectedNewPlan.toLowerCase() === lp.id.toLowerCase();
                  return (
                    <div
                      key={lp.id}
                      onClick={() => setSelectedNewPlan(lp.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-gray-400 hover:text-gray-200 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-white flex items-center gap-1.5">
                          <span>{lp.name}</span>
                          {lp.is_recommended && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 font-bold">
                              ★ RECOMMENDED
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {lp.token_limit === -1 ? 'Unlimited Tokens' : `${((lp.token_limit || 0) / 1000).toFixed(0)}k Tokens`} • {lp.billing}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-white text-xs">
                          {lp.price > 0 ? formatINR(lp.price) : 'Free'}
                        </div>
                        <div className="text-[10px] text-gray-500">/mo</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setUpgradeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecutePlanUpgrade}
                disabled={upgrading || selectedNewPlan.toLowerCase() === targetUser.currentPlan.toLowerCase()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {upgrading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Plan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Plan Change</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
