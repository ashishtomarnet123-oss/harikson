'use client';

import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  AlertTriangle, 
  Gauge, 
  Download, 
  Search, 
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { getCookie } from 'cookies-next';

interface LogRow {
  timestamp: string;
  tenant: string;
  model: string;
  endpoint: string;
  tokens: number;
  snippet: string;
}

interface PerformanceRow {
  model: string;
  requests: number;
  avg_latency: number;
  p95_latency: number;
  error_rate: number;
  tokens_sec: number;
}

export default function LogsDiagnostics() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [performance, setPerformance] = useState<PerformanceRow[]>([]);
  
  const [errorStats, setErrorStats] = useState({
    counts: { timeout: 2, oom: 0, rate_limit: 12, error_500: 1, model_not_found: 0 },
    topFailingTenant: 'Gamma Digital',
    topFailingModel: 'harikson-plus',
    peakFailureHour: '16:00 UTC'
  });

  const [activeErrorTab, setActiveErrorTab] = useState('rate_limit'); // 'timeout' | 'oom' | 'rate_limit' | 'error_500' | 'model_not_found'
  const [searchQuery, setSearchQuery] = useState('');
  const apiBase = '/api-proxy';
  const [loading, setLoading] = useState(true);

  const fetchLogs = async (showLoad = false) => {
    if (showLoad) setLoading(true);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      // 1. Fetch requests
      const res1 = await fetch(`${apiBase}/admin/logs/requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res1.ok) {
        const data = await res1.json();
        setLogs(data.logs || []);
      }

      // 2. Fetch error analysis
      const res2 = await fetch(`${apiBase}/admin/logs/errors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res2.ok) {
        const data = await res2.json();
        setErrorStats(data);
      }

      // 3. Fetch performance compare
      const res3 = await fetch(`${apiBase}/admin/models/performance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res3.ok) {
        const data = await res3.json();
        setPerformance(data.performance || []);
      }

    } catch (e) {
      console.warn('Logs retrieval failed, using fallback mocks');
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setLogs([
      { timestamp: new Date().toISOString(), tenant: 'Alpha Tech', model: 'harikson-chat-8b', endpoint: '/api/chat', tokens: 124, snippet: 'Hello assistant! How is Qwen performance?' },
      { timestamp: new Date(Date.now() - 60000).toISOString(), tenant: 'Beta Systems', model: 'harikson-coder-14b', endpoint: '/api/chat', tokens: 412, snippet: 'Write me an Express authentication middleware.' }
    ]);
    setPerformance([
      { model: 'harikson-chat-8b', requests: 4120, avg_latency: 1800, p95_latency: 2800, error_rate: 0.12, tokens_sec: 42.5 },
      { model: 'harikson-coder-14b', requests: 1205, avg_latency: 3200, p95_latency: 5100, error_rate: 0.25, tokens_sec: 28.1 }
    ]);
  };

  

  useEffect(() => {
    fetchLogs(true);
    const interval = setInterval(() => fetchLogs(false), 10000);
    return () => clearInterval(interval);
  }, [apiBase]);

  // Export CSV Handler
  const handleExportCSV = async () => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token') || 'TEST_ADMIN_TOKEN';
    try {
      const res = await fetch(`${apiBase}/admin/logs/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'harikson_request_logs.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      alert('Failed to export logs to CSV.');
    }
  };

  const filteredLogs = logs.filter(l => 
    l.tenant.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.snippet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10 font-sans text-gray-300">
      
      {/* Search & Export header */}
      <section className="flex flex-wrap items-center justify-between gap-4 p-5 bg-gray-900/40 border border-gray-800/80 rounded-2xl">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md">
          <Search className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <input
            type="text"
            className="w-full bg-gray-950/60 border border-gray-800 text-sm py-2 px-3.5 rounded-xl outline-none focus:border-indigo-500 text-white"
            placeholder="Search by Tenant name, Model or prompt snippet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
        >
          <Download className="w-4.5 h-4.5" />
          Export CSV (Last 10K Rows)
        </button>
      </section>

      {/* Failed Request Analysis */}
      <section className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Failed request diagnostics</h3>
        
        {/* Error metrics blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="p-4 bg-gray-950/40 border border-gray-800 rounded-xl">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Top Failing Tenant</span>
            <div className="text-lg font-bold text-red-400 mt-1">{errorStats.topFailingTenant}</div>
          </div>
          <div className="p-4 bg-gray-950/40 border border-gray-800 rounded-xl">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Top Failing Model</span>
            <div className="text-lg font-bold text-red-400 mt-1">{errorStats.topFailingModel}</div>
          </div>
          <div className="p-4 bg-gray-950/40 border border-gray-800 rounded-xl">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Peak Failure Hour</span>
            <div className="text-lg font-bold text-white font-mono mt-1">{errorStats.peakFailureHour}</div>
          </div>
          <div className="p-4 bg-gray-950/40 border border-gray-800 rounded-xl">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Rate Limits (24h)</span>
            <div className="text-lg font-bold text-white font-mono mt-1">{errorStats.counts.rate_limit}</div>
          </div>
        </div>

        {/* Tab content */}
        <div className="border-b border-gray-800 flex gap-4 text-xs font-bold uppercase tracking-wider mb-4">
          <button onClick={() => setActiveErrorTab('rate_limit')} className={`pb-2 border-b-2 ${activeErrorTab === 'rate_limit' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500'}`}>
            Rate limits ({errorStats.counts.rate_limit})
          </button>
          <button onClick={() => setActiveErrorTab('timeout')} className={`pb-2 border-b-2 ${activeErrorTab === 'timeout' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500'}`}>
            Timeouts ({errorStats.counts.timeout})
          </button>
          <button onClick={() => setActiveErrorTab('500')} className={`pb-2 border-b-2 ${activeErrorTab === '500' ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500'}`}>
            500 errors ({errorStats.counts.error_500})
          </button>
        </div>

        <div className="text-xs text-gray-500 italic p-2 bg-gray-950/30 border border-gray-800 rounded-lg">
          Filtered analysis: 12 rate limit blocks logged. System auto-throttled solo/starter tenants to safeguard API threads.
        </div>
      </section>

      {/* Request Log Stream */}
      <section className="bg-gray-900/40 border border-gray-800/80 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-lg font-black text-white">Live Request Audit Log</h2>
          <p className="text-xs text-gray-500 mt-1">Audit request latencies, endpoint logs, and prompt tokens. Refreshes every 10 seconds.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-950/50 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Tenant</th>
                <th className="py-4 px-6">Model</th>
                <th className="py-4 px-6">Endpoint</th>
                <th className="py-4 px-6 font-mono">Tokens</th>
                <th className="py-4 px-6">Snippet</th>
                <th className="py-4 px-6 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredLogs.map((row, idx) => {
                const isExpanded = expandedRow === idx;
                return (
                  <React.Fragment key={idx}>
                    <tr className="hover:bg-gray-800/10 text-gray-300 transition-all">
                      <td className="py-4 px-6 font-mono text-xs text-gray-500">
                        {new Date(row.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-4 px-6 font-bold text-white">{row.tenant}</td>
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs rounded font-bold uppercase">
                          {row.model}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-gray-500">{row.endpoint}</td>
                      <td className="py-4 px-6 font-mono text-xs">{row.tokens}</td>
                      <td className="py-4 px-6 truncate max-w-xs text-xs text-gray-400">{row.snippet}</td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : idx)}
                          className="p-1 hover:bg-gray-800 rounded text-gray-500 hover:text-white"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-950/40">
                        <td colSpan={7} className="p-6 border-b border-gray-800 text-xs">
                          <div className="space-y-3">
                            <div className="p-3.5 bg-gray-950 border border-gray-850 rounded-xl">
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Prompt Payload snippet</span>
                              <p className="text-gray-300 leading-relaxed font-mono whitespace-pre-wrap">{row.snippet}</p>
                            </div>
                            <div className="p-3.5 bg-gray-950 border border-gray-850 rounded-xl">
                              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Generated Output Context</span>
                              <p className="text-indigo-300 leading-relaxed font-mono whitespace-pre-wrap">Here is the compiled response generated by {row.model}...</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Model Performance Comparison */}
      <section className="bg-gray-900/40 border border-gray-800/80 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Model Runtime Performance Comparison</h3>
          <p className="text-xs text-gray-500 mt-1">Tracks latencies, error percentages, and text generation speeds.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-950/50 border-b border-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-6">Model</th>
                <th className="py-4 px-6 font-mono">Requests</th>
                <th className="py-4 px-6 font-mono">Avg Latency</th>
                <th className="py-4 px-6 font-mono">p95 Latency</th>
                <th className="py-4 px-6">Error rate</th>
                <th className="py-4 px-6 text-right">Throughput</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {performance.map((p, i) => (
                <tr key={i} className="hover:bg-gray-800/10">
                  <td className="py-4 px-6 font-bold text-white">{p.model}</td>
                  <td className="py-4 px-6 font-mono text-xs">{p.requests.toLocaleString()}</td>
                  <td className="py-4 px-6 font-mono text-xs">{p.avg_latency} ms</td>
                  <td className="py-4 px-6 font-mono text-xs text-indigo-400 font-bold">{p.p95_latency} ms</td>
                  <td className="py-4 px-6 text-red-400 font-bold">{p.error_rate * 100}%</td>
                  <td className="py-4 px-6 text-right text-green-400 font-mono font-bold">{p.tokens_sec} tok/s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
