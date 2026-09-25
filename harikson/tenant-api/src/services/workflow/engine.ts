import { pool, executeTenantQuery } from '../../db/pool.js';
import { Logger } from '../../observability/logger.js';
import {
  IWorkflowStep,
  IWorkflowExecutionContext,
  IStepExecutionResult,
  IWorkflowGraph,
  IWorkflowNode,
  TriggerType,
} from './types.js';
import { ExpressionEngine } from './expression/engine.js';
import { WorkflowCompiler } from './compiler/compiler.js';
import { WorkflowVersionService } from './version.service.js';
import { NodeRegistry, initializeNodeRegistry } from './nodes/index.js';
import { WorkflowEventEmitter } from './telemetry/events.js';

// Ensure nodes are registered
initializeNodeRegistry();

export class WorkflowEngine {
  /**
   * Interpolate variable strings safely using the sandboxed ExpressionEngine
   */
  public static interpolate(
    template: string,
    context: {
      trigger?: { payload: Record<string, any> };
      triggerPayload?: Record<string, any>;
      prev?: { output: any };
      steps?: IStepExecutionResult[];
      variables?: Record<string, any>;
      nodesOutputs?: Record<string, any>;
      [key: string]: any;
    }
  ): string {
    const execContext: IWorkflowExecutionContext = {
      tenantId: context.tenantId || '00000000-0000-0000-0000-000000000000',
      workflowId: context.workflowId || 'test',
      executionId: context.executionId || 'test',
      triggerType: (context.triggerType as TriggerType) || 'manual',
      triggerPayload: context.triggerPayload || context.trigger?.payload || {},
      variables: context.variables || {},
      stepsResults: context.steps || [],
      nodesOutputs: context.nodesOutputs || {},
    };

    return ExpressionEngine.interpolate(template, execContext);
  }

  /**
   * Execute a single step / node within workflow context
   */
  public static async executeStep(
    step: IWorkflowStep,
    stepIndex: number,
    context: IWorkflowExecutionContext,
    incomingData?: any
  ): Promise<IStepExecutionResult> {
    const startTime = Date.now();
    const startedAt = new Date().toISOString();
    const nodeId = typeof step.id === 'string' ? step.id : `node_${step.id}`;

    // Emit node.started telemetry event
    WorkflowEventEmitter.emit({
      event: 'node.started',
      executionId: context.executionId,
      workflowId: context.workflowId,
      tenantId: context.tenantId,
      nodeId,
      nodeType: step.type,
      timestamp: startedAt,
    });

    const nodeInput = {
      nodeId,
      nodeType: step.type,
      config: step.config || {},
      incomingData,
      previousNodesOutput: context.nodesOutputs,
      triggerPayload: context.triggerPayload,
    };

    let stepStatus: 'completed' | 'failed' | 'skipped' = 'completed';
    let stepOutput: any = null;
    let stepError: string | undefined = undefined;

    try {
      const result = await NodeRegistry.execute(nodeInput, context);
      stepStatus = result.status === 'success' ? 'completed' : (result.status as any);
      stepOutput = result.data;
      stepError = result.error;
    } catch (err: any) {
      stepStatus = 'failed';
      stepError = err.message || 'Node execution failed unexpectedly';
      stepOutput = { error: stepError };
      Logger.error(`[WorkflowEngine] Step ${stepIndex} (${step.type}) failed`, err);
    }

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    // Emit node completion or failure event
    WorkflowEventEmitter.emit({
      event: stepStatus === 'completed' ? 'node.completed' : 'node.failed',
      executionId: context.executionId,
      workflowId: context.workflowId,
      tenantId: context.tenantId,
      nodeId,
      nodeType: step.type,
      timestamp: completedAt,
      data: { durationMs, output: stepOutput, error: stepError },
    });

    // Record durable checkpoint in workflow_node_executions table if executionId is valid UUID
    if (context.executionId && context.executionId.length === 36) {
      try {
        await executeTenantQuery(context.tenantId, (client) =>
          client.query(
            `INSERT INTO workflow_node_executions (
               execution_id, workflow_id, workflow_version_id, tenant_id, node_id, node_type,
               status, input, output, error, duration_ms, started_at, finished_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (execution_id, node_id) DO UPDATE
             SET status = EXCLUDED.status,
                 output = EXCLUDED.output,
                 error = EXCLUDED.error,
                 duration_ms = EXCLUDED.duration_ms,
                 finished_at = EXCLUDED.finished_at`,
            [
              context.executionId,
              context.workflowId,
              context.workflowVersionId || null,
              context.tenantId,
              nodeId,
              step.type,
              stepStatus === 'completed' ? 'success' : stepStatus,
              JSON.stringify(nodeInput),
              JSON.stringify(stepOutput || {}),
              stepError ? JSON.stringify({ message: stepError }) : null,
              durationMs,
              startedAt,
              completedAt,
            ]
          )
        );
      } catch (dbErr) {
        // Log error but don't disrupt workflow execution pipeline
        Logger.warn(`[WorkflowEngine] Could not persist node checkpoint: ${dbErr}`);
      }
    }

    return {
      stepId: step.id || stepIndex,
      nodeId,
      stepIndex,
      type: step.type,
      status: stepStatus,
      startedAt,
      completedAt,
      durationMs,
      input: nodeInput,
      output: stepOutput,
      error: stepError,
    };
  }

