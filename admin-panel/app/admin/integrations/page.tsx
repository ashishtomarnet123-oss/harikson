'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plug,
  RefreshCw,
  ExternalLink,
  Check,
  X,
  AlertTriangle,
  Zap,
  Link2Off,
  Settings,
  ChevronDown,
  ChevronUp,
  Activity,
  Clock,
  Database,
  Wifi,
  WifiOff,
  Loader2,
  Plus,
  Info,
  ArrowRight,
} from 'lucide-react';
import { getCookie } from 'cookies-next';

// ─── Types ───────────────────────────────────────────────────────────
type Status = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';

interface Provider {
  id: string;
  name: string;
  description: string;
  icon: string;
  oauth_type: 'oauth2' | 'credentials' | 'bot_token';
  docs_url?: string;
  external_url?: string;
  capabilities: string[];
  webhook_support: boolean;
  plan_required: string;
  connection: {
    id: string | null;
    status: Status;
    connected_at: string | null;
    last_sync_at: string | null;
    last_error: string | null;
    error_type: string | null;
    error_count: number;
    settings: Record<string, any>;
  };
}

interface SummaryData {
  total: number;
  connected: number;
  available: number;
  errors: number;
}

interface SyncProgress {
  job_id: string;
  status: string;
  progress: {
    total_items: number;
    processed_items: number;
    percentage: number;
    current_detail?: string;
  };
  completed_at: string | null;
}

interface ActivityLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  metadata: Record<string, any>;
  created_at: string;
}

interface PgCredentials {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
}

// ─── Status config ───────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  Status,
  { label: string; dot: string; border: string; bg: string; text: string }
> = {
  disconnected: {
    label: 'Disconnected',
    dot: '#6b7280',
    border: 'border-slate-200/80',
    bg: 'bg-white',
    text: 'text-slate-500',
  },
  connecting: {
    label: 'Connecting…',
    dot: '#f59e0b',
    border: 'border-amber-200',
    bg: 'bg-amber-50/20',
    text: 'text-amber-600',
  },
  connected: {
    label: 'Connected',
    dot: '#10b981',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/20',
    text: 'text-emerald-600',
  },
  syncing: {
    label: 'Syncing…',
    dot: '#4f8cff',
    border: 'border-indigo-200',
    bg: 'bg-indigo-50/20',
    text: 'text-indigo-600',
  },
  error: {
    label: 'Error',
    dot: '#ff5d73',
    border: 'border-red-200',
    bg: 'bg-red-50/10',
    text: 'text-red-600',
  },
};

const LOG_COLORS: Record<string, string> = {
  info: 'text-indigo-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
  success: 'text-emerald-400',
};

