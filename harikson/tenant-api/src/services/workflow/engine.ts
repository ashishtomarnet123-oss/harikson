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
   * Execute a single step / node within workflow context with retries and timeout
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

    const retryConfig = step.config?.retry;
    const maxAttempts = retryConfig?.maxAttempts && retryConfig.maxAttempts > 1 ? retryConfig.maxAttempts : 1;
    const backoffMs = retryConfig?.backoffMs || 1000;
    const nodeTimeoutMs = step.config?.timeoutMs || 30000; // default 30s timeout

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

    // Retry attempt loop
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const attemptStartTime = Date.now();
      const attemptStartedAt = new Date().toISOString();

      WorkflowEventEmitter.emit({
        event: 'node.started',
        executionId: context.executionId,
        workflowId: context.workflowId,
        tenantId: context.tenantId,
        nodeId,
        nodeType: step.type,
        timestamp: attemptStartedAt,
        data: { attempt: attempt + 1, maxAttempts },
      });

      try {
        // Enforce per-node timeoutMs with Promise.race
        const result = await Promise.race([
          NodeRegistry.execute(nodeInput, context),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Node ${nodeId} timed out after ${nodeTimeoutMs}ms`)), nodeTimeoutMs)
          ),
        ]);

        stepStatus = result.status === 'success' ? 'completed' : (result.status as any);
        stepOutput = result.data;
        stepError = result.error;
      } catch (err: any) {
        stepStatus = 'failed';
        stepError = err.message || 'Node execution failed unexpectedly';
        stepOutput = { error: stepError };
        Logger.error(`[WorkflowEngine] Step ${stepIndex} (${step.type}) attempt ${attempt + 1}/${maxAttempts} failed: ${stepError}`, err);
      }

      const attemptFinishedAt = new Date().toISOString();
      const attemptDurationMs = Date.now() - attemptStartTime;

      // Durable checkpoint in workflow_node_executions per attempt
      if (context.executionId && context.executionId.length === 36) {
        try {
          await executeTenantQuery(context.tenantId, (client) =>
            client.query(
              `INSERT INTO workflow_node_executions (
                 execution_id, workflow_id, workflow_version_id, tenant_id, node_id, node_type,
                 status, input, output, error, retry_count, duration_ms, started_at, finished_at
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
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
                attempt,
                attemptDurationMs,
                attemptStartedAt,
                attemptFinishedAt,
              ]
            )
          );
        } catch (dbErr) {
          Logger.warn(`[WorkflowEngine] Could not persist node checkpoint attempt ${attempt}: ${dbErr}`);
        }
      }

      if (stepStatus === 'completed') {
        break; // Succeeded!
      } else if (attempt < maxAttempts - 1) {
        const sleepMs = backoffMs * Math.pow(2, attempt);
        Logger.info(`[WorkflowEngine] Retrying node ${nodeId} in ${sleepMs}ms (attempt ${attempt + 2}/${maxAttempts})...`);
        await new Promise((resolve) => setTimeout(resolve, sleepMs));
      }
    }

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    // Emit final node completion or failure event
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
   * Run full workflow end-to-end (Supports version-pinned DAG graph execution with Kahn's algorithm)
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

    // 2. Strict Version-Pinned Execution: ALWAYS resolve graph from published version
    const version = await WorkflowVersionService.getPublishedVersion(tenantId, workflowId);
    if (!version) {
      throw new Error(
        `Cannot execute workflow ${workflowId}: No active or published version found. Workflows must be published before execution.`
      );
    }
    const graph: IWorkflowGraph = version.definition;
    const settings = version.settings || workflow.settings || {};
    const workflowTimeoutMs = settings.timeoutMs || 300000; // 5 min default
    const failurePolicy = settings.failurePolicy || 'stop';

    // 3. Initialize or reuse execution record
    let executionId = existingExecutionId;
    if (!executionId) {
      const initExec = await pool.query(
        `INSERT INTO workflow_executions (
           workflow_id, workflow_version_id, tenant_id, status, trigger_type, trigger_payload, started_at
         ) VALUES ($1, $2, $3, 'running', $4, $5, NOW()) RETURNING id`,
        [workflowId, version.id, tenantId, triggerType, JSON.stringify(triggerPayload)]
      );
      executionId = initExec.rows[0].id;
    } else {
      // Update pre-created row from queued to running
      await pool.query(
        `UPDATE workflow_executions 
         SET status = 'running', workflow_version_id = $1, started_at = NOW() 
         WHERE id = $2`,
        [version.id, executionId]
      );
    }

    // Emit execution.started telemetry event
    WorkflowEventEmitter.emit({
      event: 'execution.started',
      executionId: executionId!,
      workflowId,
      tenantId,
      timestamp: new Date().toISOString(),
      data: { triggerType, payload: triggerPayload, version: version.version },
    });

    const context: IWorkflowExecutionContext = {
      tenantId,
      workflowId,
      workflowVersionId: version.id,
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
      `[${new Date().toISOString()}] Workflow execution started (${graph.nodes.length} nodes). Version: ${version.version}, Mode: ${triggerType}`,
    ];

    // 4. DAG Topological Execution with Kahn's Algorithm
    if (graph.nodes.length > 0) {
      const { nodes, edges = [] } = graph;
      const nodeMap = new Map<string, IWorkflowNode>();
      for (const node of nodes) {
        nodeMap.set(node.id, node);
      }

      const incomingEdges = new Map<string, typeof edges>();
      const outgoingEdges = new Map<string, typeof edges>();
      const inDegree = new Map<string, number>();
      const activeInbound = new Map<string, Set<string>>();
      const skippedInbound = new Map<string, Set<string>>();

      for (const node of nodes) {
        incomingEdges.set(node.id, []);
        outgoingEdges.set(node.id, []);
        inDegree.set(node.id, 0);
        activeInbound.set(node.id, new Set<string>());
        skippedInbound.set(node.id, new Set<string>());
      }

      for (const edge of edges) {
        if (incomingEdges.has(edge.target)) {
          incomingEdges.get(edge.target)!.push(edge);
        }
        if (outgoingEdges.has(edge.source)) {
          outgoingEdges.get(edge.source)!.push(edge);
        }
      }

      // Calculate initial in-degrees
      for (const node of nodes) {
        const inEdges = incomingEdges.get(node.id) || [];
        inDegree.set(node.id, inEdges.length);
      }

      // Identify root nodes (inDegree === 0)
      const queue: string[] = [];
      for (const node of nodes) {
        if (inDegree.get(node.id) === 0) {
          queue.push(node.id);
        }
      }

      if (queue.length === 0 && nodes.length > 0) {
        queue.push(nodes[0].id);
      }

      const visited = new Set<string>();
      const skippedNodes = new Set<string>();
      let stepCounter = 0;

      while (queue.length > 0) {
        // Enforce workflow-level timeoutMs
        if (Date.now() - startTime > workflowTimeoutMs) {
          overallStatus = 'failed';
          errorMessage = `Workflow execution timed out after exceeding ${workflowTimeoutMs}ms limit`;
          executionLogs.push(`[${new Date().toISOString()}] TIMEOUT: Workflow exceeded ${workflowTimeoutMs}ms threshold.`);
          for (const remainingId of queue) {
            WorkflowEventEmitter.emit({
              event: 'node.skipped',
              executionId: executionId!,
              workflowId,
              tenantId,
              nodeId: remainingId,
              timestamp: new Date().toISOString(),
              data: { reason: 'Workflow timeout exceeded' },
            });
          }
          break;
        }

        const currentId = queue.shift()!;
        if (visited.has(currentId)) continue;

        // Propagate skip for skipped nodes
        if (skippedNodes.has(currentId)) {
          visited.add(currentId);
          const nodeOutEdges = outgoingEdges.get(currentId) || [];
          for (const edge of nodeOutEdges) {
            skippedInbound.get(edge.target)?.add(currentId);
            const remaining = (inDegree.get(edge.target) || 1) - 1;
            inDegree.set(edge.target, remaining);

            if (remaining === 0) {
              if ((activeInbound.get(edge.target)?.size || 0) === 0) {
                skippedNodes.add(edge.target);
                WorkflowEventEmitter.emit({
                  event: 'node.skipped',
                  executionId: executionId!,
                  workflowId,
                  tenantId,
                  nodeId: edge.target,
                  timestamp: new Date().toISOString(),
                  data: { reason: `Upstream parent ${currentId} was skipped` },
                });
                queue.push(edge.target);
              } else {
                queue.push(edge.target);
              }
            }
          }
          continue;
        }

        const node = nodeMap.get(currentId);
        if (!node) continue;

        visited.add(currentId);

        const nodeType = (node.data?.type || node.type || 'prompt') as any;
        const step: IWorkflowStep = {
          id: node.id,
          type: nodeType,
          value: node.data?.value,
          name: node.data?.label || node.data?.name || node.id,
          config: node.data?.config,
        };

        // Determine incoming data: pass an ARRAY of all distinct parent outputs for fan-in
        const inEdges = incomingEdges.get(currentId) || [];
        let incomingData: any;
        if (inEdges.length === 0) {
          incomingData = context.triggerPayload;
        } else if (inEdges.length === 1) {
          incomingData = context.nodesOutputs[inEdges[0].source];
        } else {
          // Multiple parent edges: deduplicate parent source IDs and pass array of outputs
          const distinctParentSources = Array.from(new Set(inEdges.map((e) => e.source)));
          incomingData = distinctParentSources.map((src) => context.nodesOutputs[src]);
        }

        executionLogs.push(`[${new Date().toISOString()}] Node ${node.id} (${step.type}) starting...`);
        const result = await this.executeStep(step, stepCounter++, context, incomingData);
        result.nodeId = node.id;
        context.stepsResults.push(result);
        context.nodesOutputs[node.id] = result.output;

        const continueOnError = step.config?.continueOnError === true;

        if (result.status === 'failed') {
          overallStatus = 'failed';
          errorMessage = `Node ${node.id} (${step.type}) failed: ${result.error}`;
          executionLogs.push(`[${new Date().toISOString()}] Node ${node.id} FAILED: ${result.error}`);

          if (!continueOnError && failurePolicy === 'stop') {
            executionLogs.push(`[${new Date().toISOString()}] Failure policy 'stop' triggered. Halting remaining nodes.`);
            // Mark all unvisited nodes in the workflow as skipped
            for (const otherNode of nodes) {
              if (!visited.has(otherNode.id) && !skippedNodes.has(otherNode.id)) {
                skippedNodes.add(otherNode.id);
                WorkflowEventEmitter.emit({
                  event: 'node.skipped',
                  executionId: executionId!,
                  workflowId,
                  tenantId,
                  nodeId: otherNode.id,
                  timestamp: new Date().toISOString(),
                  data: { reason: `Execution stopped due to failure in node ${node.id}` },
                });
              }
            }
            break;
          }
        } else {
          executionLogs.push(`[${new Date().toISOString()}] Node ${node.id} COMPLETED in ${result.durationMs}ms`);
        }

        // Handle Branching Logic & Kahn In-Degree Propagation
        const nodeOutEdges = outgoingEdges.get(currentId) || [];
        const activeEdges = new Set<any>();
        const inactiveEdges = new Set<any>();

        if (nodeType === 'filter' || nodeType === 'router' || nodeType === 'logic.if') {
          const passed = result.output?.passed === true;
          const matchingHandle = passed ? 'true' : 'false';

          for (const edge of nodeOutEdges) {
            if (edge.sourceHandle === matchingHandle || (!edge.sourceHandle && passed)) {
              activeEdges.add(edge);
            } else {
              inactiveEdges.add(edge);
            }
          }
        } else if (nodeType === 'logic.switch') {
          const selectedBranch = result.output?.matchedBranch || 'default';
          for (const edge of nodeOutEdges) {
            if (edge.sourceHandle === selectedBranch || edge.label === selectedBranch) {
              activeEdges.add(edge);
            } else {
              inactiveEdges.add(edge);
            }
          }
        } else {
          for (const edge of nodeOutEdges) {
            activeEdges.add(edge);
          }
        }

        // Active edges: downstream node receives active signal
        for (const edge of activeEdges) {
          activeInbound.get(edge.target)?.add(currentId);
          const remaining = (inDegree.get(edge.target) || 1) - 1;
          inDegree.set(edge.target, remaining);

          if (remaining === 0) {
            queue.push(edge.target);
          }
        }

        // Inactive edges: downstream node receives skipped signal from this branch
        for (const edge of inactiveEdges) {
          skippedInbound.get(edge.target)?.add(currentId);
          const remaining = (inDegree.get(edge.target) || 1) - 1;
          inDegree.set(edge.target, remaining);

          if (remaining === 0) {
            // If all inbound branches were skipped, skip the target node
            if ((activeInbound.get(edge.target)?.size || 0) === 0) {
              skippedNodes.add(edge.target);
              WorkflowEventEmitter.emit({
                event: 'node.skipped',
                executionId: executionId!,
                workflowId,
                tenantId,
                nodeId: edge.target,
                timestamp: new Date().toISOString(),
                data: { reason: `Unmatched condition branch from node ${currentId}` },
              });
              queue.push(edge.target);
            } else {
              // Node has at least one active parent: execute it
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
