'use client';
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Flex } from '@tremor/react';
import { Plug, Link, Link2Off, Check, ExternalLink, RefreshCw, Zap } from 'lucide-react';
import { getCookie } from 'cookies-next';

const PROVIDERS = [
  { id: 'github', name: 'GitHub', emoji: '🐙', desc: 'Connect repositories for code-aware AI assistance', docsUrl: 'https://github.com/settings/tokens' },
  { id: 'google_drive', name: 'Google Drive', emoji: '📁', desc: 'Sync documents and files to Knowledge Bases', docsUrl: 'https://console.cloud.google.com' },
  { id: 'slack', name: 'Slack', emoji: '💬', desc: 'Send AI summaries and alerts to Slack channels', docsUrl: 'https://api.slack.com/apps' },
  { id: 'notion', name: 'Notion', emoji: '📝', desc: 'Import Notion pages as Knowledge Base documents', docsUrl: 'https://www.notion.so/my-integrations' },
  { id: 'discord', name: 'Discord', emoji: '🎮', desc: 'Deploy AI bots to Discord servers', docsUrl: 'https://discord.com/developers/applications' },
  { id: 'postgres', name: 'PostgreSQL', emoji: '🐘', desc: 'Query external databases with natural language', docsUrl: '#' },
  { id: 'jira', name: 'Jira', emoji: '📋', desc: 'Summarize and triage project issues with AI', docsUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens' },
  { id: 'confluence', name: 'Confluence', emoji: '📚', desc: 'Index team wikis into Knowledge Bases', docsUrl: '#' },
];

const STATUS_CONFIG = {
  connected: { label: 'Connected', color: 'emerald', dot: '#10b981' },
  disconnected: { label: 'Disconnected', color: 'gray', dot: '#6b7280' },
  error: { label: 'Error', color: 'red', dot: '#ef4444' },
  syncing: { label: 'Syncing', color: 'blue', dot: '#3b82f6' },
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const apiBase = '/api-proxy';
  const [connecting, setConnecting] = useState(null);
  const [disconnecting, setDisconnecting] = useState(null);
  const [testing, setTesting] = useState(null);

  

  const token = () => getCookie('admin_token') || localStorage.getItem('admin_token');

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/admin/integrations`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setIntegrations(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { if (apiBase) fetchIntegrations(); }, [apiBase]);

  const getIntegration = (providerId) => integrations.find(i => i.provider === providerId);

  const handleConnect = async (provider) => {
    setConnecting(provider.id);
    try {
      const existing = getIntegration(provider.id);
      if (existing) {
        // Update to connected
        await fetch(`${apiBase}/admin/integrations/${existing.id}/connect`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        });
      } else {
        // Create as connected
        await fetch(`${apiBase}/admin/integrations`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: provider.id, display_name: provider.name, status: 'connected' }),
        });
      }
      await fetchIntegrations();
    } finally { setConnecting(null); }
  };

  const handleDisconnect = async (id) => {
    setDisconnecting(id);
    try {
      await fetch(`${apiBase}/admin/integrations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      await fetchIntegrations();
    } finally { setDisconnecting(null); }
  };

  const handleTest = async (id) => {
    setTesting(id);
    await new Promise(r => setTimeout(r, 1500));
    setTesting(null);
  };

  const fmtTime = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Never';
  const connectedCount = integrations.filter(i => i.connection_status === 'connected').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Plug className="w-6 h-6 text-teal-500" /> Integration Center
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Connect external services to extend your AI platform's capabilities.</p>
        </div>
        <div className="flex items-center gap-3">
          {connectedCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-400 font-semibold">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {connectedCount} connected
            </div>
          )}
          <button onClick={fetchIntegrations} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: PROVIDERS.length, color: 'text-gray-300' },
          { label: 'Connected', value: connectedCount, color: 'text-emerald-400' },
          { label: 'Available', value: PROVIDERS.length - connectedCount, color: 'text-gray-400' },
          { label: 'Errors', value: integrations.filter(i => i.connection_status === 'error').length, color: 'text-red-400' },
        ].map(s => (
          <Card key={s.label} className="bg-gray-900/60 border-gray-800 p-3 text-center">
            <div className={`text-2xl font-black ${s.color}`}>{loading ? '—' : s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {PROVIDERS.map(provider => {
          const integration = getIntegration(provider.id);
          const status = integration?.connection_status || 'disconnected';
          const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected;
          const isConnected = status === 'connected';
          const isConnecting = connecting === provider.id;
          const isDisconnecting = disconnecting === integration?.id;
          const isTesting = testing === integration?.id;

          return (
            <Card key={provider.id}
              className={`border p-5 transition-all duration-300 ${isConnected ? 'bg-teal-900/10 border-teal-800/40' : 'bg-gray-900/40 border-gray-800 hover:border-gray-700'}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${isConnected ? 'bg-teal-900/40' : 'bg-gray-800'}`}>
                    {provider.emoji}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{provider.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.dot }} />
                      <span className={`text-xs font-medium ${isConnected ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>
                </div>
                <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer"
                  className="text-gray-700 hover:text-gray-400 transition-colors p-1" title="View docs">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <p className="text-xs text-gray-500 mb-4 leading-relaxed">{provider.desc}</p>

              {/* Last sync */}
              {integration?.last_sync_at && (
                <div className="text-xs text-gray-700 mb-3">
                  Last sync: {fmtTime(integration.last_sync_at)}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                {!isConnected ? (
                  <button
                    onClick={() => handleConnect(provider)}
                    disabled={isConnecting}
                    className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-200 text-xs font-semibold px-3 py-2 rounded-lg transition-all">
                    {isConnecting ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Connecting...</>
                    ) : (
                      <><Link className="w-3.5 h-3.5 text-teal-400" /> Connect</>
                    )}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTest(integration.id)}
                      disabled={isTesting}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-teal-900/30 hover:bg-teal-900/50 border border-teal-800/50 text-teal-300 text-xs font-semibold px-3 py-2 rounded-lg transition-all">
                      {isTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      {isTesting ? 'Testing...' : 'Test'}
                    </button>
                    <button
                      onClick={() => handleDisconnect(integration.id)}
                      disabled={isDisconnecting}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-950/30 hover:bg-red-900/30 border border-red-900/40 text-red-400 text-xs font-semibold px-3 py-2 rounded-lg transition-all">
                      {isDisconnecting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Link2Off className="w-3 h-3" />}
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
