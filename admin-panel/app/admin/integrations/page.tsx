'use client';
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Flex } from '@tremor/react';
import { Plug, Link, Link2Off, Check, AlertCircle, Plus } from 'lucide-react';
import { getCookie } from 'cookies-next';

const PROVIDERS = [
  { id: 'github', name: 'GitHub', icon: '🐙', desc: 'Connect repositories for code-aware AI assistance' },
  { id: 'google_drive', name: 'Google Drive', icon: '📁', desc: 'Sync documents and files to Knowledge Bases' },
  { id: 'slack', name: 'Slack', icon: '💬', desc: 'Send AI summaries and alerts to channels' },
  { id: 'notion', name: 'Notion', icon: '📝', desc: 'Import Notion pages as Knowledge Base documents' },
  { id: 'discord', name: 'Discord', icon: '🎮', desc: 'Deploy AI bots to Discord servers' },
  { id: 'postgres', name: 'PostgreSQL', icon: '🐘', desc: 'Query external databases with natural language' },
  { id: 'jira', name: 'Jira', icon: '📋', desc: 'Summarize and triage project issues with AI' },
  { id: 'confluence', name: 'Confluence', icon: '📚', desc: 'Index team wikis into Knowledge Bases' },
];

interface Integration { id: string; provider: string; display_name: string; connection_status: string; last_sync_at: string; error_count: number; }

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiBase, setApiBase] = useState('http://localhost:4008');
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hostname;
      if (h !== 'localhost' && h !== '127.0.0.1') setApiBase(`http://${h}:4008`);
    }
  }, []);

  const token = () => getCookie('admin_token') || localStorage.getItem('admin_token');

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/admin/integrations`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setIntegrations(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { if (apiBase) fetchIntegrations(); }, [apiBase]);

  const handleConnect = async (provider: typeof PROVIDERS[0]) => {
    setConnecting(provider.id);
    await fetch(`${apiBase}/admin/integrations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: provider.id, display_name: provider.name })
    });
    await fetchIntegrations();
    setConnecting(null);
  };

  const handleDisconnect = async (id: string) => {
    await fetch(`${apiBase}/admin/integrations/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    fetchIntegrations();
  };

  const getIntegration = (providerId: string) => integrations.find(i => i.provider === providerId);
  const fmtTime = (d: string) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Never';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Plug className="w-6 h-6 text-teal-500" /> Integration Center</h1>
        <p className="text-gray-400 mt-1 text-sm">Connect external services to extend your AI platform's capabilities.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROVIDERS.map(provider => {
          const integration = getIntegration(provider.id);
          const isConnected = integration?.connection_status === 'connected';
          const isConnecting = connecting === provider.id;

          return (
            <Card key={provider.id} className={`border p-5 transition-all ${isConnected ? 'bg-teal-900/10 border-teal-800/50' : 'bg-gray-900/40 border-gray-800'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <div className="font-semibold text-white">{provider.name}</div>
                    <Badge color={isConnected ? 'emerald' : 'gray'} size="sm" icon={isConnected ? Check : Link2Off}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4">{provider.desc}</p>
              {integration && (
                <div className="text-xs text-gray-600 mb-3">Last sync: {fmtTime(integration.last_sync_at)}</div>
              )}
              {isConnected ? (
                <Flex justifyContent="end" className="gap-2">
                  <Button size="xs" variant="secondary">Test</Button>
                  <Button size="xs" color="red" variant="secondary" onClick={() => handleDisconnect(integration!.id)}>Disconnect</Button>
                </Flex>
              ) : (
                <Button size="xs" icon={Link} loading={isConnecting} onClick={() => handleConnect(provider)} className="w-full" variant="secondary">
                  Connect
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
