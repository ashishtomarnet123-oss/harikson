'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '@tremor/react';
import { Cpu, Thermometer, Zap, MemoryStick, RefreshCw, AlertTriangle } from 'lucide-react';
import { getCookie } from 'cookies-next';

interface GPU { index: number; name: string; utilization_gpu: number; utilization_memory: number; memory_used_mb: number; memory_total_mb: number; temperature_c: number; power_draw_w: number; power_limit_w: number; fan_speed_pct: number; }

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, max ? (value / max) * 100 : value);
  return (
    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function GpuPage() {
  const [gpus, setGpus] = useState<GPU[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [apiBase, setApiBase] = useState('http://localhost:4008');
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hostname;
      if (h !== 'localhost' && h !== '127.0.0.1') setApiBase(`http://${h}:4008`);
    }
  }, []);

  const fetchGpu = async () => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    try {
      const res = await fetch(`${apiBase}/admin/gpu`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setGpus(data.gpus || []);
        setMessage(data.message || '');
        setLastUpdated(new Date().toLocaleTimeString('en-IN'));
      }
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!apiBase) return;
    fetchGpu();
    const interval = setInterval(fetchGpu, 5000);
    return () => clearInterval(interval);
  }, [apiBase]);

  const getUtilColor = (pct: number) => pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-emerald-500';
  const getTempColor = (t: number) => t > 85 ? 'text-red-400' : t > 70 ? 'text-yellow-400' : 'text-emerald-400';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Cpu className="w-6 h-6 text-cyan-500" /> GPU Infrastructure</h1>
          <p className="text-gray-400 mt-1 text-sm">Live GPU utilization, thermal, and power metrics. Refreshes every 5 seconds.</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-xs text-gray-500">Last updated: {lastUpdated}</span>}
          <button onClick={fetchGpu} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading && <div className="text-center text-gray-500 py-12">Querying GPU hardware...</div>}

      {!loading && gpus.length === 0 && (
        <Card className="bg-gray-900/40 border-yellow-800/50 p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-white font-bold mb-1">No NVIDIA GPU Detected</h3>
          <p className="text-gray-500 text-sm">{message || 'GPU may not be accessible from the current environment, or NVIDIA drivers are not installed.'}</p>
        </Card>
      )}

      {gpus.map(gpu => (
        <Card key={gpu.index} className="bg-gray-900/40 border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">GPU {gpu.index}: {gpu.name}</h3>
              <p className="text-xs text-gray-500">Device {gpu.index}</p>
            </div>
            <div className={`text-2xl font-black ${getUtilColor(gpu.utilization_gpu).replace('bg-', 'text-')}`}>{gpu.utilization_gpu}%</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Utilization */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1"><Cpu className="w-3 h-3" /> GPU Utilization</span>
                <span className="font-mono text-white">{gpu.utilization_gpu}%</span>
              </div>
              <ProgressBar value={gpu.utilization_gpu} max={100} color={getUtilColor(gpu.utilization_gpu)} />
            </div>

            {/* VRAM */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1"><MemoryStick className="w-3 h-3" /> VRAM</span>
                <span className="font-mono text-white">{(gpu.memory_used_mb / 1024).toFixed(1)} / {(gpu.memory_total_mb / 1024).toFixed(0)} GB</span>
              </div>
              <ProgressBar value={gpu.memory_used_mb} max={gpu.memory_total_mb} color={getUtilColor(gpu.utilization_memory)} />
            </div>

            {/* Power */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1"><Zap className="w-3 h-3" /> Power Draw</span>
                <span className="font-mono text-white">{gpu.power_draw_w.toFixed(0)}W / {gpu.power_limit_w.toFixed(0)}W</span>
              </div>
              <ProgressBar value={gpu.power_draw_w} max={gpu.power_limit_w} color={gpu.power_draw_w > gpu.power_limit_w * 0.9 ? 'bg-red-500' : 'bg-blue-500'} />
            </div>

            {/* Temperature */}
            <div className="bg-gray-950 rounded-xl p-4 text-center">
              <Thermometer className={`w-8 h-8 mx-auto mb-1 ${getTempColor(gpu.temperature_c)}`} />
              <div className={`text-3xl font-black ${getTempColor(gpu.temperature_c)}`}>{gpu.temperature_c}°C</div>
              <div className="text-xs text-gray-500">Temperature</div>
            </div>

            {/* Fan */}
            <div className="bg-gray-950 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-blue-400">{gpu.fan_speed_pct}%</div>
              <div className="text-xs text-gray-500">Fan Speed</div>
            </div>

            {/* Mem Util */}
            <div className="bg-gray-950 rounded-xl p-4 text-center">
              <div className="text-3xl font-black text-purple-400">{gpu.utilization_memory}%</div>
              <div className="text-xs text-gray-500">Memory Util</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
