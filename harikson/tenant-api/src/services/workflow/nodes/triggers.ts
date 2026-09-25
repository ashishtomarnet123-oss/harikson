import { INodeHandler, INodeInput, INodeOutput, IValidationResult, IWorkflowExecutionContext } from '../types.js';

export const ManualTriggerNode: INodeHandler = {
  metadata: {
    type: 'trigger.manual',
    version: 1,
    name: 'Manual Trigger',
    description: 'Triggers workflow on-demand via UI click or API execute call with custom test JSON',
    category: 'trigger',
    icon: 'Play',
    color: '#10B981',
  },
  validate(config: any): IValidationResult {
    return { valid: true, errors: [] };
  },
  async execute(input: INodeInput, context: IWorkflowExecutionContext): Promise<INodeOutput> {
    return {
      status: 'success',
      data: {
        triggeredAt: new Date().toISOString(),
        payload: input.triggerPayload || {},
        executionId: context.executionId,
      },
    };
  },
};

export const WebhookTriggerNode: INodeHandler = {
  metadata: {
    type: 'trigger.webhook',
    version: 1,
    name: 'Webhook Trigger',
    description: 'Triggers workflow upon receiving an inbound HTTP POST webhook request',
    category: 'trigger',
    icon: 'Webhook',
    color: '#8B5CF6',
  },
  validate(config: any): IValidationResult {
    return { valid: true, errors: [] };
  },
  async execute(input: INodeInput, context: IWorkflowExecutionContext): Promise<INodeOutput> {
    return {
      status: 'success',
      data: {
        receivedAt: new Date().toISOString(),
        body: input.triggerPayload?.body || input.triggerPayload || {},
        headers: input.triggerPayload?.headers || {},
        queryParams: input.triggerPayload?.query || {},
      },
    };
  },
};

export const CronTriggerNode: INodeHandler = {
  metadata: {
    type: 'trigger.cron',
    version: 1,
    name: 'Schedule (Cron)',
    description: 'Triggers workflow automatically on a scheduled recurring cron interval',
    category: 'trigger',
    icon: 'Clock',
    color: '#F59E0B',
  },
  validate(config: any): IValidationResult {
    const cron = config?.cronExpression;
    if (!cron) {
      return {
        valid: false,
        errors: [{ field: 'cronExpression', message: 'Cron expression is required (e.g. 0 9 * * *)' }],
      };
    }
    return { valid: true, errors: [] };
  },
  async execute(input: INodeInput, context: IWorkflowExecutionContext): Promise<INodeOutput> {
    return {
      status: 'success',
      data: {
        scheduledTime: new Date().toISOString(),
        cronExpression: input.config?.cronExpression,
        timezone: input.config?.timezone || 'UTC',
      },
    };
  },
};
