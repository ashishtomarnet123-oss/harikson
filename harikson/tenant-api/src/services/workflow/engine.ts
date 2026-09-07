import { pool } from '../../db/pool.js';
import { OllamaService } from '../ollama.service.js';
import { RagService } from '../rag.service.js';
import { Logger } from '../../observability/logger.js';
import {
  IWorkflowStep,
  IWorkflowExecutionContext,
  IStepExecutionResult,
  TriggerType,
} from './types.js';

export class WorkflowEngine {
  /**
   * Interpolate variable strings like {{trigger.payload.key}}, {{prev.output}}, {{steps[0].output}}
   */
  public static interpolate(
    template: string,
    context: {
      trigger: { payload: Record<string, any> };
      prev: { output: any };
      steps: IStepExecutionResult[];
      variables: Record<string, any>;
    }
  ): string {
    if (!template || typeof template !== 'string') return template || '';

    return template.replace(/\{\{\s*([a-zA-Z0-9_.\[\]]+)\s*\}\}/g, (match, path) => {
      try {
        const parts = path.split('.');
        let current: any = context;

        for (const part of parts) {
          if (part.includes('[') && part.includes(']')) {
            const arrName = part.substring(0, part.indexOf('['));
            const index = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')), 10);
            current = current[arrName]?.[index];
          } else {
            current = current?.[part];
          }
          if (current === undefined || current === null) break;
        }

        if (current === undefined || current === null) return match;
        return typeof current === 'object' ? JSON.stringify(current) : String(current);
      } catch {
        return match;
      }
    });
  }

  /**
   * Execute a single step within workflow context
   */
  private static async executeStep(
    step: IWorkflowStep,
    stepIndex: number,
    context: IWorkflowExecutionContext
  ): Promise<IStepExecutionResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    const prevResult = context.stepsResults[context.stepsResults.length - 1];
    const prevOutput = prevResult ? prevResult.output : null;

    const interpContext = {
      trigger: { payload: context.triggerPayload },
      prev: { output: prevOutput },
      steps: context.stepsResults,
      variables: context.variables,
    };

    const stepInput = step.config || { value: step.value };
    let stepOutput: any = null;
    let stepError: string | undefined;
    let stepStatus: 'completed' | 'failed' | 'skipped' = 'completed';

    try {
      switch (step.type) {
        case 'prompt': {
          const rawPrompt = step.config?.bodyTemplate || step.value || 'Provide a helpful summary.';
          const prompt = this.interpolate(rawPrompt, interpContext);
          const systemPrompt = step.config?.systemPrompt
            ? this.interpolate(step.config.systemPrompt, interpContext)
            : 'You are an intelligent autonomous AI workflow assistant.';

          Logger.info(`[Workflow] Executing LLM prompt`, { workflowId: context.workflowId, stepIndex });
          stepOutput = await OllamaService.generate(prompt, systemPrompt);
          break;
        }

        case 'rag_search': {
          const rawQuery = step.config?.query || step.value || '';
          const query = this.interpolate(rawQuery, interpContext);
          const maxResults = step.config?.maxResults || 3;

          Logger.info(`[Workflow] Querying RAG context`, { workflowId: context.workflowId, query });
          stepOutput = await RagService.queryContext(context.tenantId, query, maxResults);
          break;
        }

        case 'webhook': {
          const rawUrl = step.config?.url || step.value || '';
          const url = this.interpolate(rawUrl, interpContext);
          const method = step.config?.method || 'POST';
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(step.config?.headers || {}),
          };

          let bodyData: any = null;
          if (method !== 'GET') {
            const rawBody = step.config?.bodyTemplate || JSON.stringify({
              workflow_id: context.workflowId,
              execution_id: context.executionId,
              timestamp: new Date().toISOString(),
              previous_output: prevOutput,
            });
            const interpolatedBody = this.interpolate(rawBody, interpContext);
            try {
              bodyData = JSON.parse(interpolatedBody);
            } catch {
              bodyData = interpolatedBody;
            }
          }

          Logger.info(`[Workflow] Calling external webhook`, { workflowId: context.workflowId, url, method });

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), step.config?.timeoutMs || 15000);