// ─── Toast ───────────────────────────────────────────────────────────
function Toast({
  msg,
  type,
  onClose,
}: {
  msg: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  const colors =
    type === 'success'
      ? 'bg-emerald-600'
      : type === 'error'
        ? 'bg-red-600'
        : 'bg-indigo-600';
  return (
    <div
      className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-2xl ${colors} animate-[slideIn_0.3s_ease]`}
    >
      {type === 'success' ? (
        <Check className="w-4 h-4" />
      ) : type === 'error' ? (
        <AlertTriangle className="w-4 h-4" />
      ) : (
        <Info className="w-4 h-4" />
      )}
      {msg}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── PostgreSQL Credential Modal ─────────────────────────────────────
function PgCredentialModal({
  onConnect,
  onClose,
  loading,
}: {
  onConnect: (creds: PgCredentials) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [creds, setCreds] = useState<PgCredentials>({
    host: '',
    port: '5432',
    database: '',
    username: '',
    password: '',
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" /> Connect PostgreSQL
            Database
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {(['host', 'port', 'database', 'username', 'password'] as const).map(
            (field) => (
              <div key={field}>
                <label className="text-xs text-gray-400 font-semibold block mb-1 capitalize">
                  {field}
                </label>
                <input
                  type={field === 'password' ? 'password' : 'text'}
                  placeholder={
                    field === 'host'
                      ? 'db.example.com'
                      : field === 'port'
                        ? '5432'
                        : field
                  }
                  className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white outline-none focus:border-indigo-500 font-mono"
                  value={creds[field]}
                  onChange={(e) =>
                    setCreds((p) => ({ ...p, [field]: e.target.value }))
                  }
                />
              </div>
            )
          )}
          <p className="text-[10px] text-gray-600 mt-1">
            Credentials are stored encrypted. Use a read-only database user for
            security.
          </p>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 text-gray-400 text-xs font-semibold rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={() => onConnect(creds)}
            disabled={
              loading ||
              !creds.host ||
              !creds.database ||
              !creds.username ||
              !creds.password
            }
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…
              </>
            ) : (
              'Test & Connect'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────
function SettingsModal({
  provider,
  onSave,
  onClose,
}: {
  provider: Provider;
  onSave: (settings: Record<string, any>) => void;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState(provider.connection.settings || {});
  const [syncFreq, setSyncFreq] = useState(settings.sync_frequency_hours || 6);
  const [indexShared, setIndexShared] = useState(
    settings.index_shared || false
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-400" /> {provider.name}{' '}
            Settings
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 font-semibold block mb-1">
              Sync Frequency
            </label>
            <select
              className="w-full bg-gray-950 border border-gray-800 text-xs rounded-xl p-2.5 text-white outline-none focus:border-indigo-500 cursor-pointer"
              value={syncFreq}
              onChange={(e) => setSyncFreq(Number(e.target.value))}
            >
              <option value={1}>Every 1 hour</option>
              <option value={6}>Every 6 hours</option>
              <option value={12}>Every 12 hours</option>
              <option value={24}>Every 24 hours</option>
            </select>
          </div>
          {provider.id === 'google_drive' && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="indexShared"
                checked={indexShared}
                onChange={(e) => setIndexShared(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label
                htmlFor="indexShared"
                className="text-xs text-gray-400 font-semibold"
              >
                Index Shared Drives
              </label>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-400 font-semibold block mb-1">
              Capabilities
            </label>
            <div className="flex flex-wrap gap-1.5">
              {provider.capabilities.map((c) => (
                <span
                  key={c}
                  className="px-2 py-0.5 bg-indigo-950/40 border border-indigo-800/30 text-indigo-400 text-[10px] font-bold rounded-full uppercase"
                >
                  {c.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 text-gray-400 text-xs font-semibold rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                sync_frequency_hours: syncFreq,
                index_shared: indexShared,
              })
            }
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Log Drawer ─────────────────────────────────────────────
function ActivityDrawer({
  provider,
  logs,
  onClose,
}: {
  provider: Provider;
  logs: ActivityLog[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gray-900 border-l border-gray-800 p-6 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" /> {provider.name} —
            Activity Log
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {logs.length === 0 ? (
          <div className="text-center text-gray-600 text-xs py-12">
            No activity yet. Connect the integration to start logging.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-gray-950/50 rounded-xl border border-gray-800 text-xs"
              >
                <div
                  className={`font-semibold ${LOG_COLORS[log.level] || 'text-gray-300'} flex items-center gap-1.5`}
                >
                  {log.level === 'success' ? (
                    <Check className="w-3 h-3" />
                  ) : log.level === 'error' ? (
                    <AlertTriangle className="w-3 h-3" />
                  ) : log.level === 'warn' ? (
                    <AlertTriangle className="w-3 h-3" />
                  ) : (
                    <Info className="w-3 h-3" />
                  )}
                  {log.message}
                </div>
                <div className="text-gray-600 text-[10px] mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(log.created_at).toLocaleString('en-IN', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Integration Card ───────────────────────────────────────────
function IntegrationCard({
  provider,
  onConnect,
  onDisconnect,
  onSync,
  onSettings,
  onViewLogs,
  activeSyncJob,
}: {
  provider: Provider;
  onConnect: (p: Provider) => void;
  onDisconnect: (p: Provider) => void;
  onSync: (p: Provider) => void;
  onSettings: (p: Provider) => void;
  onViewLogs: (p: Provider) => void;
  activeSyncJob: SyncProgress | null;
}) {
  const [errorExpanded, setErrorExpanded] = useState(false);
  const conn = provider.connection;
  const status = conn.status;
  const cfg = STATUS_CONFIG[status];
  const isConnected = status === 'connected';
  const isSyncing = status === 'syncing';
  const isConnecting = status === 'connecting';
  const isError = status === 'error';
  const fmtTime = (d: string | null) =>
    d
      ? new Date(d).toLocaleString('en-IN', {
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : 'Never';

  return (
    <div
      className={`relative border rounded-2xl p-5 transition-all duration-300 ${cfg.bg} ${cfg.border} hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5 flex flex-col gap-4 group`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl flex-shrink-0">
            {provider.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-sm">
                {provider.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <div
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isConnecting || isSyncing ? 'animate-pulse' : ''}`}
                style={{ background: cfg.dot }}
              />
              <span className={`text-[11px] font-semibold ${cfg.text}`}>
                {cfg.label}
              </span>
              {isError && conn.error_count > 0 && (
                <span className="text-[9px] text-red-500 font-bold">
                  ({conn.error_count} errors)
                </span>
              )}
              {provider.plan_required !== 'free' && !isConnected && (
                <span
                  className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                    provider.plan_required === 'pro'
                      ? 'bg-indigo-50 border border-indigo-200/50 text-indigo-600'
                      : 'bg-purple-50 border border-purple-200/50 text-purple-600'
                  }`}
                  style={{ textTransform: 'uppercase' }}
                >
                  {provider.plan_required}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isConnected && (
            <button
              onClick={() => onSettings(provider)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
          {provider.external_url && (
            <a
              href={isConnected ? provider.external_url : provider.docs_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title={
                isConnected ? 'Open provider dashboard' : 'View documentation'
              }
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-500 leading-relaxed font-normal min-h-[40px] flex-grow">
        {provider.description}
      </p>

      {/* Sync Progress Bar */}
      {isSyncing && activeSyncJob && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-semibold">
            <span className="text-slate-500">
              {activeSyncJob.progress.current_detail || `Syncing items…`}
            </span>
            <span className="text-indigo-600 font-mono">
              {activeSyncJob.progress.percentage}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-700"
              style={{ width: `${activeSyncJob.progress.percentage}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400">
            {activeSyncJob.progress.processed_items} /{' '}
            {activeSyncJob.progress.total_items} items
          </div>
        </div>
      )}

      {/* Error Detail Drawer */}
      {isError && conn.last_error && (
        <div className="border border-red-200 rounded-xl bg-red-50/10 overflow-hidden">
          <button
            onClick={() => setErrorExpanded((p) => !p)}
            className="w-full flex items-center justify-between p-2.5 text-[10px] text-red-500 font-semibold"
          >
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />{' '}
              {conn.error_type || 'Sync error'}
            </span>
            {errorExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
          {errorExpanded && (
            <div className="px-3 pb-3 text-[10px] text-red-600 font-mono leading-relaxed border-t border-red-100">
              {conn.last_error}
            </div>
          )}
        </div>
      )}

      {/* Last Sync */}
      {isConnected && conn.last_sync_at && (
        <div className="text-[10px] text-slate-400 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Last synced:{' '}
          {fmtTime(conn.last_sync_at)}
        </div>
      )}

      {/* Capabilities */}
      {isConnected && (
        <div className="flex flex-wrap gap-1">
          {provider.capabilities.slice(0, 3).map((cap) => (
            <span
              key={cap}
              className="px-1.5 py-0.5 bg-slate-50 border border-slate-100 text-slate-600 text-[9px] font-bold rounded uppercase"
            >
              {cap.replace('_', ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-auto space-y-2">
        {status === 'disconnected' && (
          <button
            onClick={() => onConnect(provider)}
            className="w-full flex items-center justify-center gap-2 premium-btn-connect border text-xs px-3 py-2 rounded-xl"
          >
            <Plug className="w-3.5 h-3.5 text-indigo-500 transition-colors duration-200" />
            <span>Connect</span>
          </button>
        )}

        {status === 'connecting' && (
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 bg-amber-50/10 border border-amber-200 text-amber-500 text-xs font-semibold px-3 py-2 rounded-xl opacity-80 cursor-not-allowed"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…
          </button>
        )}

        {status === 'connected' && (
          <div className="flex gap-2">
            <button
              onClick={() => onSync(provider)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 text-indigo-600 hover:text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-300"
            >
              <Zap className="w-3.5 h-3.5" /> Sync Now
            </button>
            <button
              onClick={() => onViewLogs(provider)}
              className="px-2.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-all"
              title="View activity log"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDisconnect(provider)}
              className="px-2.5 py-2 bg-red-50 hover:bg-red-600 border border-red-250 text-red-500 hover:text-white rounded-xl transition-all duration-300"
              title="Disconnect"
            >
              <WifiOff className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {status === 'syncing' && (
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 bg-indigo-50/10 border border-indigo-200 text-indigo-500 text-xs font-semibold px-3 py-2 rounded-xl opacity-80 cursor-not-allowed"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing…
          </button>
        )}

        {status === 'error' && (
          <div className="flex gap-2">
            <button
              onClick={() => onConnect(provider)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-600 border border-red-200 text-red-500 hover:text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-300"
            >
              <RefreshCw className="w-3.5 h-3.5" />{' '}
              {conn.error_type === 'auth_expired' ||
              conn.error_type === 'auth_failed'
                ? 'Reconnect'
                : 'Retry'}
            </button>
            <button
              onClick={() => onDisconnect(provider)}
              className="px-2.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-xl transition-all"
              title="Disconnect"
            >
              <Link2Off className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function IntegrationCenterPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    total: 8,
    connected: 0,
    available: 8,
    errors: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{
    msg: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [pgModal, setPgModal] = useState<Provider | null>(null);
  const [pgLoading, setPgLoading] = useState(false);
  const [settingsModal, setSettingsModal] = useState<Provider | null>(null);
  const [activityProvider, setActivityProvider] = useState<Provider | null>(
    null
  );
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activeSyncJobs, setActiveSyncJobs] = useState<
    Record<string, SyncProgress>
  >({});
  const syncPollingRef = useRef<Record<string, NodeJS.Timeout>>({});

  const apiBase = '/api-proxy';
  const token = () =>
    getCookie('admin_token') || localStorage.getItem('admin_token') || '';

  const showToast = (
    msg: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => setToast({ msg, type });

  // ── Fetch ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const [provRes, sumRes] = await Promise.all([
          fetch(`${apiBase}/v1/admin/integrations/providers`, {
            headers: { Authorization: `Bearer ${token()}` },
          }),
          fetch(`${apiBase}/v1/admin/integrations/status`, {
            headers: { Authorization: `Bearer ${token()}` },
          }),
        ]);

        if (provRes.ok) {
          const d = await provRes.json();
          setProviders(d.data || []);
        }
        if (sumRes.ok) {
          const d = await sumRes.json();
          setSummary(
            d.data || { total: 8, connected: 0, available: 8, errors: 0 }
          );
        }
      } catch (e) {
        if (!silent) showToast('Failed to load integrations', 'error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiBase]
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Sync Job Polling ──────────────────────────────────────────────
  const startPollingSync = useCallback(
    (providerId: string, jobId: string) => {
      const poll = async () => {
        try {
          const res = await fetch(
            `${apiBase}/v1/admin/integrations/${providerId}/sync/${jobId}`,
            {
              headers: { Authorization: `Bearer ${token()}` },
            }
          );
          if (!res.ok) return;
          const d = await res.json();
          const job: SyncProgress = d.data;
          setActiveSyncJobs((prev) => ({ ...prev, [providerId]: job }));

          if (job.status === 'completed' || job.status === 'failed') {
            clearInterval(syncPollingRef.current[providerId]);
            delete syncPollingRef.current[providerId];
            setActiveSyncJobs((prev) => {
              const n = { ...prev };
              delete n[providerId];
              return n;
            });
            await fetchAll(true);
            showToast(
              job.status === 'completed'
                ? `${providerId} sync completed!`
                : `${providerId} sync failed`,
              job.status === 'completed' ? 'success' : 'error'
            );
          }
        } catch (err: any) {
          console.error('Error polling integration sync status:', err);
        }
      };

      poll();
      syncPollingRef.current[providerId] = setInterval(poll, 2000);
    },
    [apiBase, fetchAll]
  );

  useEffect(() => {
    return () => {
      Object.values(syncPollingRef.current).forEach(clearInterval);
    };
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleConnect = async (provider: Provider) => {
    if (provider.id === 'postgres') {
      setPgModal(provider);
      return;
    }

    try {
      const res = await fetch(
        `${apiBase}/v1/admin/integrations/${provider.id}/connect`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );
      const d = await res.json();
      if (!res.ok) {
        showToast(d.error || 'Connection failed', 'error');
        return;
      }

      if (d.authorization_url) {
        // Real OAuth redirect
        window.location.href = d.authorization_url;
        return;
      }

      showToast(`${provider.name} connected!`);
      fetchAll(true);
    } catch {
      showToast('Connection failed', 'error');
    }
  };

  const handlePgConnect = async (creds: PgCredentials) => {
    if (!pgModal) return;
    setPgLoading(true);
    try {
      const res = await fetch(
        `${apiBase}/v1/admin/integrations/postgres/connect`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(creds),
        }
      );
      const d = await res.json();
      if (!res.ok) {
        showToast(d.error || 'Connection failed', 'error');
        return;
      }
      showToast('PostgreSQL database connected!');
      setPgModal(null);
      fetchAll(true);
    } catch {
      showToast('Connection failed', 'error');
    } finally {
      setPgLoading(false);
    }
  };

  const handleDisconnect = async (provider: Provider) => {
    if (
      !window.confirm(
        `Disconnect ${provider.name}? Your indexed data will be purged in 30 days.`
      )
    )
      return;
    try {
      const res = await fetch(
        `${apiBase}/v1/admin/integrations/${provider.id}/disconnect`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token()}` },
        }
      );
      const d = await res.json();
      if (!res.ok) {
        showToast(d.error || 'Disconnect failed', 'error');
        return;
      }
      showToast(`${provider.name} disconnected`);
      fetchAll(true);
    } catch {
      showToast('Disconnect failed', 'error');
    }
  };

  const handleSync = async (provider: Provider) => {
    try {
      const res = await fetch(
        `${apiBase}/v1/admin/integrations/${provider.id}/sync`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sync_type: 'full_sync' }),
        }
      );
      const d = await res.json();
      if (!res.ok) {
        showToast(d.error || 'Sync failed', 'error');
        return;
      }

      showToast(`${provider.name} sync started`, 'info');
      fetchAll(true);
      startPollingSync(provider.id, d.job_id);
    } catch {
      showToast('Sync failed', 'error');
    }
  };

  const handleSaveSettings = async (
    provider: Provider,
    settings: Record<string, any>
  ) => {
    try {
      const res = await fetch(
        `${apiBase}/v1/admin/integrations/${provider.id}/settings`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        }
      );
      if (!res.ok) {
        showToast('Failed to save settings', 'error');
        return;
      }
      showToast('Settings saved');
      setSettingsModal(null);
      fetchAll(true);
    } catch {
      showToast('Failed to save settings', 'error');
    }
  };

  const handleViewLogs = async (provider: Provider) => {
    try {
      const res = await fetch(
        `${apiBase}/v1/admin/integrations/${provider.id}/logs?limit=30`,
        {
          headers: { Authorization: `Bearer ${token()}` },
        }
      );
      if (res.ok) {
        const d = await res.json();
        setActivityLogs(d.data || []);
      }
      setActivityProvider(provider);
    } catch {
      showToast('Could not load logs', 'error');
    }
  };

  const connectedCount = summary.connected;
  const hasConnections = connectedCount > 0;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Modals */}
      {pgModal && (
        <PgCredentialModal
          onConnect={handlePgConnect}
          onClose={() => setPgModal(null)}
          loading={pgLoading}
        />
      )}
      {settingsModal && (
        <SettingsModal
          provider={settingsModal}
          onSave={(s) => handleSaveSettings(settingsModal, s)}
          onClose={() => setSettingsModal(null)}
        />
      )}
      {activityProvider && (
        <ActivityDrawer
          provider={activityProvider}
          logs={activityLogs}
          onClose={() => setActivityProvider(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Plug className="w-6 h-6 text-indigo-400" /> Integration Center
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Connect external services to extend your AI platform's capabilities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasConnections && (
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-emerald-400 font-semibold px-3 py-1.5 bg-emerald-950/20 border border-emerald-900/30 rounded-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {connectedCount} connected
            </div>
          )}
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors border border-gray-800"
            title="Refresh all integration statuses"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Onboarding Banner */}
      {!loading && !hasConnections && (
        <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-800/40 rounded-2xl p-5 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-black text-white mb-1">
              🚀 Get started — connect your first integration
            </div>
            <div className="text-xs text-gray-400">
              Start with GitHub for code-aware AI, then add Google Drive to sync
              your documents.
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-semibold flex-shrink-0">
            <span className="text-xl">🐙</span> GitHub
            <ArrowRight className="w-3 h-3" />
            <span className="text-xl">📁</span> Google Drive
            <ArrowRight className="w-3 h-3" />
            <span className="text-xl">💬</span> Slack
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Providers',
            value: summary.total,
            color: 'text-slate-800',
            border:
              'border-l-4 border-l-slate-400 border-slate-200/80 bg-white',
          },
          {
            label: 'Connected',
            value: summary.connected,
            color: 'text-emerald-600',
            border:
              'border-l-4 border-l-emerald-500 border-slate-200/80 bg-white',
          },
          {
            label: 'Available Now',
            value: summary.available,
            color: 'text-indigo-600',
            border:
              'border-l-4 border-l-indigo-500 border-slate-200/80 bg-white',
          },
          {
            label: 'Errors / Alerts',
            value: summary.errors,
            color: summary.errors > 0 ? 'text-red-500' : 'text-slate-400',
            border:
              summary.errors > 0
                ? 'border-l-4 border-l-red-500 border-slate-200/80 bg-white'
                : 'border-l-4 border-l-slate-300 border-slate-200/80 bg-white',
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`border rounded-2xl p-5 shadow-sm shadow-slate-100/50 ${s.border}`}
          >
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              {s.label}
            </div>
            <div className={`text-3xl font-black mt-1 ${s.color}`}>
              {loading ? '—' : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Integration Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="border border-gray-800 rounded-2xl p-5 bg-gray-900/40 animate-pulse"
            >
              <div className="flex gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-800 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-gray-800 rounded w-2/3" />
                  <div className="h-2.5 bg-gray-800 rounded w-1/2" />
                </div>
              </div>
              <div className="h-8 bg-gray-800 rounded mb-3" />
              <div className="h-8 bg-gray-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {providers.map((provider) => (
            <IntegrationCard
              key={provider.id}
              provider={provider}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onSync={handleSync}
              onSettings={(p) => setSettingsModal(p)}
              onViewLogs={handleViewLogs}
              activeSyncJob={activeSyncJobs[provider.id] || null}
            />
          ))}
        </div>
      )}

      {/* Footer note */}
      <div className="text-center text-[11px] text-gray-700 pb-2">
        All integrations use OAuth 2.0 with PKCE • Tokens encrypted at rest •
        SOC 2 compliant
      </div>

      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* ─── Premium Button Overrides to defeat globals.css overrides ─── */

        /* Connect Button */
        button.premium-btn-connect {
          background-color: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 12px !important;
          font-weight: 600 !important;
          transition: all 250ms ease-in-out !important;
        }
        button.premium-btn-connect:hover {
          background-color: var(--accent-cyan) !important;
          border-color: var(--accent-cyan) !important;
        }
        button.premium-btn-connect span {
          color: var(--text-primary) !important;
        }
        button.premium-btn-connect:hover span {
          color: #ffffff !important;
        }
        button.premium-btn-connect:hover svg {
          color: #ffffff !important;
        }

        /* Sync Button */
        button.premium-btn-sync {
          background-color: rgba(79, 140, 255, 0.08) !important;
          border: 1px solid rgba(79, 140, 255, 0.2) !important;
          border-radius: 12px !important;
          font-weight: 600 !important;
          transition: all 250ms ease-in-out !important;
        }
        button.premium-btn-sync:hover {
          background-color: var(--accent-cyan) !important;
          border-color: var(--accent-cyan) !important;
        }
        button.premium-btn-sync span {
          color: var(--accent-cyan) !important;
        }
        button.premium-btn-sync svg {
          color: var(--accent-cyan) !important;
        }
        button.premium-btn-sync:hover span {
          color: #ffffff !important;
        }
        button.premium-btn-sync:hover svg {
          color: #ffffff !important;
        }

        /* Logs & generic secondary icon buttons */
        button.premium-btn-logs {
          background-color: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 12px !important;
          transition: all 200ms ease-in-out !important;
        }
        button.premium-btn-logs:hover {
          background-color: #f1f5f9 !important;
          border-color: #cbd5e1 !important;
        }
        button.premium-btn-logs svg {
          color: var(--text-muted) !important;
        }

        /* Disconnect Button */
        button.premium-btn-disconnect {
          background-color: rgba(255, 93, 115, 0.08) !important;
          border: 1px solid rgba(255, 93, 115, 0.2) !important;
          border-radius: 12px !important;
          transition: all 200ms ease-in-out !important;
        }
        button.premium-btn-disconnect:hover {
          background-color: var(--error-coral) !important;
          border-color: var(--error-coral) !important;
        }
        button.premium-btn-disconnect svg {
          color: var(--error-coral) !important;
        }
        button.premium-btn-disconnect:hover svg {
          color: #ffffff !important;
        }

        /* Retry Button */
        button.premium-btn-retry {
          background-color: rgba(255, 93, 115, 0.08) !important;
          border: 1px solid rgba(255, 93, 115, 0.2) !important;
          border-radius: 12px !important;
          font-weight: 600 !important;
          transition: all 200ms ease-in-out !important;
        }
        button.premium-btn-retry:hover {
          background-color: var(--error-coral) !important;
          border-color: var(--error-coral) !important;
        }
        button.premium-btn-retry span {
          color: var(--error-coral) !important;
        }
        button.premium-btn-retry svg {
          color: var(--error-coral) !important;
        }
        button.premium-btn-retry:hover span {
          color: #ffffff !important;
        }
        button.premium-btn-retry:hover svg {
          color: #ffffff !important;
        }
      `}</style>
    </div>
  );
}