  /**
   * Run full workflow end-to-end (Supports DAG graph, versioning, and linear steps)
   */
  public static async executeWorkflow(
    workflowId: string,
    triggerType: TriggerType = 'manual',
    triggerPayload: Record<string, any> = {},
    tenantIdOverride?: string,
    existingExecutionId?: string
  ): Promise<{ executionId: string; status: string; stepResults: IStepExecutionResult[]; durationMs: number }> {
    const startTime = Date.now();

    // 1. Fetch workflow metadata
    const wfRes = await pool.query(`SELECT * FROM workflows WHERE id = $1`, [workflowId]);
    if (!wfRes.rows.length) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const workflow = wfRes.rows[0];
    const tenantId = tenantIdOverride || workflow.tenant_id;

    // 2. Fetch published version or fall back to draft/definition
    let version = await WorkflowVersionService.getPublishedVersion(tenantId, workflowId);
    let graph: IWorkflowGraph;

    if (version) {
      graph = version.definition;
    } else {
      // Use workflow's current definition or legacy steps
      graph = WorkflowVersionService.normalizeToGraph(workflow.definition || workflow.steps);
    }

    // 3. Initialize or retrieve execution record
    let executionId = existingExecutionId;
    if (!executionId) {
      const initExec = await pool.query(
        `INSERT INTO workflow_executions (
           workflow_id, workflow_version_id, tenant_id, status, trigger_type, trigger_payload, started_at
         ) VALUES ($1, $2, $3, 'running', $4, $5, NOW()) RETURNING id`,
        [workflowId, version?.id || null, tenantId, triggerType, JSON.stringify(triggerPayload)]
      );
      executionId = initExec.rows[0].id;
    }

    // Emit execution.started telemetry event
    WorkflowEventEmitter.emit({
      event: 'execution.started',
      executionId: executionId!,
      workflowId,
      tenantId,
      timestamp: new Date().toISOString(),
      data: { triggerType, payload: triggerPayload },
    });

    const context: IWorkflowExecutionContext = {
      tenantId,
      workflowId,
      workflowVersionId: version?.id,
      executionId: executionId!,
      triggerType,
      triggerPayload,
      variables: {},
      stepsResults: [],
      nodesOutputs: {},
    };

    let overallStatus: 'completed' | 'failed' = 'completed';
    let errorMessage: string | null = null;
    const executionLogs: string[] = [
      `[${new Date().toISOString()}] Workflow execution started (${graph.nodes.length} nodes). Mode: ${triggerType}`,
    ];

    // 4. DAG Topological Execution
    if (graph.nodes.length > 0) {
      let compiled;
      try {
        compiled = WorkflowCompiler.compile(graph);
      } catch (compileErr: any) {
        // If compilation fails, fall back to soft execution
        Logger.warn(`[WorkflowEngine] Compilation notice: ${compileErr.message}. Executing with soft dependency resolver.`);
      }

      const { nodes, edges = [] } = graph;
      const nodeMap = new Map<string, IWorkflowNode>();
      for (const node of nodes) {
        nodeMap.set(node.id, node);
      }

      const incomingEdges = new Map<string, typeof edges>();
      const outgoingEdges = new Map<string, typeof edges>();

      for (const node of nodes) {
        incomingEdges.set(node.id, []);
        outgoingEdges.set(node.id, []);
      }

      for (const edge of edges) {
        if (incomingEdges.has(edge.target)) {
          incomingEdges.get(edge.target)!.push(edge);
        }
        if (outgoingEdges.has(edge.source)) {
          outgoingEdges.get(edge.source)!.push(edge);
        }
      }

      // Identify root trigger nodes
      const rootNodes = nodes.filter((n) => {
        const inEdges = incomingEdges.get(n.id) || [];
        const isTrigger = (n.data?.type || n.type || '').toLowerCase().startsWith('trigger');
        return inEdges.length === 0 || isTrigger;
      });

      const queue: string[] = rootNodes.length > 0 ? rootNodes.map((n) => n.id) : [nodes[0].id];
      const visited = new Set<string>();
      const skippedNodes = new Set<string>();
      let stepCounter = 0;

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (visited.has(currentId) || skippedNodes.has(currentId)) continue;

        const node = nodeMap.get(currentId);
        if (!node) continue;

        // Check if any required predecessors were skipped or not yet visited
        const inEdges = incomingEdges.get(currentId) || [];
        if (inEdges.length > 0) {
          const hasEligibleInEdge = inEdges.some((edge) => visited.has(edge.source));
          if (!hasEligibleInEdge && !visited.has(currentId)) {
            continue; // Wait for upstream nodes
          }
        }

        visited.add(currentId);

        const nodeType = (node.data?.type || node.type || 'prompt') as any;
        const step: IWorkflowStep = {
          id: node.id,
          type: nodeType,
          value: node.data?.value,
          name: node.data?.label || node.data?.name || node.id,
          config: node.data?.config,
        };

        // Determine incoming data: prior node output or trigger payload
        let incomingData = context.triggerPayload;
        if (inEdges.length > 0) {
          const firstSource = inEdges[0].source;
          incomingData = context.nodesOutputs[firstSource];
        }

        executionLogs.push(`[${new Date().toISOString()}] Node ${node.id} (${step.type}) starting...`);
        const result = await this.executeStep(step, stepCounter++, context, incomingData);
        result.nodeId = node.id;
        context.stepsResults.push(result);
        context.nodesOutputs[node.id] = result.output;

        if (result.status === 'failed') {
          overallStatus = 'failed';
          errorMessage = `Node ${node.id} (${step.type}) failed: ${result.error}`;
          executionLogs.push(`[${new Date().toISOString()}] Node ${node.id} FAILED: ${result.error}`);
          continue;
        }

        executionLogs.push(`[${new Date().toISOString()}] Node ${node.id} COMPLETED in ${result.durationMs}ms`);

        // Handle Condition Branching (If / Else & Switch)
        const nodeOutEdges = outgoingEdges.get(currentId) || [];
        if (nodeType === 'filter' || nodeType === 'router' || nodeType === 'logic.if') {
          const passed = result.output?.passed === true;
          const matchingHandle = passed ? 'true' : 'false';

          for (const edge of nodeOutEdges) {
            if (edge.sourceHandle === matchingHandle || (!edge.sourceHandle && passed)) {
              if (!visited.has(edge.target) && !queue.includes(edge.target)) {
                queue.push(edge.target);
              }
            } else {
              skippedNodes.add(edge.target);
              WorkflowEventEmitter.emit({
                event: 'node.skipped',
                executionId: executionId!,
                workflowId,
                tenantId,
                nodeId: edge.target,
                timestamp: new Date().toISOString(),
                data: { reason: `Unmatched branch handle '${edge.sourceHandle || 'false'}'` },
              });
              executionLogs.push(`[${new Date().toISOString()}] Branch '${edge.sourceHandle || 'false'}' skipped node ${edge.target}`);
            }
          }
        } else if (nodeType === 'logic.switch') {
          const selectedBranch = result.output?.matchedBranch || 'default';
          for (const edge of nodeOutEdges) {
            if (edge.sourceHandle === selectedBranch || edge.label === selectedBranch) {
              if (!visited.has(edge.target) && !queue.includes(edge.target)) {
                queue.push(edge.target);
              }
            } else {
              skippedNodes.add(edge.target);
              WorkflowEventEmitter.emit({
                event: 'node.skipped',
                executionId: executionId!,
                workflowId,
                tenantId,
                nodeId: edge.target,
                timestamp: new Date().toISOString(),
              });
            }
          }
        } else {
          // Standard node: queue all outgoing targets
          for (const edge of nodeOutEdges) {
            if (!visited.has(edge.target) && !queue.includes(edge.target) && !skippedNodes.has(edge.target)) {
              queue.push(edge.target);
            }
          }
        }
      }
    }

