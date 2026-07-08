'use client';
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Flex } from '@tremor/react';
import { HardDrive, Plus, Check, AlertTriangle, Clock, Download, RefreshCw } from 'lucide-react';
import { getCookie } from 'cookies-next';

interface Backup { id: string; name: string; type: string; size_bytes: number; status: string; started_at: string; completed_at: string; verified_at: string; retention_days: number; error_message: string; }

const statusColors: Record<string, string> = { pending: 'yellow', running: 'blue', completed: 'emerald', failed: 'red', verified: 'indigo' };
function fmtBytes(b: number) { if (!b) return '—'; const k = 1024; const sizes = ['B','KB','MB','GB']; const i = Math.floor(Math.log(b)/Math.log(k)); return `${(b/Math.pow(k,i)).toFixed(1)} ${sizes[i]}`; }
function fmtTime(d: string) { return d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'; }

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [apiBase, setApiBase] = useState('http://localhost:4008');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hostname;
      if (h !== 'localhost' && h !== '127.0.0.1') setApiBase(`http://${h}:4008`);
    }
  }, []);

  const token = () => getCookie('admin_token') || localStorage.getItem('admin_token');

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/admin/backups`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setBackups(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { if (apiBase) fetchBackups(); }, [apiBase]);

  const triggerBackup = async () => {
    setTriggering(true);
    const name = `backup_${new Date().toISOString().slice(0,10)}_${Date.now().toString().slice(-4)}`;
    await fetch(`${apiBase}/admin/backups`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type: 'full', retention_days: 30 })
    });
    setTimeout(async () => {
      setTriggering(false);
      fetchBackups();
    }, 4000);
  };

  const verifyBackup = async (id: string) => {
    await fetch(`${apiBase}/admin/backups/${id}/verify`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` } });
    fetchBackups();
  };

  const completedBackups = backups.filter(b => b.status === 'completed' || b.status === 'verified');
  const totalSize = completedBackups.reduce((sum, b) => sum + (b.size_bytes || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><HardDrive className="w-6 h-6 text-amber-500" /> Backup & Disaster Recovery</h1>
          <p className="text-gray-400 mt-1 text-sm">Manage full and incremental database backups with retention policies.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchBackups} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"><RefreshCw className="w-4 h-4" /></button>
          <Button icon={Plus} loading={triggering} onClick={triggerBackup}>Trigger Backup</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gray-900/60 border-gray-800 p-4 text-center">
          <div className="text-3xl font-black text-amber-400">{backups.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total Backups</div>
        </Card>
        <Card className="bg-gray-900/60 border-gray-800 p-4 text-center">
          <div className="text-3xl font-black text-emerald-400">{completedBackups.length}</div>
          <div className="text-xs text-gray-500 mt-1">Successful</div>
        </Card>
        <Card className="bg-gray-900/60 border-gray-800 p-4 text-center">
          <div className="text-3xl font-black text-blue-400">{fmtBytes(totalSize)}</div>
          <div className="text-xs text-gray-500 mt-1">Total Storage Used</div>
        </Card>
      </div>

      {/* Backup List */}
      <Card className="bg-gray-900/40 border-gray-800 p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/70">
              {['Name', 'Type', 'Size', 'Status', 'Created', 'Completed', 'Retention', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="text-center py-8 text-gray-500">Loading backups...</td></tr>}
            {!loading && backups.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-500">No backups yet. Click "Trigger Backup" to create one.</td></tr>}
            {backups.map(b => (
              <tr key={b.id} className="border-b border-gray-800/40 hover:bg-gray-800/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-300">{b.name}</td>
                <td className="px-4 py-3"><Badge color="gray" size="sm">{b.type}</Badge></td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{fmtBytes(b.size_bytes)}</td>
                <td className="px-4 py-3">
                  <Badge color={statusColors[b.status] as any} size="sm">
                    {b.status === 'running' ? '⏳ ' : ''}{b.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{fmtTime(b.started_at)}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{fmtTime(b.completed_at)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{b.retention_days}d</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {b.status === 'completed' && (
                      <button onClick={() => verifyBackup(b.id)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Verify</button>
                    )}
                    {b.status === 'verified' && <Check className="w-4 h-4 text-emerald-400" />}
                    {b.error_message && <AlertTriangle className="w-4 h-4 text-red-400" title={b.error_message} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
