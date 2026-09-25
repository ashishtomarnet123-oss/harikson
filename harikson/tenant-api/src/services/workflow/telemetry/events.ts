import { EventEmitter } from 'events';
import { Logger } from '../../../observability/logger.js';

export interface IWorkflowEvent {
  event:
    | 'execution.started'
    | 'execution.completed'
    | 'execution.failed'
    | 'node.queued'
    | 'node.started'
    | 'node.completed'
    | 'node.failed'
    | 'node.skipped'
    | 'workflow.waiting'
    | 'workflow.resumed';
  executionId: string;
  workflowId: string;
  tenantId: string;
  nodeId?: string;
  nodeType?: string;
  timestamp: string;
  data?: any;
}

export class WorkflowEventEmitter {
  private static emitter = new EventEmitter();

  static {
    // Prevent memory leak warning on many concurrent SSE subscribers
    this.emitter.setMaxListeners(200);
  }

  /**
   * Emit an execution event
   */
  public static emit(event: IWorkflowEvent): void {
    event.timestamp = event.timestamp || new Date().toISOString();
    this.emitter.emit(`execution:${event.executionId}`, event);
    this.emitter.emit(`workflow:${event.workflowId}`, event);
    this.emitter.emit(`tenant:${event.tenantId}`, event);
    Logger.info(`[WorkflowTelemetry] Event emitted: ${event.event} (exec: ${event.executionId}, node: ${event.nodeId || '-'})`);
  }

  /**
   * Subscribe to execution-specific events (e.g. for SSE stream)
   */
  public static subscribeExecution(executionId: string, listener: (event: IWorkflowEvent) => void): () => void {
    const channel = `execution:${executionId}`;
    this.emitter.on(channel, listener);
    return () => {
      this.emitter.off(channel, listener);
    };
  }

  /**
   * Subscribe to workflow-level events
   */
  public static subscribeWorkflow(workflowId: string, listener: (event: IWorkflowEvent) => void): () => void {
    const channel = `workflow:${workflowId}`;
    this.emitter.on(channel, listener);
    return () => {
      this.emitter.off(channel, listener);
    };
  }
}