    const durationMs = Date.now() - startTime;
    executionLogs.push(
      `[${new Date().toISOString()}] Workflow execution ${overallStatus.toUpperCase()} in ${durationMs}ms.`
    );

    // 5. Finalize execution status in DB
    await pool.query(
      `UPDATE workflow_executions
       SET status = $1,
           completed_at = NOW(),
           duration_ms = $2,
           logs = $3,
           error_message = $4,
           step_results = $5,
           context_data = $6
       WHERE id = $7`,
      [
        overallStatus,
        durationMs,
        executionLogs.join('\n'),
        errorMessage,
        JSON.stringify(context.stepsResults),
        JSON.stringify({ nodesOutputs: context.nodesOutputs }),
        executionId,
      ]
    );

    // 6. Update workflow metrics
    await pool.query(
      `UPDATE workflows
       SET execution_count = execution_count + 1,
           last_execution_at = NOW(),
           avg_duration_ms = CASE 
             WHEN execution_count = 0 THEN $1 
             ELSE (avg_duration_ms + $1) / 2 
           END
       WHERE id = $2`,
      [durationMs, workflowId]
    );

    // Emit execution.completed / execution.failed telemetry event
    WorkflowEventEmitter.emit({
      event: overallStatus === 'completed' ? 'execution.completed' : 'execution.failed',
      executionId: executionId!,
      workflowId,
      tenantId,
      timestamp: new Date().toISOString(),
      data: { durationMs, status: overallStatus, error: errorMessage },
    });

    return {
      executionId: executionId!,
      status: overallStatus,
      stepResults: context.stepsResults,
      durationMs,
    };
  }
}
