'use client';
import React, { useState, useEffect } from 'react';
import { Card, Badge } from '@tremor/react';
import {
  AlertTriangle,
  TrendingUp,
  XCircle,
  CheckCircle,
  RefreshCw,
  CreditCard,
} from 'lucide-react';

interface DunningAccount {
  id: string;
  name: string;
  slug: string;
  status: string;
  sub_status: string;
  amount: number;
  currency: string;
  dunning_stage: number;
  failure_reason: string;
  last_failed_at: string;
}

interface DunningData {
  accountsInRetry: DunningAccount[];
  totalInRetry: number;
  stagesBreakdown: { stage: number; count: number }[];
  failureReasons: { reason: string; count: number }[];
  metrics: {
    recoveredCount: number;
    canceledCount: number;
    pastDueCount: number;
    recoveryRatePercent: number;
  };
}

function stageName(stage: number): string {
  switch (stage) {
    case 1: return 'Initial Retry';
    case 2: return 'Second Attempt';
    case 3: return 'Final Notice';
    default: return `Stage ${stage}`;
  }
}

function stageColor(stage: number): string {
  switch (stage) {
    case 1: return 'yellow';
    case 2: return 'orange';
    case 3: return 'red';
    default: return 'gray';
  }
}

export default function DunningPage() {
  const [data, setData] = useState<DunningData | null>(null);
  const [loading, setLoading] = useState(true);
  const apiBase = '/api-proxy';

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/v1/admin/billing/dunning-dashboard`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const d = await res.json();
      setData(d);
    } catch (e) {
      console.error('Failed to fetch dunning data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Loading dunning dashboard...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Failed to load dunning data
      </div>
    );
  }

  const { metrics, stagesBreakdown, failureReasons, accountsInRetry } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dunning Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Payment recovery and failed subscription management
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card decoration="top" decorationColor="red">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-gray-500">Past Due</p>
          </div>
          <p className="text-3xl font-bold mt-2 text-red-600">{metrics.pastDueCount}</p>
        </Card>
        <Card decoration="top" decorationColor="green">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-sm text-gray-500">Recovered</p>
          </div>
          <p className="text-3xl font-bold mt-2 text-green-600">{metrics.recoveredCount}</p>
        </Card>
        <Card decoration="top" decorationColor="gray">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-gray-400" />
            <p className="text-sm text-gray-500">Canceled</p>
          </div>
          <p className="text-3xl font-bold mt-2 text-gray-500">{metrics.canceledCount}</p>
        </Card>
        <Card decoration="top" decorationColor="blue">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <p className="text-sm text-gray-500">Recovery Rate</p>
          </div>
          <p className="text-3xl font-bold mt-2 text-blue-600">
            {metrics.recoveryRatePercent}%
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stages Breakdown */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Retry Stage Breakdown
          </h3>
          {stagesBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No accounts in retry</p>
          ) : (
            <div className="space-y-3">
              {stagesBreakdown.map((s) => (
                <div key={s.stage} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge color={stageColor(s.stage) as any}>{stageName(s.stage)}</Badge>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {s.count} account{s.count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Failure Reasons */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Failure Reasons
          </h3>
          {failureReasons.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No failure data</p>
          ) : (
            <div className="space-y-3">
              {failureReasons.map((f) => (
                <div key={f.reason} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {f.reason}
                    </span>
                  </div>
                  <Badge color="red">{f.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Accounts in Retry */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Accounts in Retry ({data.totalInRetry})
        </h3>
        {accountsInRetry.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <p className="text-sm">No accounts currently in dunning</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Tenant</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Amount</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Stage</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Reason</th>
                  <th className="text-left py-3 px-3 font-medium text-gray-500">Last Failed</th>
                </tr>
              </thead>
              <tbody>
                {accountsInRetry.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-3">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {a.name}
                        </span>
                        <span className="text-xs text-gray-400 ml-2">{a.slug}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300">
                      {a.currency?.toUpperCase()} {(a.amount / 100).toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <Badge color={stageColor(a.dunning_stage) as any}>
                        {stageName(a.dunning_stage)}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                      {a.failure_reason}
                    </td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                      {a.last_failed_at
                        ? new Date(a.last_failed_at).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