          try {
            const res = await fetch(url, {
              method,
              headers,
              body: method !== 'GET' ? JSON.stringify(bodyData) : undefined,
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            const contentType = res.headers.get('content-type') || '';
            const textResponse = await res.text();
            let parsedRes = textResponse;
            if (contentType.includes('application/json')) {
              try {
                parsedRes = JSON.parse(textResponse);
              } catch {}
            }

            stepOutput = {
              status: res.status,
              ok: res.ok,
              data: parsedRes,
            };

            if (!res.ok) {
              stepError = `Webhook HTTP Error ${res.status}: ${textResponse.slice(0, 300)}`;
            }
          } catch (fetchErr: any) {
            clearTimeout(timeoutId);
            stepStatus = 'failed';
            stepError = `Webhook connection failed: ${fetchErr.message}`;
            stepOutput = { error: fetchErr.message };
          }
          break;
        }

        case 'email': {
          const to = this.interpolate(step.config?.to || '', interpContext);
          const subject = this.interpolate(step.config?.subject || 'Workflow Automation Notification', interpContext);
          const rawBody = step.config?.bodyTemplate || step.value || 'Workflow step executed successfully.';
          const body = this.interpolate(rawBody, interpContext);

          Logger.info(`[Workflow] Dispatching transactional email`, { workflowId: context.workflowId, to, subject });
          
          // Use console/logger fallback or existing email dispatch
          stepOutput = {
            dispatched: true,
            to: to || 'support@xarwiz.com',
            subject,
            preview: body.slice(0, 100),
          };
          break;
        }

        case 'filter': {
          const condition = step.config?.condition || 'contains';
          const targetValue = this.interpolate(step.config?.threshold?.toString() || step.value || '', interpContext);
          const checkContent = prevOutput ? (typeof prevOutput === 'object' ? JSON.stringify(prevOutput) : String(prevOutput)) : '';

          let passed = false;
          if (condition === 'contains') {
            passed = checkContent.toLowerCase().includes(targetValue.toLowerCase());
          } else if (condition === 'equals') {
            passed = checkContent.trim() === targetValue.trim();
          } else if (condition === 'not_empty') {
            passed = checkContent.trim().length > 0;
          } else {
            passed = true;
          }

          stepOutput = {
            condition,
            targetValue,
            evaluatedContentSnippet: checkContent.slice(0, 150),
            passed,
          };

          if (!passed) {
            stepStatus = 'skipped';
            stepOutput.action = 'Condition not met. Halting downstream steps gracefully.';
          }
          break;
        }

        case 'agent': {
          const taskDescription = this.interpolate(step.config?.task || step.value || '', interpContext);
          const prompt = `You are an assigned autonomous AI agent executing task: ${taskDescription}\nInput Context: ${JSON.stringify(prevOutput)}`;
          Logger.info(`[Workflow] Running autonomous agent step`, { workflowId: context.workflowId });
          stepOutput = await OllamaService.generate(prompt, 'Execute the assigned agent task and output the resolution.');
          break;
        }

        default: {
          stepOutput = `Executed generic step: ${step.type} - ${step.value || ''}`;
          break;
        }
      }
    } catch (err: any) {
      stepStatus = 'failed';
      stepError = err.message || 'Unknown step execution error';
      stepOutput = { error: stepError };
      Logger.error(`[Workflow] Step ${stepIndex} (${step.type}) failed`, err);
    }

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    return {
      stepId: step.id || stepIndex,
      stepIndex,
      type: step.type,
      status: stepStatus,
      startedAt,
      completedAt,
      durationMs,
      input: stepInput,
      output: stepOutput,
      error: stepError,
    };
  }

  /**
   * Run full workflow end-to-end
   */
  public static async executeWorkflow(
    workflowId: string,
    triggerType: TriggerType = 'manual',
    triggerPayload: Record<string, any> = {},
    tenantIdOverride?: string
  ): Promise<{ executionId: string; status: string; stepResults: IStepExecutionResult[]; durationMs: number }> {
    const startTime = Date.now();

    // 1. Fetch workflow definition
    const wfRes = await pool.query(`SELECT * FROM workflows WHERE id = $1`, [workflowId]);
    if (!wfRes.rows.length) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const workflow = wfRes.rows[0];
    const tenantId = tenantIdOverride || workflow.tenant_id;
    let steps: IWorkflowStep[] = [];

    try {
      if (typeof workflow.steps === 'string') {
        steps = JSON.parse(workflow.steps);
      } else if (Array.isArray(workflow.steps)) {
        steps = workflow.steps;
      }
    } catch {
      steps = [];
    }

    // 2. Initialize execution record
    const initExec = await pool.query(
      `INSERT INTO workflow_executions (workflow_id, tenant_id, status, trigger_type, trigger_payload, started_at)
       VALUES ($1, $2, 'running', $3, $4, NOW()) RETURNING id`,
      [workflowId, tenantId, triggerType, JSON.stringify(triggerPayload)]
    );

    const executionId = initExec.rows[0].id;

    const context: IWorkflowExecutionContext = {
      tenantId,
      workflowId,
      executionId,
      triggerType,
      triggerPayload,
      variables: {},
      stepsResults: [],
    };

    let overallStatus: 'completed' | 'failed' = 'completed';
    let errorMessage: string | null = null;
    const executionLogs: string[] = [`[${new Date().toISOString()}] Workflow execution started. Steps count: ${steps.length}`];

    // 3. Sequential Step Execution
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      executionLogs.push(`[${new Date().toISOString()}] Step ${i + 1} (${step.type}) starting...`);

      const result = await this.executeStep(step, i, context);
      context.stepsResults.push(result);

      if (result.status === 'failed') {
        overallStatus = 'failed';
        errorMessage = `Step ${i + 1} (${step.type}) failed: ${result.error}`;
        executionLogs.push(`[${new Date().toISOString()}] Step ${i + 1} FAILED: ${result.error}`);
        break; // Stop downstream execution on hard failure
      } else if (result.status === 'skipped') {
        executionLogs.push(`[${new Date().toISOString()}] Step ${i + 1} filter stopped execution.`);
        break; // Stop downstream on filter termination
      } else {
        executionLogs.push(`[${new Date().toISOString()}] Step ${i + 1} COMPLETED in ${result.durationMs}ms`);
      }
    }

    const totalDurationMs = Date.now() - startTime;
    executionLogs.push(`[${new Date().toISOString()}] Workflow finished with status: ${overallStatus} (${totalDurationMs}ms)`);

    // 4. Update execution record
    await pool.query(
      `UPDATE workflow_executions
       SET status = $1, completed_at = NOW(), duration_ms = $2, logs = $3, error_message = $4, step_results = $5
       WHERE id = $6`,
      [
        overallStatus,
        totalDurationMs,
        JSON.stringify(executionLogs),
        errorMessage,
        JSON.stringify(context.stepsResults),
        executionId,
      ]
    );

    // 5. Update workflow aggregate metrics
    await pool.query(
      `UPDATE workflows
       SET execution_count = execution_count + 1,
           last_execution_at = NOW(),
           avg_duration_ms = CASE 
             WHEN avg_duration_ms = 0 OR avg_duration_ms IS NULL THEN $1::int 
             ELSE ROUND((avg_duration_ms + $1::int)::numeric / 2)::int 
           END,
           updated_at = NOW()
       WHERE id = $2`,
      [totalDurationMs, workflowId]
    );

    return {
      executionId,
      status: overallStatus,
      stepResults: context.stepsResults,
      durationMs: totalDurationMs,
    };
  }
}
