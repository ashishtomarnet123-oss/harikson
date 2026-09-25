'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  Node,
  Edge,
  Connection,
} from '@xyflow/react';
import {
  Play,
  Plus,
  Trash2,
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
  Bot,
} from 'lucide-react';

// ─── CUSTOM NODE DEFINITIONS ──────────────────────────────────────────────────

// 1. Trigger Node
const TriggerNode = ({ data, selected }: { data: any; selected?: boolean }) => {
  const isRunning = data.executionStatus === 'running';
  const isSuccess = data.executionStatus === 'completed';
  const isFailed = data.executionStatus === 'failed';

  const triggerIcons: Record<string, React.ReactNode> = {
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

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />
    </div>
  );
};

// 2. LLM Node
const LLMNode = ({ data, selected }: { data: any; selected?: boolean }) => {
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

// 3. Router / Branching Node (If / Else)
const RouterNode = ({ data, selected }: { data: any; selected?: boolean }) => {
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

      {/* Two Branch Handles */}
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

// 4. Webhook Node
const WebhookNode = ({ data, selected }: { data: any; selected?: boolean }) => {
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

  routerNode: RouterNode,
  'logic.if': RouterNode,
  'logic.switch': RouterNode,
  filter: RouterNode,
  router: RouterNode,

  webhookNode: WebhookNode,
  'integration.http': WebhookNode,
  http: WebhookNode,
};

// ─── ADMIN VISUAL WORKFLOW EDITOR ─────────────────────────────────────────────

interface VisualWorkflowEditorProps {
  workflow: any;
  onSave?: (data: { steps: any[]; definition: any }) => void;
  onRun?: () => void;
  isRunning?: boolean;
  latestExecution?: any;
}

export default function AdminVisualWorkflowEditor({
  workflow,
  onSave,
  onRun,
  isRunning = false,
  latestExecution = null,
}: VisualWorkflowEditorProps) {
  // Convert workflow to nodes and edges
  const initialData = useMemo(() => {
    let def = null;
    try {
      def = typeof workflow?.definition === 'string' ? JSON.parse(workflow.definition) : workflow?.definition;
    } catch {}

    if (def && Array.isArray(def.nodes) && def.nodes.length > 0) {
      return {
        nodes: def.nodes as Node[],
        edges: (def.edges || []) as Edge[],
      };
    }

    let steps: any[] = [];
    try {
      steps = typeof workflow?.steps === 'string' ? JSON.parse(workflow.steps) : workflow?.steps || [];
    } catch {}

    const triggerNode: Node = {
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

    const generatedNodes: Node[] = [triggerNode];
    const generatedEdges: Edge[] = [];
    let prevNodeId = 'node_trigger';

    steps.forEach((step, idx) => {
      const stepType = step.type || 'prompt';
      const nodeId = `node_${step.id || idx + 1}`;
      let reactNodeType = 'llmNode';

      if (stepType === 'filter' || stepType === 'router') reactNodeType = 'routerNode';
      else if (stepType === 'webhook') reactNodeType = 'webhookNode';

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
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Sync execution status with nodes
  useEffect(() => {
    if (!latestExecution) return;

    const stepResults = latestExecution.step_results || [];
    const resultMap = new Map<string, any>();
    stepResults.forEach((res: any) => {
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
        return n;
      })
    );
  }, [latestExecution, setNodes]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const isTrueBranch = connection.sourceHandle === 'true';
      const isFalseBranch = connection.sourceHandle === 'false';
      const edgeColor = isTrueBranch ? '#10b981' : isFalseBranch ? '#ef4444' : '#38bdf8';

      const newEdge: Edge = {
        ...connection,
        id: `e_${connection.source}_${connection.target}_${Date.now()}`,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
        style: { stroke: edgeColor, strokeWidth: 2 },
        label: isTrueBranch ? 'True' : isFalseBranch ? 'False' : undefined,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const handleSaveGraph = () => {
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

  return (
    <div className="relative w-full h-[640px] rounded-2xl overflow-hidden border border-white/10 bg-[#070b14] shadow-2xl flex">
      <div className="flex-1 relative h-full">
        {/* Top Control Bar */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-2 pr-3 border-r border-white/10">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-semibold text-white tracking-wide">Admin DAG Canvas</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Interactive
            </span>
          </div>

          <button
            onClick={handleSaveGraph}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition shadow-md shadow-cyan-600/20"
          >
            <span>Save Canvas</span>
          </button>

          {onRun && (
            <button
              onClick={onRun}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md shadow-emerald-600/30 disabled:opacity-50"
            >
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isRunning ? 'Executing...' : 'Run Pipeline'}</span>
            </button>
          )}
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-[#090d16]"
        >
          <Background color="#1e293b" gap={20} size={1} />
          <Controls className="!bg-slate-900/90 !border-white/10 !rounded-xl !overflow-hidden !shadow-lg [&>button]:!bg-transparent [&>button]:!border-white/10 [&>button]:!text-slate-300 hover:[&>button]:!bg-white/10" />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === 'triggerNode') return '#10b981';
              if (node.type === 'llmNode') return '#c084fc';
              if (node.type === 'routerNode') return '#fbbf24';
              return '#60a5fa';
            }}
            className="!bg-slate-950/80 !border-white/10 !rounded-xl !overflow-hidden"
          />
        </ReactFlow>
      </div>

      {/* Selected Node Output Drawer */}
      {selectedNode && (
        <div className="w-72 h-full border-l border-white/10 bg-slate-900/95 backdrop-blur-md p-4 overflow-y-auto z-20">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">NODE</span>
              <h3 className="text-xs font-bold text-white truncate">{String(selectedNode.data?.label || selectedNode.id)}</h3>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] text-slate-400 block">Type:</span>
              <span className="text-xs font-mono text-white px-2 py-0.5 rounded bg-white/5 border border-white/10 inline-block mt-0.5">
                {String(selectedNode.type)}
              </span>
            </div>

            {selectedNode.data?.output !== undefined && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
                  Node Output ({Number(selectedNode.data?.durationMs || 0)}ms)
                </span>
                <pre className="p-2 rounded bg-black/60 border border-white/10 text-[10px] text-emerald-300 font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {typeof selectedNode.data.output === 'object'
                    ? JSON.stringify(selectedNode.data.output, null, 2)
                    : String(selectedNode.data.output)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
