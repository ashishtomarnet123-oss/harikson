'use client';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react';
import {
  Play,
  Plus,
  Trash2,
  Settings,
  Sparkles,
  Database,
  Globe,
  Mail,
  MessageSquare,
  Code,
  GitBranch,
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Check,
  Download,
  Upload,
  ArrowRight,
  Maximize2,
  Bot,
  Filter,
  Layers,
  ChevronDown,
  Info,
  RefreshCw,
} from 'lucide-react';

// ─── CUSTOM NODE DEFINITIONS ──────────────────────────────────────────────────

// 1. Trigger Node
const TriggerNode = ({ data, selected }) => {
  const isRunning = data.executionStatus === 'running';
  const isSuccess = data.executionStatus === 'completed';
  const isFailed = data.executionStatus === 'failed';

  const triggerIcons = {
    webhook: <Globe className="w-4 h-4 text-emerald-400" />,
    cron: <Clock className="w-4 h-4 text-amber-400" />,
    manual: <Play className="w-4 h-4 text-cyan-400" />,
    event: <Zap className="w-4 h-4 text-purple-400" />,
  };

  return (
    <div
      className={`relative min-w-[220px] rounded-xl border backdrop-blur-md p-3.5 transition-all shadow-lg ${
        selected ? 'border-cyan-400 shadow-cyan-500/20' : 'border-emerald-500/40 hover:border-emerald-400/70'
      } ${
        isRunning
          ? 'ring-2 ring-cyan-400 animate-pulse bg-cyan-950/40'
          : isSuccess
          ? 'border-emerald-500 bg-emerald-950/30'
          : isFailed
          ? 'border-red-500 bg-red-950/30'
          : 'bg-slate-900/90'
      }`}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            {triggerIcons[data.triggerType || 'manual'] || <Zap className="w-4 h-4 text-emerald-400" />}
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              TRIGGER
            </span>
            <h4 className="text-xs font-semibold text-white leading-tight">{data.label || 'Workflow Trigger'}</h4>
          </div>
        </div>
        {isRunning && <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
        {isSuccess && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
        {isFailed && <XCircle className="w-3.5 h-3.5 text-red-400" />}
      </div>

      <div className="text-[11px] text-slate-300 space-y-1">
        <div className="flex items-center justify-between text-slate-400">
          <span>Type:</span>
          <span className="font-mono text-white text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 capitalize">
            {data.triggerType || 'manual'}
          </span>
        </div>
        {data.config?.cronExpression && (
          <div className="flex items-center justify-between text-slate-400">
            <span>Cron:</span>
            <span className="font-mono text-amber-300 text-[10px]">{data.config.cronExpression}</span>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

// 2. LLM / AI Prompt Node
const LLMNode = ({ data, selected }) => {
  const isRunning = data.executionStatus === 'running';
  const isSuccess = data.executionStatus === 'completed';
  const isFailed = data.executionStatus === 'failed';

  return (
    <div
      className={`relative min-w-[240px] max-w-[280px] rounded-xl border backdrop-blur-md p-3.5 transition-all shadow-lg ${
        selected ? 'border-purple-400 shadow-purple-500/20' : 'border-purple-500/40 hover:border-purple-400/70'
      } ${
        isRunning
          ? 'ring-2 ring-purple-400 animate-pulse bg-purple-950/40'
          : isSuccess
          ? 'border-emerald-500 bg-emerald-950/30'
          : isFailed
          ? 'border-red-500 bg-red-950/30'
          : 'bg-slate-900/90'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-semibold">
              AI / LLM
            </span>
            <h4 className="text-xs font-semibold text-white leading-tight">{data.label || 'Generate Text'}</h4>
          </div>
        </div>
        {isRunning && <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />}
        {isSuccess && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
        {isFailed && <XCircle className="w-3.5 h-3.5 text-red-400" />}
      </div>

      <div className="text-[11px] text-slate-300 space-y-1.5">
        <div className="flex items-center justify-between text-slate-400">
          <span>Model:</span>
          <span className="font-mono text-purple-300 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
            {data.config?.model || 'llama3:8b'}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 line-clamp-2 bg-black/20 p-1.5 rounded border border-white/5 font-mono">
          {data.value || data.config?.bodyTemplate || 'Provide summary...'}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

// 3. RAG Vector Search Node
const RAGNode = ({ data, selected }) => {
  const isRunning = data.executionStatus === 'running';
  const isSuccess = data.executionStatus === 'completed';
  const isFailed = data.executionStatus === 'failed';

  return (
    <div
      className={`relative min-w-[240px] max-w-[280px] rounded-xl border backdrop-blur-md p-3.5 transition-all shadow-lg ${
        selected ? 'border-cyan-400 shadow-cyan-500/20' : 'border-cyan-500/40 hover:border-cyan-400/70'
      } ${
        isRunning
          ? 'ring-2 ring-cyan-400 animate-pulse bg-cyan-950/40'
          : isSuccess
          ? 'border-emerald-500 bg-emerald-950/30'
          : isFailed
          ? 'border-red-500 bg-red-950/30'
          : 'bg-slate-900/90'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              RAG SEARCH
            </span>
            <h4 className="text-xs font-semibold text-white leading-tight">{data.label || 'Vector Query'}</h4>
          </div>
        </div>
        {isRunning && <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
        {isSuccess && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
        {isFailed && <XCircle className="w-3.5 h-3.5 text-red-400" />}
      </div>

      <div className="text-[11px] text-slate-300 space-y-1.5">
        <p className="text-[11px] text-slate-300 line-clamp-2 bg-black/20 p-1.5 rounded border border-white/5 font-mono">
          Query: {data.value || data.config?.query || 'Search document index...'}
        </p>
        <div className="flex items-center justify-between text-slate-400 text-[10px]">
          <span>Top Chunks:</span>
          <span className="font-mono text-cyan-300">{data.config?.maxResults || 3}</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

// 4. Router / Condition Node (Branching If/Else like n8n & Make)
const RouterNode = ({ data, selected }) => {
  const isRunning = data.executionStatus === 'running';
  const isSuccess = data.executionStatus === 'completed';
  const isFailed = data.executionStatus === 'failed';
  const selectedBranch = data.output?.selectedBranch;

  return (
    <div
      className={`relative min-w-[240px] max-w-[280px] rounded-xl border backdrop-blur-md p-3.5 transition-all shadow-lg ${
        selected ? 'border-amber-400 shadow-amber-500/20' : 'border-amber-500/40 hover:border-amber-400/70'
      } ${
        isRunning
          ? 'ring-2 ring-amber-400 animate-pulse bg-amber-950/40'
          : isSuccess
          ? 'border-emerald-500 bg-emerald-950/30'
          : isFailed
          ? 'border-red-500 bg-red-950/30'
          : 'bg-slate-900/90'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
              IF / ROUTER
            </span>
            <h4 className="text-xs font-semibold text-white leading-tight">{data.label || 'Condition Branch'}</h4>
          </div>
        </div>
        {isRunning && <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
        {isSuccess && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
        {isFailed && <XCircle className="w-3.5 h-3.5 text-red-400" />}
      </div>

      <div className="text-[11px] text-slate-300 space-y-1.5 mb-2">
        <div className="flex items-center justify-between text-slate-400 text-[10px]">
          <span>Condition:</span>
          <span className="font-mono text-amber-300 uppercase px-1 rounded bg-amber-500/10">
            {data.config?.condition || 'contains'}
          </span>
        </div>
        <div className="p-1.5 rounded bg-black/20 border border-white/5 font-mono text-[10px] text-slate-300 truncate">
          matches: <span className="text-amber-200">{data.value || data.config?.threshold || 'urgent'}</span>
        </div>
      </div>

      {/* Two Branch Handles with visual badges */}
      <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
        <div className="relative flex items-center justify-end pr-3">
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
              selectedBranch === 'true'
                ? 'bg-emerald-500 text-black font-extrabold'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            TRUE (Match)
          </span>
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            style={{ top: '35%' }}
            className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
          />
        </div>

        <div className="relative flex items-center justify-end pr-3">
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
              selectedBranch === 'false'
                ? 'bg-red-500 text-white font-extrabold'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            FALSE (Else)
          </span>
          <Handle
            id="false"
            type="source"
            position={Position.Right}
            style={{ top: '75%' }}
            className="!w-3 !h-3 !bg-red-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
          />
        </div>
      </div>
    </div>
  );
};

// 5. Webhook / HTTP Request Node
const WebhookNode = ({ data, selected }) => {
  const isRunning = data.executionStatus === 'running';
  const isSuccess = data.executionStatus === 'completed';
  const isFailed = data.executionStatus === 'failed';

  return (
    <div
      className={`relative min-w-[240px] max-w-[280px] rounded-xl border backdrop-blur-md p-3.5 transition-all shadow-lg ${
        selected ? 'border-blue-400 shadow-blue-500/20' : 'border-blue-500/40 hover:border-blue-400/70'
      } ${
        isRunning
          ? 'ring-2 ring-blue-400 animate-pulse bg-blue-950/40'
          : isSuccess
          ? 'border-emerald-500 bg-emerald-950/30'
          : isFailed
          ? 'border-red-500 bg-red-950/30'
          : 'bg-slate-900/90'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-semibold">
              HTTP / API
            </span>
            <h4 className="text-xs font-semibold text-white leading-tight">{data.label || 'HTTP Request'}</h4>
          </div>
        </div>
        {isRunning && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
        {isSuccess && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
        {isFailed && <XCircle className="w-3.5 h-3.5 text-red-400" />}
      </div>

      <div className="text-[11px] text-slate-300 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            {data.config?.method || 'POST'}
          </span>
          <span className="text-[10px] text-slate-400 truncate font-mono">
            {data.value || data.config?.url || 'https://api.example.com'}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

// 6. Slack / Discord Notification Node
const SlackNode = ({ data, selected }) => {
  const isRunning = data.executionStatus === 'running';
  const isSuccess = data.executionStatus === 'completed';
  const isFailed = data.executionStatus === 'failed';

  return (
    <div
      className={`relative min-w-[220px] max-w-[260px] rounded-xl border backdrop-blur-md p-3.5 transition-all shadow-lg ${
        selected ? 'border-pink-400 shadow-pink-500/20' : 'border-pink-500/40 hover:border-pink-400/70'
      } ${
        isRunning
          ? 'ring-2 ring-pink-400 animate-pulse bg-pink-950/40'
          : isSuccess
          ? 'border-emerald-500 bg-emerald-950/30'
          : isFailed
          ? 'border-red-500 bg-red-950/30'
          : 'bg-slate-900/90'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-pink-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-pink-400 font-semibold">
              SLACK / DISCORD
            </span>
            <h4 className="text-xs font-semibold text-white leading-tight">{data.label || 'Send Alert'}</h4>
          </div>
        </div>
        {isRunning && <Loader2 className="w-3.5 h-3.5 text-pink-400 animate-spin" />}
        {isSuccess && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
        {isFailed && <XCircle className="w-3.5 h-3.5 text-red-400" />}
      </div>

      <div className="text-[11px] text-slate-300 space-y-1">
        <div className="text-[10px] text-slate-400">
          Channel: <span className="text-pink-300 font-mono">{data.config?.channel || '#alerts'}</span>
        </div>
        <p className="text-[10px] text-slate-300 line-clamp-1 italic">
          "{data.config?.message || data.value || 'Notification message'}"
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-pink-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

// 7. Email Node
const EmailNode = ({ data, selected }) => {
  const isRunning = data.executionStatus === 'running';
  const isSuccess = data.executionStatus === 'completed';
  const isFailed = data.executionStatus === 'failed';

  return (
    <div
      className={`relative min-w-[220px] max-w-[260px] rounded-xl border backdrop-blur-md p-3.5 transition-all shadow-lg ${
        selected ? 'border-orange-400 shadow-orange-500/20' : 'border-orange-500/40 hover:border-orange-400/70'
      } ${
        isRunning
          ? 'ring-2 ring-orange-400 animate-pulse bg-orange-950/40'
          : isSuccess
          ? 'border-emerald-500 bg-emerald-950/30'
          : isFailed
          ? 'border-red-500 bg-red-950/30'
          : 'bg-slate-900/90'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-orange-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-semibold">EMAIL</span>
            <h4 className="text-xs font-semibold text-white leading-tight">{data.label || 'Send Email'}</h4>
          </div>
        </div>
        {isRunning && <Loader2 className="w-3.5 h-3.5 text-orange-400 animate-spin" />}
        {isSuccess && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
        {isFailed && <XCircle className="w-3.5 h-3.5 text-red-400" />}
      </div>

      <div className="text-[11px] text-slate-300 space-y-1">
        <div className="text-[10px] text-slate-400 truncate">
          To: <span className="text-orange-300 font-mono">{data.config?.to || 'user@example.com'}</span>
        </div>
        <p className="text-[10px] text-slate-300 truncate">
          Subject: {data.config?.subject || 'Workflow Alert'}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-orange-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

// 8. Custom Code Node
const CodeNode = ({ data, selected }) => {
  const isRunning = data.executionStatus === 'running';
  const isSuccess = data.executionStatus === 'completed';
  const isFailed = data.executionStatus === 'failed';

  return (
    <div
      className={`relative min-w-[220px] max-w-[260px] rounded-xl border backdrop-blur-md p-3.5 transition-all shadow-lg ${
        selected ? 'border-yellow-400 shadow-yellow-500/20' : 'border-yellow-500/40 hover:border-yellow-400/70'
      } ${
        isRunning
          ? 'ring-2 ring-yellow-400 animate-pulse bg-yellow-950/40'
          : isSuccess
          ? 'border-emerald-500 bg-emerald-950/30'
          : isFailed
          ? 'border-red-500 bg-red-950/30'
          : 'bg-slate-900/90'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-yellow-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <Code className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-yellow-400 font-semibold">
              JAVASCRIPT
            </span>
            <h4 className="text-xs font-semibold text-white leading-tight">{data.label || 'Code Transform'}</h4>
          </div>
        </div>
        {isRunning && <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />}
        {isSuccess && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
        {isFailed && <XCircle className="w-3.5 h-3.5 text-red-400" />}
      </div>

      <div className="text-[10px] font-mono text-yellow-200/90 bg-black/40 p-1.5 rounded border border-white/5 truncate">
        {data.config?.codeSnippet || data.value || 'return input;'}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-yellow-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

// 9. Agent Node
const AgentNode = ({ data, selected }) => {
  const isRunning = data.executionStatus === 'running';
  const isSuccess = data.executionStatus === 'completed';
  const isFailed = data.executionStatus === 'failed';

  return (
    <div
      className={`relative min-w-[220px] max-w-[260px] rounded-xl border backdrop-blur-md p-3.5 transition-all shadow-lg ${
        selected ? 'border-indigo-400 shadow-indigo-500/20' : 'border-indigo-500/40 hover:border-indigo-400/70'
      } ${
        isRunning
          ? 'ring-2 ring-indigo-400 animate-pulse bg-indigo-950/40'
          : isSuccess
          ? 'border-emerald-500 bg-emerald-950/30'
          : isFailed
          ? 'border-red-500 bg-red-950/30'
          : 'bg-slate-900/90'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />

      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-semibold">
              AI AGENT
            </span>
            <h4 className="text-xs font-semibold text-white leading-tight">{data.label || 'Run Agent'}</h4>
          </div>
        </div>
        {isRunning && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
        {isSuccess && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
        {isFailed && <XCircle className="w-3.5 h-3.5 text-red-400" />}
      </div>

      <p className="text-[11px] text-slate-300 line-clamp-2 bg-black/20 p-1.5 rounded border border-white/5">
        Task: {data.value || data.config?.task || 'Delegate task to autonomous agent...'}
      </p>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

// Node Types Map
const nodeTypes = {
  triggerNode: TriggerNode,
  'trigger.manual': TriggerNode,
  'trigger.webhook': TriggerNode,
  'trigger.cron': TriggerNode,
  manual: TriggerNode,
  webhook: TriggerNode,
  cron: TriggerNode,

  llmNode: LLMNode,
  'ai.llm': LLMNode,
  prompt: LLMNode,

  ragNode: RAGNode,
  'ai.rag': RAGNode,
  rag_search: RAGNode,

  routerNode: RouterNode,
  'logic.if': RouterNode,
  'logic.switch': RouterNode,
  filter: RouterNode,
  router: RouterNode,

  webhookNode: WebhookNode,
  'integration.http': WebhookNode,
  http: WebhookNode,

  slackNode: SlackNode,
  'integration.slack': SlackNode,
  slack: SlackNode,
  discord: SlackNode,

  emailNode: EmailNode,
  'integration.email': EmailNode,
  email: EmailNode,

  codeNode: CodeNode,
  'utility.code': CodeNode,
  'utility.transform': CodeNode,
  code: CodeNode,

  agentNode: AgentNode,
  'ai.agent': AgentNode,
  agent: AgentNode,
};

// ─── MAIN VISUAL WORKFLOW EDITOR COMPONENT ────────────────────────────────────

export default function VisualWorkflowEditor({
  workflow,
  onSave,
  onRun,
  isRunning = false,
  latestExecution = null,
}) {
  // Convert workflow to nodes and edges
  const initialData = useMemo(() => {
    // 1. If workflow has definition.nodes, use them
    let def = null;
    try {
      def = typeof workflow?.definition === 'string' ? JSON.parse(workflow.definition) : workflow?.definition;
    } catch {}

    if (def && Array.isArray(def.nodes) && def.nodes.length > 0) {
      return {
        nodes: def.nodes,
        edges: def.edges || [],
      };
    }

    // 2. Fallback: Convert linear steps to a visual node DAG
    let steps = [];
    try {
      steps = typeof workflow?.steps === 'string' ? JSON.parse(workflow.steps) : workflow?.steps || [];
    } catch {}

    const triggerNode = {
      id: 'node_trigger',
      type: 'triggerNode',
      position: { x: 50, y: 150 },
      data: {
        label: `${workflow?.name || 'Workflow'} Trigger`,
        type: 'trigger_' + (workflow?.trigger_type || 'manual'),
        triggerType: workflow?.trigger_type || 'manual',
        config: {
          cronExpression: workflow?.cron_expression,
          webhookSecret: workflow?.webhook_secret,
        },
      },
    };

    const generatedNodes = [triggerNode];
    const generatedEdges = [];
    let prevNodeId = 'node_trigger';

    steps.forEach((step, idx) => {
      const stepType = step.type || 'prompt';
      const nodeId = `node_${step.id || idx + 1}`;
      let reactNodeType = 'llmNode';

      if (stepType === 'rag_search') reactNodeType = 'ragNode';
      else if (stepType === 'filter' || stepType === 'router') reactNodeType = 'routerNode';
      else if (stepType === 'webhook') reactNodeType = 'webhookNode';
      else if (stepType === 'slack') reactNodeType = 'slackNode';
      else if (stepType === 'email') reactNodeType = 'emailNode';
      else if (stepType === 'code') reactNodeType = 'codeNode';
      else if (stepType === 'agent') reactNodeType = 'agentNode';

      generatedNodes.push({
        id: nodeId,
        type: reactNodeType,
        position: { x: 340 + idx * 300, y: 150 + (idx % 2 === 0 ? 0 : 50) },
        data: {
          label: step.name || `Step ${idx + 1}: ${stepType.toUpperCase()}`,
          type: stepType,
          value: step.value || '',
          config: step.config || {},
        },
      });

      generatedEdges.push({
        id: `e_${prevNodeId}_${nodeId}`,
        source: prevNodeId,
        target: nodeId,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
        style: { stroke: '#38bdf8', strokeWidth: 2 },
      });

      prevNodeId = nodeId;
    });

    return {
      nodes: generatedNodes,
      edges: generatedEdges,
    };
  }, [workflow]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges);

  // Active / Selected Node State
  const [selectedNode, setSelectedNode] = useState(null);
  const [showNodePalette, setShowNodePalette] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Sync execution status with nodes
  useEffect(() => {
    if (!latestExecution) return;

    const stepResults = latestExecution.step_results || [];
    const resultMap = new Map();
    stepResults.forEach((res) => {
      const idKey = res.nodeId || (res.stepId ? `node_${res.stepId}` : null);
      if (idKey) resultMap.set(idKey, res);
    });

    setNodes((nds) =>
      nds.map((n) => {
        const res = resultMap.get(n.id);
        if (res) {
          return {
            ...n,
            data: {
              ...n.data,
              executionStatus: res.status,
              output: res.output,
              input: res.input,
              durationMs: res.durationMs,
              error: res.error,
            },
          };
        }
        if (isRunning) {
          return { ...n, data: { ...n.data, executionStatus: 'running' } };
        }
        return n;
      })
    );
  }, [latestExecution, isRunning, setNodes]);

  // Connect edges
  const onConnect = useCallback(
    (params) => {
      const isTrueBranch = params.sourceHandle === 'true';
      const isFalseBranch = params.sourceHandle === 'false';

      const edgeColor = isTrueBranch ? '#10b981' : isFalseBranch ? '#ef4444' : '#38bdf8';
      const newEdge = {
        ...params,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
        style: { stroke: edgeColor, strokeWidth: 2 },
        label: isTrueBranch ? 'True' : isFalseBranch ? 'False' : undefined,
        labelStyle: { fill: edgeColor, fontWeight: 700, fontSize: 10 },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Add new node from palette
  const handleAddNode = (type, reactNodeType, defaultLabel, defaultConfig = {}) => {
    const newId = `node_${Date.now()}`;
    const xPos = selectedNode ? selectedNode.position.x + 300 : 400;
    const yPos = selectedNode ? selectedNode.position.y : 200;

    const newNode = {
      id: newId,
      type: reactNodeType,
      position: { x: xPos, y: yPos },
      data: {
        label: defaultLabel,
        type,
        value: '',
        config: defaultConfig,
      },
    };

    setNodes((nds) => [...nds, newNode]);

    // Connect from selected node if exists
    if (selectedNode) {
      setEdges((eds) => [
        ...eds,
        {
          id: `e_${selectedNode.id}_${newId}`,
          source: selectedNode.id,
          target: newId,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
          style: { stroke: '#38bdf8', strokeWidth: 2 },
        },
      ]);
    }

    setShowNodePalette(false);
    setSelectedNode(newNode);
  };

  // Delete selected node
  const handleDeleteSelected = () => {
    if (!selectedNode || selectedNode.type === 'triggerNode') return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  // Update selected node data
  const updateNodeData = (updates) => {
    if (!selectedNode) return;
    const updated = {
      ...selectedNode,
      data: {
        ...selectedNode.data,
        ...updates,
      },
    };
    setSelectedNode(updated);
    setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? updated : n)));
  };

  // Save graph definition
  const handleSaveGraph = () => {
    // Compile linear steps from nodes for backward compatibility
    const compiledSteps = nodes
      .filter((n) => n.type !== 'triggerNode')
      .map((n) => ({
        id: n.id,
        type: n.data.type || 'prompt',
        name: n.data.label,
        value: n.data.value,
        config: n.data.config,
      }));

    const definition = {
      nodes,
      edges,
      updatedAt: new Date().toISOString(),
    };

    if (onSave) {
      onSave({
        steps: compiledSteps,
        definition,
      });
    }
  };

  // Node catalog
  const NODE_CATALOG = [
    {
      category: 'AI & Intelligence',
      items: [
        {
          type: 'prompt',
          reactNodeType: 'llmNode',
          label: 'LLM Prompt Generator',
          desc: 'Run Ollama / LLaMA 3 models with dynamic variables',
          icon: <Sparkles className="w-4 h-4 text-purple-400" />,
          defaultConfig: { model: 'llama3:8b', temperature: 0.7 },
        },
        {
          type: 'rag_search',
          reactNodeType: 'ragNode',
          label: 'RAG Knowledge Search',
          desc: 'Query vector embeddings across workspace documents',
          icon: <Database className="w-4 h-4 text-cyan-400" />,
          defaultConfig: { maxResults: 3 },
        },
        {
          type: 'agent',
          reactNodeType: 'agentNode',
          label: 'Autonomous AI Agent',
          desc: 'Delegate goal-driven actions to an AI agent',
          icon: <Bot className="w-4 h-4 text-indigo-400" />,
          defaultConfig: { task: '' },
        },
      ],
    },
    {
      category: 'Control Flow & Logic',
      items: [
        {
          type: 'router',
          reactNodeType: 'routerNode',
          label: 'If / Condition Router',
          desc: 'Branch execution paths into True and False routes',
          icon: <GitBranch className="w-4 h-4 text-amber-400" />,
          defaultConfig: { condition: 'contains', threshold: '' },
        },
        {
          type: 'code',
          reactNodeType: 'codeNode',
          label: 'JavaScript Transform',
          desc: 'Transform data using custom JS snippets',
          icon: <Code className="w-4 h-4 text-yellow-400" />,
          defaultConfig: { codeSnippet: 'return input;' },
        },
      ],
    },
    {
      category: 'Integrations & Webhooks',
      items: [
        {
          type: 'webhook',
          reactNodeType: 'webhookNode',
          label: 'HTTP / API Request',
          desc: 'Send GET, POST, or PUT webhooks to external services',
          icon: <Globe className="w-4 h-4 text-blue-400" />,
          defaultConfig: { method: 'POST', url: 'https://httpbin.org/post' },
        },
        {
          type: 'slack',
          reactNodeType: 'slackNode',
          label: 'Slack / Discord Alert',
          desc: 'Post alerts into channels or incoming webhooks',
          icon: <MessageSquare className="w-4 h-4 text-pink-400" />,
          defaultConfig: { channel: '#alerts' },
        },
        {
          type: 'email',
          reactNodeType: 'emailNode',
          label: 'Transactional Email',
          desc: 'Dispatch emails to customers or administrators',
          icon: <Mail className="w-4 h-4 text-orange-400" />,
          defaultConfig: { to: 'support@xarwiz.com', subject: 'Workflow Notification' },
        },
      ],
    },
  ];

  return (
    <div className="relative w-full h-[720px] rounded-2xl overflow-hidden border border-white/10 bg-[#070b14] shadow-2xl flex">
      {/* ─── CANVAS MAIN WORKSPACE ───────────────────────────────────────── */}
      <div className="flex-1 relative h-full">
        {/* Top Control Bar */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-2 pr-3 border-r border-white/10">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-semibold text-white tracking-wide">Visual Canvas</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              n8n / Make Engine
            </span>
          </div>

          <button
            onClick={() => setShowNodePalette(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition shadow-md shadow-cyan-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Action Node</span>
          </button>

          <button
            onClick={handleSaveGraph}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition border border-white/10"
          >
            <span>Save Graph</span>
          </button>

          <button
            onClick={onRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md shadow-emerald-600/30 disabled:opacity-50"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isRunning ? 'Executing...' : 'Run Pipeline'}</span>
          </button>
        </div>

        {/* ReactFlow Canvas */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          className="bg-[#090d16]"
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls className="!bg-slate-900/90 !border-white/10 !rounded-xl !overflow-hidden !shadow-lg [&>button]:!bg-transparent [&>button]:!border-white/10 [&>button]:!text-slate-300 hover:[&>button]:!bg-white/10" />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'triggerNode') return '#10b981';
              if (node.type === 'llmNode') return '#c084fc';
              if (node.type === 'ragNode') return '#22d3ee';
              if (node.type === 'routerNode') return '#fbbf24';
              if (node.type === 'webhookNode') return '#60a5fa';
              return '#94a3b8';
            }}
            className="!bg-slate-950/80 !border-white/10 !rounded-xl !overflow-hidden"
          />
        </ReactFlow>
      </div>

      {/* ─── NODE PALETTE MODAL / SIDEBAR ─────────────────────────────────── */}
      {showNodePalette && (
        <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-cyan-400" /> Add Workflow Node
                </h3>
                <p className="text-xs text-slate-400">Choose an action or intelligence node to insert into your DAG pipeline.</p>
              </div>
              <button
                onClick={() => setShowNodePalette(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-white/10 bg-slate-950/50">
              <input
                type="text"
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
                placeholder="Search nodes (e.g. LLM, webhook, router, slack)..."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              {NODE_CATALOG.map((group) => {
                const filteredItems = group.items.filter(
                  (item) =>
                    item.label.toLowerCase().includes(paletteSearch.toLowerCase()) ||
                    item.desc.toLowerCase().includes(paletteSearch.toLowerCase())
                );
                if (filteredItems.length === 0) return null;

                return (
                  <div key={group.category} className="space-y-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                      {group.category}
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      {filteredItems.map((item) => (
                        <button
                          key={item.label}
                          onClick={() => handleAddNode(item.type, item.reactNodeType, item.label, item.defaultConfig)}
                          className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-white/5 hover:border-cyan-500/40 text-left transition group"
                        >
                          <div className="p-2 rounded-lg bg-white/5 border border-white/10 group-hover:scale-110 transition-transform">
                            {item.icon}
                          </div>
                          <div>
                            <h5 className="text-xs font-semibold text-white group-hover:text-cyan-400 transition">
                              {item.label}
                            </h5>
                            <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed mt-0.5">
                              {item.desc}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── NODE INSPECTOR / CONFIGURATION DRAWER ────────────────────────── */}
      {selectedNode && (
        <div className="w-80 h-full border-l border-white/10 bg-slate-900/95 backdrop-blur-md p-4 flex flex-col justify-between overflow-y-auto z-20">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  NODE CONFIG
                </span>
                <h3 className="text-sm font-bold text-white truncate">{selectedNode.data?.label || selectedNode.id}</h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Label input */}
            <div>
              <label className="text-[11px] font-medium text-slate-300 block mb-1">Node Title</label>
              <input
                type="text"
                value={selectedNode.data?.label || ''}
                onChange={(e) => updateNodeData({ label: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500 font-medium"
              />
            </div>

            {/* Config Fields by Node Type */}
            {selectedNode.type === 'triggerNode' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1">Trigger Type</label>
                  <select
                    value={selectedNode.data?.triggerType || 'manual'}
                    onChange={(e) => updateNodeData({ triggerType: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white"
                  >
                    <option value="manual">Manual Trigger (UI / API)</option>
                    <option value="webhook">Inbound Webhook</option>
                    <option value="cron">Schedule (Cron)</option>
                    <option value="event">Platform Event</option>
                  </select>
                </div>
                {selectedNode.data?.triggerType === 'cron' && (
                  <div>
                    <label className="text-[11px] font-medium text-slate-300 block mb-1">Cron Expression</label>
                    <input
                      type="text"
                      placeholder="0 9 * * *"
                      value={selectedNode.data?.config?.cronExpression || ''}
                      onChange={(e) =>
                        updateNodeData({
                          config: { ...selectedNode.data.config, cronExpression: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white font-mono"
                    />
                  </div>
                )}
              </div>
            )}

            {selectedNode.type === 'llmNode' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1">Model</label>
                  <select
                    value={selectedNode.data?.config?.model || 'llama3:8b'}
                    onChange={(e) =>
                      updateNodeData({
                        config: { ...selectedNode.data.config, model: e.target.value },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white"
                  >
                    <option value="llama3:8b">Meta LLaMA 3 (8B)</option>
                    <option value="mistral">Mistral 7B Instruct</option>
                    <option value="deepseek-coder">DeepSeek Coder</option>
                    <option value="qwen2.5">Qwen 2.5</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1">User Prompt</label>
                  <textarea
                    rows={4}
                    value={selectedNode.data?.value || ''}
                    onChange={(e) => updateNodeData({ value: e.target.value })}
                    placeholder="Analyze: {{prev.output}}..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Tip: Use <code className="text-cyan-400 font-mono">&#123;&#123;prev.output&#125;&#125;</code> or{' '}
                    <code className="text-cyan-400 font-mono">&#123;&#123;trigger.payload.field&#125;&#125;</code>
                  </p>
                </div>
              </div>
            )}

            {selectedNode.type === 'routerNode' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1">Condition Rule</label>
                  <select
                    value={selectedNode.data?.config?.condition || 'contains'}
                    onChange={(e) =>
                      updateNodeData({
                        config: { ...selectedNode.data.config, condition: e.target.value },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white font-mono"
                  >
                    <option value="contains">Contains substring</option>
                    <option value="equals">Equals strictly</option>
                    <option value="not_equals">Does not equal</option>
                    <option value="greater_than">Numeric Greater Than (&gt;)</option>
                    <option value="less_than">Numeric Less Than (&lt;)</option>
                    <option value="not_empty">Is not empty</option>
                    <option value="regex">Regular Expression match</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1">Target Value</label>
                  <input
                    type="text"
                    value={selectedNode.data?.value || selectedNode.data?.config?.threshold || ''}
                    onChange={(e) =>
                      updateNodeData({
                        value: e.target.value,
                        config: { ...selectedNode.data.config, threshold: e.target.value },
                      })
                    }
                    placeholder="e.g. urgent, 100, true"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white font-mono"
                  />
                </div>
              </div>
            )}

            {selectedNode.type === 'webhookNode' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1">HTTP Method</label>
                  <select
                    value={selectedNode.data?.config?.method || 'POST'}
                    onChange={(e) =>
                      updateNodeData({
                        config: { ...selectedNode.data.config, method: e.target.value },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white font-mono"
                  >
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-300 block mb-1">URL Endpoint</label>
                  <input
                    type="text"
                    value={selectedNode.data?.value || selectedNode.data?.config?.url || ''}
                    onChange={(e) =>
                      updateNodeData({
                        value: e.target.value,
                        config: { ...selectedNode.data.config, url: e.target.value },
                      })
                    }
                    placeholder="https://api.domain.com/v1/webhook"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* Run Output Telemetry Viewer */}
            {selectedNode.data?.output !== undefined && (
              <div className="pt-3 border-t border-white/10 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  LATEST RUN OUTPUT ({selectedNode.data?.durationMs || 0}ms)
                </span>
                <pre className="p-2 rounded bg-black/60 border border-white/10 text-[10px] text-emerald-300 font-mono max-h-36 overflow-y-auto whitespace-pre-wrap">
                  {typeof selectedNode.data.output === 'object'
                    ? JSON.stringify(selectedNode.data.output, null, 2)
                    : String(selectedNode.data.output)}
                </pre>
              </div>
            )}
          </div>

          {/* Delete Button */}
          {selectedNode.type !== 'triggerNode' && (
            <div className="pt-4 border-t border-white/10">
              <button
                onClick={handleDeleteSelected}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/20 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Node</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
