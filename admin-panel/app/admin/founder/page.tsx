'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from 'cookies-next';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Flame,
  Skull,
  RefreshCw,
  XCircle,
  CheckCircle,
} from 'lucide-react';

export default function FounderDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // OH SHIT state
  const [showOhShit, setShowOhShit] = useState(false);
  const [ohShitConfirm, setOhShitConfirm] = useState('');
  const [ohShitReason, setOhShitReason] = useState('');
  const [ohShitCountdown, setOhShitCountdown] = useState(10);
  const [countdownActive, setCountdownActive] = useState(false);
  const [ohShitExecuted, setOhShitExecuted] = useState(false);

  // Runway Simulator state
  const [simMrrGrowth, setSimMrrGrowth] = useState(10);
  const [simHires, setSimHires] = useState(2);
  const [simGpuCut, setSimGpuCut] = useState(0);

  // Enforce Desktop Only
  const [isMobile, setIsMobile] = useState(false);

  const fetchState = async () => {
    const token =
      getCookie('admin_token') || localStorage.getItem('admin_token');

    // We intentionally mask as 404 to hide the route from non-founders
    try {
      const apiBase =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
          ? '/api-proxy'
          : '/api-proxy';

      const res = await fetch(`${apiBase}/admin/founder/sync`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 404 || res.status === 403 || res.status === 401) {
        router.push('/404');
        return;
      }

      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefreshed(new Date());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkViewport = () => setIsMobile(window.innerWidth < 1024);
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdownActive && ohShitCountdown > 0) {
      timer = setTimeout(() => setOhShitCountdown((c) => c - 1), 1000);
    } else if (countdownActive && ohShitCountdown === 0) {
      executeOhShit();
    }
    return () => clearTimeout(timer);
  }, [countdownActive, ohShitCountdown]);

  const executeOhShit = async () => {
    setCountdownActive(false);
    const token =
      getCookie('admin_token') || localStorage.getItem('admin_token');
    const apiBase = '/api-proxy';

    try {
      await fetch(`${apiBase}/admin/founder/oh-shit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirm: 'CONFIRM', reason: ohShitReason }),
      });
      setOhShitExecuted(true);
    } catch (e) {
      alert('FAILED TO EXECUTE GLOBAL KILL SWITCH.');
    }
  };

  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black text-white flex items-center justify-center p-8 text-center z-50">
        <div>
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black mb-2">ACCESS RESTRICTED</h1>
          <p className="text-gray-400">
            The Founder Dashboard is restricted to Desktop view to prevent
            accidental operations.
          </p>
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="fixed inset-0 bg-black text-white flex items-center justify-center z-50">
        INITIALIZING COMMAND CENTER...
      </div>
    );
  if (!data) return null;

  const { vital_signs, threats, opportunities, hypotheses, narrative } = data;

  // Simulator Logic
  const simMrr = vital_signs.mrr * (1 + simMrrGrowth / 100);
  const simBurn =
    vital_signs.burn + simHires * 75000 - vital_signs.burn * (simGpuCut / 100);
  const simNetBurn = simBurn - simMrr;
  const simRunway =
    simNetBurn > 0 ? (vital_signs.cash / simNetBurn).toFixed(1) : 'Infinite';

  return (
    <div className="fixed inset-0 bg-black text-white overflow-y-auto font-mono z-50 p-6 selection:bg-red-900">
      {/* HEADER SECTION */}
      <div className="border border-gray-800 rounded-none p-4 flex justify-between items-center bg-gray-950 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-widest uppercase">
            BHARAT AI — FOUNDER DASHBOARD
          </h1>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
            Last updated: {lastRefreshed.toLocaleTimeString()} | Auto-refresh:
            30s
            <button onClick={fetchState} className="hover:text-white">
              <RefreshCw className="w-3 h-3" />
            </button>
          </p>
        </div>
        <button
          onClick={() => setShowOhShit(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-black uppercase px-6 py-2 tracking-widest animate-pulse border-2 border-red-800"
        >
          [ OH SHIT — KILL SWITCH ]
        </button>
      </div>

      {/* VITAL SIGNS */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* Runway */}
        <div
          className={`border p-4 ${vital_signs.runway_months < 3 ? 'border-red-600 bg-red-950/20' : 'border-gray-800 bg-gray-950'}`}
        >
          <div className="text-xs text-gray-500 font-bold mb-2 flex items-center gap-2">
            <Flame className="w-4 h-4" /> RUNWAY
          </div>
          <div className="text-2xl font-bold">
            {vital_signs.runway_months} months
          </div>
          <div className="text-xs text-gray-400 mt-2">
            ₹{(vital_signs.cash / 100000).toFixed(2)}L cash
          </div>
        </div>
        {/* MRR */}
        <div className="border border-gray-800 bg-gray-950 p-4">
          <div className="text-xs text-gray-500 font-bold mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" /> MRR
          </div>
          <div className="text-2xl font-bold">
            ₹{(vital_signs.mrr / 100000).toFixed(2)}L
          </div>
          <div
            className={`text-xs mt-2 font-bold ${vital_signs.mrr_trend > 0 ? 'text-green-500' : 'text-red-500'}`}
          >
            {vital_signs.mrr_trend > 0 ? '↑' : '↓'}{' '}
            {Math.abs(vital_signs.mrr_trend)}% MoM
          </div>
        </div>
        {/* BURN */}
        <div className="border border-gray-800 bg-gray-950 p-4">
          <div className="text-xs text-gray-500 font-bold mb-2 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-500" /> BURN
          </div>
          <div className="text-2xl font-bold">
            ₹{(vital_signs.burn / 100000).toFixed(2)}L/mo
          </div>
          <div
            className={`text-xs mt-2 font-bold ${vital_signs.burn_trend < 0 ? 'text-green-500' : 'text-red-500'}`}
          >
            {vital_signs.burn_trend < 0 ? '↓' : '↑'}{' '}
            {Math.abs(vital_signs.burn_trend)}% MoM
          </div>
        </div>
        {/* TENANTS & RISK */}
        <div className="border border-gray-800 bg-gray-950 p-4">
          <div className="text-xs text-gray-500 font-bold mb-2 flex items-center gap-2">
            <Users className="w-4 h-4" /> TENANTS
          </div>
          <div className="text-2xl font-bold">{vital_signs.tenants} active</div>
          <div className="flex justify-between items-center text-xs mt-2">
            <span className="text-gray-400">
              {vital_signs.new_tenants} new (7d)
            </span>
            {vital_signs.churn_risk > 0 && (
              <span className="bg-red-900/50 text-red-400 px-2 py-0.5 rounded border border-red-800 animate-pulse">
                {vital_signs.churn_risk} AT RISK
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* THREATS */}
        <div className="border border-gray-800 bg-gray-950 p-5">
          <h2 className="text-sm font-bold text-red-500 mb-4 border-b border-gray-800 pb-2">
            🔴 TODAY'S THREATS
          </h2>
          <div className="space-y-4">
            {threats?.map((t: any) => (
              <div
                key={t.id}
                className={`p-3 border-l-2 ${t.severity === 'critical' ? 'border-red-500 bg-red-950/10' : 'border-yellow-500 bg-yellow-950/10'}`}
              >
                <div className="font-bold text-sm">{t.title}</div>
                <div className="text-xs text-gray-400 mt-1 whitespace-pre-line">
                  {t.description}
                </div>
                <div className="flex gap-2 mt-2">
                  <button className="text-[10px] bg-gray-900 px-2 py-1 hover:bg-gray-800">
                    [Mark Resolved]
                  </button>
                  <button className="text-[10px] bg-gray-900 px-2 py-1 hover:bg-gray-800">
                    [Snooze 24h]
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* OPPORTUNITIES */}
        <div className="border border-gray-800 bg-gray-950 p-5">
          <h2 className="text-sm font-bold text-green-500 mb-4 border-b border-gray-800 pb-2">
            🟢 TODAY'S OPPORTUNITIES
          </h2>
          <div className="space-y-4">
            {opportunities?.map((o: any) => (
              <div
                key={o.id}
                className="p-3 border-l-2 border-green-500 bg-green-950/10"
              >
                <div className="font-bold text-sm">{o.title}</div>
                <div className="text-xs text-gray-400 mt-1 whitespace-pre-line">
                  {o.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* COMPLIANCE & KNOWLEDGE */}
        <div className="border border-gray-800 bg-gray-950 p-5">
          <h2 className="text-sm font-bold text-gray-400 mb-4 border-b border-gray-800 pb-2">
            ⚖️ COMPLIANCE & KNOWLEDGE GAPS
          </h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
              <span>DPDP Compliance Score</span>
              <span className="text-yellow-500 font-bold">87/100 ⚠️</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
              <span>Erasure Requests Pending &gt; 30d</span>
              <span className="text-red-500 font-bold">2 🔴</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
              <span>Missing Consent Flags</span>
              <span className="text-red-500 font-bold">12 🔴</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
              <span>System Components w/o Docs</span>
              <span className="text-red-500 font-bold">
                2 (Bus factor risk!)
              </span>
            </div>
          </div>
        </div>

        {/* NARRATIVE */}
        <div className="border border-gray-800 bg-gray-950 p-5">
          <h2 className="text-sm font-bold text-gray-400 mb-4 border-b border-gray-800 pb-2">
            📰 NARRATIVE STRENGTH
          </h2>
          <div className="space-y-4 text-xs">
            {narrative?.map((n: any) => (
              <div key={n.id} className="border border-gray-800 p-2">
                <div className="flex justify-between mb-1">
                  <span className="font-bold text-gray-300">{n.source}</span>
                  <span
                    className={
                      n.sentiment === 'positive'
                        ? 'text-green-500'
                        : 'text-red-500'
                    }
                  >
                    {n.sentiment === 'positive' ? '😊' : '😠'}
                  </span>
                </div>
                <div className="font-bold text-white mb-1">{n.title}</div>
                <div className="text-gray-500 italic">"{n.excerpt}"</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* HYPOTHESES */}
        <div className="border border-gray-800 bg-gray-950 p-5">
          <h2 className="text-sm font-bold text-gray-400 mb-4 border-b border-gray-800 pb-2">
            🧪 ACTIVE HYPOTHESES
          </h2>
          <div className="space-y-4">
            {hypotheses?.map((h: any) => (
              <div key={h.id} className="border border-gray-800 p-3 text-xs">
                <div className="font-bold text-white text-sm mb-2">
                  {h.hypothesis}
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-1 mb-1">
                  <span className="text-gray-500">Test:</span>
                  <span>{h.test_method}</span>
                  <span className="text-gray-500">Result:</span>
                  <span className="text-gray-300">{h.result}</span>
                  <span className="text-gray-500">Decision:</span>
                  <span className="text-yellow-400 font-bold">
                    {h.decision}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RUNWAY SIMULATOR */}
        <div className="border border-indigo-900/50 bg-gray-950 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 text-[10px] text-indigo-500 font-bold tracking-widest bg-indigo-950/30">
            WHAT-IF ENGINE
          </div>
          <h2 className="text-sm font-bold text-indigo-400 mb-4 border-b border-gray-800 pb-2">
            📊 RUNWAY SIMULATOR
          </h2>

          <div className="grid grid-cols-3 gap-4 mb-6 text-center text-xs border border-gray-800 p-3">
            <div>
              <div className="text-gray-500 mb-1">Simulated Net Burn</div>
              <div className="font-bold text-white text-lg">
                ₹{(simNetBurn / 100000).toFixed(2)}L/mo
              </div>
            </div>
            <div className="border-l border-r border-gray-800">
              <div className="text-gray-500 mb-1">Simulated Runway</div>
              <div
                className={`font-bold text-lg ${simRunway !== 'Infinite' && Number(simRunway) < 6 ? 'text-red-500' : 'text-green-500'}`}
              >
                {simRunway} mos
              </div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Break-Even</div>
              <div className="font-bold text-yellow-500 text-lg">
                {simNetBurn <= 0 ? 'Achieved ✅' : '❌'}
              </div>
            </div>
          </div>

          <div className="space-y-6 text-xs">
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-bold text-gray-300">
                  MRR Growth (+{simMrrGrowth}%)
                </label>
                <span className="text-green-400">
                  +₹{((simMrr - vital_signs.mrr) / 100000).toFixed(2)}L/mo
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={simMrrGrowth}
                onChange={(e) => setSimMrrGrowth(parseInt(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="font-bold text-gray-300">
                  New Engineering Hires (+{simHires})
                </label>
                <span className="text-red-400">
                  -₹{((simHires * 75000) / 100000).toFixed(2)}L/mo
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={simHires}
                onChange={(e) => setSimHires(parseInt(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="font-bold text-gray-300">
                  GPU Spend Cut ({simGpuCut}%)
                </label>
                <span className="text-green-400">
                  +₹
                  {((vital_signs.burn * (simGpuCut / 100)) / 100000).toFixed(2)}
                  L/mo
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={simGpuCut}
                onChange={(e) => setSimGpuCut(parseInt(e.target.value))}
                className="w-full accent-indigo-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* OH SHIT MODAL */}
      {showOhShit && (
        <div className="fixed inset-0 bg-red-950/90 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
          <div className="bg-black border-2 border-red-600 max-w-xl w-full p-8 shadow-[0_0_100px_rgba(220,38,38,0.3)]">
            {ohShitExecuted ? (
              <div className="text-center">
                <Skull className="w-24 h-24 text-red-600 mx-auto mb-6 animate-pulse" />
                <h2 className="text-3xl font-black text-white mb-2">
                  GLOBAL KILL SWITCH ENGAGED
                </h2>
                <p className="text-red-400 mb-8">
                  All API traffic suspended. Incident logged. Slack notified.
                </p>
                <button
                  onClick={() => setShowOhShit(false)}
                  className="bg-gray-800 text-white px-6 py-2"
                >
                  Close Protocol
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 text-red-500 mb-6">
                  <AlertTriangle className="w-10 h-10 animate-pulse" />
                  <h2 className="text-2xl font-black uppercase">
                    Initiate Protocol
                  </h2>
                </div>

                <div className="bg-red-950/30 p-4 border border-red-900/50 mb-6 text-sm text-red-200">
                  <p className="font-bold mb-2">Executing this command will:</p>
                  <ol className="list-decimal pl-5 space-y-1 font-mono">
                    <li>Instantly SUSPEND ALL active API keys globally.</li>
                    <li>
                      Route ALL live traffic to the Qwen3-8B fallback model.
                    </li>
                    <li>Update the public status page to "Major Incident".</li>
                    <li>Ping @channel in #founder-war-room via Slack.</li>
                  </ol>
                </div>

                <div className="space-y-4 font-mono text-sm">
                  <div>
                    <label className="block text-red-500 mb-1">
                      Reason for activation (optional):
                    </label>
                    <input
                      type="text"
                      className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 focus:border-red-500 outline-none"
                      value={ohShitReason}
                      onChange={(e) => setOhShitReason(e.target.value)}
                      disabled={countdownActive}
                    />
                  </div>
                  <div>
                    <label className="block text-red-500 mb-1">
                      Type CONFIRM to authorize:
                    </label>
                    <input
                      type="text"
                      className="w-full bg-gray-900 border border-gray-700 text-white px-3 py-2 font-bold focus:border-red-500 outline-none uppercase"
                      value={ohShitConfirm}
                      onChange={(e) => setOhShitConfirm(e.target.value)}
                      disabled={countdownActive}
                      placeholder="CONFIRM"
                    />
                  </div>
                </div>

                <div className="mt-8 flex gap-4">
                  {countdownActive ? (
                    <button
                      onClick={() => setCountdownActive(false)}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black font-black uppercase py-4"
                    >
                      ABORT! ({ohShitCountdown}s)
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowOhShit(false)}
                        className="flex-1 border border-gray-700 hover:bg-gray-900 text-white py-4 font-bold"
                      >
                        CANCEL
                      </button>
                      <button
                        disabled={ohShitConfirm !== 'CONFIRM'}
                        onClick={() => {
                          setCountdownActive(true);
                          setOhShitCountdown(10);
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black uppercase py-4 disabled:opacity-50"
                      >
                        ARM SWITCH
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
