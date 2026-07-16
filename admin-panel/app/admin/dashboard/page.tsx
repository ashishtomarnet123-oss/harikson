'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  Database,
  Disc,
  Layers,
  Loader2,
  Play,
  Square,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  X,
  Gauge,
} from 'lucide-react';
import { Card, Metric, Text, Grid, Flex, BadgeDelta } from '@tremor/react';
import { getCookie } from 'cookies-next';

interface Metric {
  used: number;
  total: number;
}

interface StatusPayload {
  gpu: Metric;
  ram: Metric;
  cpu: { percent: number };
  disk: Metric;
  uptime: string;
  vllm_status: string;
  active_model: string;
  queue: number;
  tensor_parallel: number;
}

export default function SystemMonitor() {
  const [metrics, setMetrics] = useState<StatusPayload | null>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([
    12, 15, 10, 18, 14, 25, 20, 16, 22, 19, 15, 12,
  ]);
  const apiBase = '/api-proxy';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Model operation states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);

  // Available models (Qwen-only)
  const models = [
    {
      id: '8b',
      name: 'Qwen3-8B',
      size: '8B',
      quant: 'AWQ',
      vram: '6GB',
      desc: 'Primary workhorse',
    },
    {
      id: '14b',
      name: 'Qwen3-14B',
      size: '14B',
      quant: 'AWQ',
      vram: '9GB',
      desc: 'Code-heavy tasks',
    },
    {
      id: '32b',
      name: 'Qwen3-32B',
      size: '32B',
      quant: 'AWQ',
      vram: '20GB',
      desc: 'Complex reasoning',
    },
  ];

  // KPI polling
  const fetchKpis = async () => {
    const token =
      getCookie('admin_token') ||
      localStorage.getItem('admin_token') ||
      'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/v1/admin/kpis`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setKpis(data);
      }
    } catch (err) {
      console.error('Failed to fetch KPIs', err);
    }
  };

  // System status polling (5 seconds interval)
  const fetchStatus = async (showLoad = false) => {
    if (showLoad) setLoading(true);
    const token =
      getCookie('admin_token') ||
      localStorage.getItem('admin_token') ||
      'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/v1/admin/system-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMetrics(data);

      // Update CPU sparkline history (retain last 15 ticks)
      setCpuHistory((prev) => {
        const next = [...prev, data.cpu.percent];
        if (next.length > 15) next.shift();
        return next;
      });
      setError('');
    } catch (err: any) {
      setError(err.message || 'API connection failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus(true);
    fetchKpis();
    const interval = setInterval(() => {
      fetchStatus(false);
      fetchKpis();
    }, 5000);
    return () => clearInterval(interval);
  }, [apiBase]);

  // Model actions (Load, Unload, Unload All)
  const triggerModelAction = async (
    endpoint: string,
    actionName: string,
    confirmMsg?: string
  ) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;

    setActionLoading(actionName);
    const token =
      getCookie('admin_token') ||
      localStorage.getItem('admin_token') ||
      'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/v1/admin/models/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Action failed');
      await new Promise((resolve) => setTimeout(resolve, 1500));
      fetchStatus(false);
    } catch (err: any) {
      alert(err.message || 'Failed to execute model control instruction.');
    } finally {
      setActionLoading(null);
    }
  };

  // vLLM Restart Countdown
  const startRestartCountdown = () => {
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    setCountdown(10);

    countdownTimer.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownTimer.current) clearInterval(countdownTimer.current);
          setCountdown(null);
          // Trigger actual restart
          triggerModelAction('restart', 'vllm-restart');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelRestart = () => {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      setCountdown(null);
    }
  };

  // Switch to 8B shortcut
  const handleSwitchTo8B = async () => {
    if (
      !window.confirm('Switch to Qwen3-8B? This will unload the current model.')
    )
      return;
    setActionLoading('switch-8b');
    const token =
      getCookie('admin_token') ||
      localStorage.getItem('admin_token') ||
      'TEST_ADMIN_TOKEN';
    try {
      // 1. Unload all
      await fetch(`${apiBase}/v1/admin/models/unload-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // 2. Load 8B
      await fetch(`${apiBase}/v1/admin/models/8b/load`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      fetchStatus(false);
    } catch (err) {
      alert('Failed to switch to Qwen3-8B');
    } finally {
      setActionLoading(null);
    }
  };

  // Alert Banner computation
  const getSystemAlerts = () => {
    if (!metrics)
      return { level: 'green', message: 'All systems operational.' };

    const gpuPercent = (metrics.gpu.used / (metrics.gpu.total || 16384)) * 100;
    const ramPercent = (metrics.ram.used / (metrics.ram.total || 16384)) * 100;
    const diskPercent = (metrics.disk.used / (metrics.disk.total || 100)) * 100;

    if (gpuPercent > 90) {
      return {
        level: 'red',
        message: 'GPU utilization exceeds 90%! System is highly loaded.',
      };
    }
    if (metrics.vllm_status !== 'active') {
      return {
        level: 'red',
        message: 'vLLM server instance is currently unresponsive or offline.',
      };
    }
    if (diskPercent > 95) {
      return {
        level: 'red',
        message: 'Disk space critical! Utilization exceeds 95%.',
      };
    }
    if (ramPercent > 85) {
      return {
        level: 'yellow',
        message:
          'System RAM utilization is high (>85%). Monitor resources closely.',
      };
    }
    if (metrics.queue > 10) {
      return {
        level: 'yellow',
        message: 'Inference request queue depth exceeds 10 waiting logs.',
      };
    }

    return {
      level: 'green',
      message: 'All VM control nodes and vLLM runtimes are operating normally.',
    };
  };

  const systemAlert = getSystemAlerts();

  if (loading && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <span className="text-gray-400 font-semibold text-sm">
          Querying system metrics...
        </span>
      </div>
    );
  }

  const vramUsedGB = metrics ? (metrics.gpu.used / 1024).toFixed(1) : '0';
  const vramTotalGB = metrics ? (metrics.gpu.total / 1024).toFixed(0) : '16';
  const ramUsedGB = metrics ? (metrics.ram.used / 1024).toFixed(1) : '0';
  const ramTotalGB = metrics ? (metrics.ram.total / 1024).toFixed(0) : '16';

  const vramPercent = metrics
    ? Math.round((metrics.gpu.used / metrics.gpu.total) * 100)
    : 0;
  const ramPercent = metrics
    ? Math.round((metrics.ram.used / metrics.ram.total) * 100)
    : 0;
  const diskPercent = metrics
    ? Math.round((metrics.disk.used / metrics.disk.total) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Alert Banner */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
          systemAlert.level === 'red'
            ? 'bg-red-950/20 border-red-900/30 text-red-400'
            : systemAlert.level === 'yellow'
              ? 'bg-yellow-950/20 border-yellow-900/30 text-yellow-400'
              : 'bg-green-950/20 border-green-900/30 text-green-400'
        }`}
      >
        <div className="flex items-center gap-3 text-sm font-semibold">
          {systemAlert.level === 'green' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          <span>{systemAlert.message}</span>
        </div>
        <button className="p-1 hover:bg-gray-800/40 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Executive KPIs */}
      {kpis && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">
            Executive KPIs
          </h2>
          <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-6">
            <Card
              className="bg-gray-900/40 border-gray-800/80"
              decoration="top"
              decorationColor="indigo"
            >
              <Text className="text-gray-400">Active Tenants</Text>
              <Flex className="mt-2 items-baseline">
                <Metric className="text-white">{kpis.activeTenants}</Metric>
                <BadgeDelta deltaType="moderateIncrease">Stable</BadgeDelta>
              </Flex>
            </Card>
            <Card
              className="bg-gray-900/40 border-gray-800/80"
              decoration="top"
              decorationColor="emerald"
            >
              <Text className="text-gray-400">Active API Keys</Text>
              <Flex className="mt-2 items-baseline">
                <Metric className="text-white">{kpis.activeKeys}</Metric>
                <BadgeDelta deltaType="moderateIncrease">Stable</BadgeDelta>
              </Flex>
            </Card>
            <Card
              className="bg-gray-900/40 border-gray-800/80"
              decoration="top"
              decorationColor="blue"
            >
              <Text className="text-gray-400">Active Agents</Text>
              <Flex className="mt-2 items-baseline">
                <Metric className="text-white">{kpis.activeAgents}</Metric>
                <BadgeDelta deltaType="moderateIncrease">Stable</BadgeDelta>
              </Flex>
            </Card>
            <Card
              className="bg-gray-900/40 border-gray-800/80"
              decoration="top"
              decorationColor="amber"
            >
              <Text className="text-gray-400">Knowledge Bases</Text>
              <Flex className="mt-2 items-baseline">
                <Metric className="text-white">{kpis.knowledgeBases}</Metric>
                <BadgeDelta deltaType="unchanged">Stable</BadgeDelta>
              </Flex>
            </Card>
            <Card
              className="bg-gray-900/40 border-gray-800/80"
              decoration="top"
              decorationColor="purple"
            >
              <Text className="text-gray-400">Requests Today</Text>
              <Flex className="mt-2 items-baseline">
                <Metric className="text-white">
                  {kpis.requestsToday.toLocaleString()}
                </Metric>
                <BadgeDelta deltaType="moderateIncrease">Active</BadgeDelta>
              </Flex>
            </Card>
            <Card
              className="bg-gray-900/40 border-gray-800/80"
              decoration="top"
              decorationColor="fuchsia"
            >
              <Text className="text-gray-400">Tokens Today</Text>
              <Flex className="mt-2 items-baseline">
                <Metric className="text-white">
                  {kpis.tokensToday > 1000000
                    ? (kpis.tokensToday / 1000000).toFixed(1) + 'M'
                    : kpis.tokensToday.toLocaleString()}
                </Metric>
                <BadgeDelta deltaType="moderateIncrease">Active</BadgeDelta>
              </Flex>
            </Card>
            <Card
              className="bg-gray-900/40 border-gray-800/80"
              decoration="top"
              decorationColor="rose"
            >
              <Text className="text-gray-400">Revenue Today</Text>
              <Flex className="mt-2 items-baseline">
                <Metric className="text-white">
                  ₹{kpis.revenueToday.toLocaleString()}
                </Metric>
                <BadgeDelta deltaType="moderateIncrease">Active</BadgeDelta>
              </Flex>
            </Card>
          </Grid>
        </div>
      )}

      {/* Real-time Status Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* GPU VRAM Card */}
        <div className="bg-gray-900/40 border border-gray-800/80 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              GPU VRAM utilization
            </span>
            <Database className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {vramUsedGB}GB{' '}
              <span className="text-sm font-medium text-gray-500">
                / {vramTotalGB}GB
              </span>
            </div>
            <div className="w-full bg-gray-950 h-2.5 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  vramPercent > 90
                    ? 'bg-red-500'
                    : vramPercent > 70
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${vramPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* RAM Card */}
        <div className="bg-gray-900/40 border border-gray-800/80 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              System RAM utilization
            </span>
            <Layers className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {ramUsedGB}GB{' '}
              <span className="text-sm font-medium text-gray-500">
                / {ramTotalGB}GB
              </span>
            </div>
            <div className="w-full bg-gray-950 h-2.5 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  ramPercent > 90
                    ? 'bg-red-500'
                    : ramPercent > 70
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${ramPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* CPU Load + Sparkline */}
        <div className="bg-gray-900/40 border border-gray-800/80 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              CPU workload
            </span>
            <Cpu className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="text-2xl font-black text-white">
              {metrics?.cpu.percent}%
            </div>
            {/* SVG Sparkline */}
            <div className="h-10 w-28">
              <svg className="w-full h-full" viewBox="0 0 100 40">
                <polyline
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2"
                  points={cpuHistory
                    .map(
                      (val, idx) =>
                        `${(idx / (cpuHistory.length - 1)) * 100},${40 - (val / 100) * 35}`
                    )
                    .join(' ')}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Disk Storage */}
        <div className="bg-gray-900/40 border border-gray-800/80 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Disk storage Used
            </span>
            <Disc className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {metrics?.disk.used}GB{' '}
              <span className="text-sm font-medium text-gray-500">
                / {metrics?.disk.total}GB
              </span>
            </div>
            <div className="w-full bg-gray-950 h-2.5 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${diskPercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* System Info Bar */}
      <section className="bg-gray-900/40 border border-gray-800/80 p-4 rounded-2xl flex flex-wrap gap-x-12 gap-y-4 items-center justify-between">
        <div className="flex items-center gap-2.5 text-sm font-semibold">
          <span className="text-gray-500">System Uptime:</span>
          <span className="text-white font-mono">{metrics?.uptime}</span>
        </div>

        <div className="flex items-center gap-2.5 text-sm font-semibold">
          <span className="text-gray-500">vLLM Status:</span>
          <span
            className={`inline-flex items-center gap-1.5 font-bold ${
              metrics?.vllm_status === 'active'
                ? 'text-green-400'
                : 'text-red-400'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${metrics?.vllm_status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
            />
            {metrics?.vllm_status === 'active' ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-sm font-semibold">
          <span className="text-gray-500">Active Model:</span>
          <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs rounded-md font-bold uppercase">
            {metrics?.active_model === 'None'
              ? 'No Model Loaded'
              : metrics?.active_model}
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-sm font-semibold">
          <span className="text-gray-500">Queue Depth:</span>
          <span className="font-mono text-white">{metrics?.queue} reqs</span>
        </div>

        <div className="flex items-center gap-2.5 text-sm font-semibold">
          <span className="text-gray-500">Tensor Parallel:</span>
          <span className="font-mono text-indigo-400 font-bold">
            {metrics?.tensor_parallel} GPU
          </span>
        </div>
      </section>

      {/* Model Control Panel */}
      <section className="bg-gray-900/40 border border-gray-800/80 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white">
              Qwen Model Control Hub
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Spin up or terminate dedicated vLLM server workers. Only one model
              can be active.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                triggerModelAction(
                  'unload-all',
                  'unload-all',
                  'Emergency unload all models?'
                )
              }
              disabled={actionLoading !== null}
              className="px-4 py-2 bg-red-950/20 border border-red-900/30 hover:bg-red-900/20 text-red-400 text-xs font-bold rounded-xl transition-all"
            >
              Unload All Models
            </button>

            {countdown !== null ? (
              <button
                onClick={cancelRestart}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-950 text-xs font-bold rounded-xl transition-all animate-pulse"
              >
                Cancel Restart ({countdown}s)
              </button>
            ) : (
              <button
                onClick={startRestartCountdown}
                disabled={actionLoading !== null}
                className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-xl transition-all"
              >
                Restart vLLM
              </button>
            )}

            <button
              onClick={handleSwitchTo8B}
              disabled={actionLoading !== null}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/10 transition-all"
            >
              Quick Switch to 8B
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-950/50 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-6">Model catalog</th>
                <th className="py-4 px-6">Weights size</th>
                <th className="py-4 px-6">Quantization</th>
                <th className="py-4 px-6">VRAM footprint</th>
                <th className="py-4 px-6">Ideal use case</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm">
              {models.map((m) => {
                const isCurrent = metrics?.active_model
                  .toLowerCase()
                  .includes(m.id);
                return (
                  <tr
                    key={m.id}
                    className="hover:bg-gray-800/10 text-gray-300 transition-all"
                  >
                    <td className="py-4 px-6 font-bold text-white flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-green-500 animate-pulse' : 'bg-gray-700'}`}
                      />
                      {m.name}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs">{m.size}</td>
                    <td className="py-4 px-6 font-mono text-xs">{m.quant}</td>
                    <td className="py-4 px-6 font-mono text-xs text-indigo-400 font-bold">
                      {m.vram}
                    </td>
                    <td className="py-4 px-6 text-gray-500 text-xs">
                      {m.desc}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {isCurrent ? (
                        <button
                          onClick={() =>
                            triggerModelAction(
                              `${m.id}/unload`,
                              'unload',
                              'Confirm model unload?'
                            )
                          }
                          disabled={actionLoading !== null}
                          className="px-3.5 py-1.5 bg-red-950/20 hover:bg-red-900/20 text-red-400 text-xs font-semibold rounded-lg border border-red-900/30 transition-all"
                        >
                          Unload
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            triggerModelAction(`${m.id}/load`, 'load')
                          }
                          disabled={actionLoading !== null}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition-all"
                        >
                          Load Model
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
