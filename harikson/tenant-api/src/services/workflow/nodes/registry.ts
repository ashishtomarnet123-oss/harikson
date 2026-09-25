import {
  INodeHandler,
  INodeMetadata,
  INodeInput,
  INodeOutput,
  IValidationResult,
  IWorkflowExecutionContext,
} from '../types.js';
import { Logger } from '../../../observability/logger.js';

export class NodeRegistry {
  private static handlers: Map<string, INodeHandler> = new Map();

  /**
   * Register a node handler
   */
  public static register(handler: INodeHandler): void {
    const type = handler.metadata.type;
    this.handlers.set(type, handler);
    Logger.info(`[NodeRegistry] Registered node type: ${type} (v${handler.metadata.version})`);
  }

  /**
   * Get handler for a node type
   */
  public static getHandler(type: string): INodeHandler | undefined {
    // Exact match or fallback alias matching
    if (this.handlers.has(type)) {
      return this.handlers.get(type);
    }

    // Support legacy and shorthand aliases
    const aliasMap: Record<string, string> = {
      prompt: 'ai.llm',
      llm: 'ai.llm',
      rag_search: 'ai.rag',
      rag: 'ai.rag',
      agent: 'ai.agent',
      webhook: 'integration.http',
      http: 'integration.http',
      filter: 'logic.if',
      router: 'logic.if',
      switch: 'logic.switch',
      loop: 'logic.loop',
      delay: 'logic.delay',
      transform: 'utility.transform',
      code: 'utility.code',
      email: 'integration.email',
      slack: 'integration.slack',
      discord: 'integration.slack',
      trigger_manual: 'trigger.manual',
      manual: 'trigger.manual',
      trigger_webhook: 'trigger.webhook',
      trigger_cron: 'trigger.cron',
      cron: 'trigger.cron',
    };

    const mapped = aliasMap[type];
    if (mapped && this.handlers.has(mapped)) {
      return this.handlers.get(mapped);
    }

    return undefined;
  }

  /**
   * Get all registered node metadata for the UI palette and docs
   */
  public static getAllMetadata(): INodeMetadata[] {
    return Array.from(this.handlers.values()).map((h) => h.metadata);
  }

  /**
   * Validate a node's configuration
   */
  public static validate(type: string, config: unknown): IValidationResult {
    const handler = this.getHandler(type);
    if (!handler) {
      return {
        valid: false,
        errors: [{ message: `Unknown node type '${type}'` }],
      };
    }
    return handler.validate(config);
  }

  /**
   * Execute a node through its registered handler
   */
  public static async execute(
    input: INodeInput,
    context: IWorkflowExecutionContext
  ): Promise<INodeOutput> {
    const handler = this.getHandler(input.nodeType);
    if (!handler) {
      return {
        status: 'failed',
        error: `No handler registered for node type: ${input.nodeType}`,
        retryable: false,
      };
    }

    try {
      return await handler.execute(input, context);
    } catch (err: any) {
      Logger.error(`[NodeRegistry] Error executing node ${input.nodeId} (${input.nodeType}):`, err);
      return {
        status: 'failed',
        error: err.message || 'Node execution failed unexpectedly',
        retryable: true,
      };
    }
  }
}
