import { INodeHandler, INodeInput, INodeOutput, IValidationResult, IWorkflowExecutionContext } from '../types.js';
import { ExpressionEngine } from '../expression/engine.js';
import { Logger } from '../../../observability/logger.js';

export const IfConditionNode: INodeHandler = {
  metadata: {
    type: 'logic.if',
    version: 1,
    name: 'If / Else Condition',
    description: 'Routes workflow along true or false branch handles based on safe condition evaluation',
    category: 'logic',
    icon: 'GitBranch',
    color: '#EAB308',
  },
  validate(config: any): IValidationResult {
    return { valid: true, errors: [] };
  },
  async execute(input: INodeInput, context: IWorkflowExecutionContext): Promise<INodeOutput> {
    const condition = input.config?.condition || 'contains';
    const targetThreshold = ExpressionEngine.interpolate(
      input.config?.threshold?.toString() || input.config?.value || '',
      context
    );

    let checkValue = '';
    if (input.config?.field) {
      checkValue = ExpressionEngine.interpolate(input.config.field, context);
    } else if (input.incomingData !== undefined && input.incomingData !== null) {
      checkValue =
        typeof input.incomingData === 'object'
          ? JSON.stringify(input.incomingData)
          : String(input.incomingData);
    }

    let passed = false;

    switch (condition) {
      case 'equals':
        passed = checkValue.trim() === targetThreshold.trim();
        break;
      case 'not_equals':
        passed = checkValue.trim() !== targetThreshold.trim();
        break;
      case 'contains':
        passed = checkValue.toLowerCase().includes(targetThreshold.toLowerCase());
        break;
      case 'not_contains':
        passed = !checkValue.toLowerCase().includes(targetThreshold.toLowerCase());
        break;
      case 'greater_than':
        passed = parseFloat(checkValue) > parseFloat(targetThreshold);
        break;
      case 'less_than':
        passed = parseFloat(checkValue) < parseFloat(targetThreshold);
        break;
      case 'greater_equal':
        passed = parseFloat(checkValue) >= parseFloat(targetThreshold);
        break;
      case 'less_equal':
        passed = parseFloat(checkValue) <= parseFloat(targetThreshold);
        break;
      case 'not_empty':
        passed = checkValue.trim().length > 0;
        break;
      case 'is_empty':
        passed = checkValue.trim().length === 0;
        break;
      case 'exists':
        passed = checkValue !== undefined && checkValue !== null && checkValue !== '';
        break;
      case 'regex':
        try {
          const re = new RegExp(targetThreshold);
          passed = re.test(checkValue);
        } catch {
          passed = false;
        }
        break;
      default:
        passed = checkValue.toLowerCase().includes(targetThreshold.toLowerCase());
        break;
    }

    const selectedBranch = passed ? 'true' : 'false';

    Logger.info(`[IfConditionNode] Evaluated condition '${condition}': result=${passed} (branch: ${selectedBranch})`, {
      nodeId: input.nodeId,
    });

    return {
      status: 'success',
      selectedBranch,
      data: {
        condition,
        targetThreshold,
        evaluatedSnippet: checkValue.slice(0, 150),
        passed,
        selectedBranch,
      },
    };
  },
};

export const SwitchNode: INodeHandler = {
  metadata: {
    type: 'logic.switch',
    version: 1,
    name: 'Switch Router',
    description: 'Routes workflow across multiple custom branches matching defined rules',
    category: 'logic',
    icon: 'Shuffle',
    color: '#D97706',
  },
  validate(config: any): IValidationResult {
    return { valid: true, errors: [] };
  },
  async execute(input: INodeInput, context: IWorkflowExecutionContext): Promise<INodeOutput> {
    const rawValue = input.config?.field || input.config?.value || '';
    const evaluatedValue = ExpressionEngine.interpolate(rawValue, context).trim();

    const cases = input.config?.cases || [];
    let matchedHandle = input.config?.defaultHandleId || 'default';

    for (const c of cases) {
      const caseVal = ExpressionEngine.interpolate(c.value || '', context).trim();
      if (evaluatedValue.toLowerCase() === caseVal.toLowerCase()) {
        matchedHandle = c.handleId || c.value;
        break;
      }
    }

    return {
      status: 'success',
      selectedBranch: matchedHandle,
      data: {
        evaluatedValue,
        matchedBranch: matchedHandle,
      },
    };
  },
};

export const DelayNode: INodeHandler = {
  metadata: {
    type: 'logic.delay',
    version: 1,
    name: 'Delay Timer',
    description: 'Pauses workflow execution for a specified duration in seconds or minutes',
    category: 'logic',
    icon: 'Hourglass',
    color: '#64748B',
  },
  validate(config: any): IValidationResult {
    const secs = Number(config?.delaySeconds || config?.duration || 0);
    if (secs < 0 || secs > 86400) {
      return {
        valid: false,
        errors: [{ field: 'delaySeconds', message: 'Delay must be between 0 and 86400 seconds (24h)' }],
      };
    }
    return { valid: true, errors: [] };
  },
  async execute(input: INodeInput, context: IWorkflowExecutionContext): Promise<INodeOutput> {
    const seconds = Math.min(Math.max(Number(input.config?.delaySeconds || 1), 1), 60); // Cap inline delay to 60s for immediate workers

    Logger.info(`[DelayNode] Pausing execution for ${seconds} seconds...`, { nodeId: input.nodeId });
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));

    return {
      status: 'success',
      data: {
        delayedSeconds: seconds,
        resumedAt: new Date().toISOString(),
      },
    };
  },
};

export const LoopNode: INodeHandler = {
  metadata: {
    type: 'logic.loop',
    version: 1,
    name: 'Loop Over Items',
    description: 'Iterates through an array of items, executing sub-actions for each element',
    category: 'logic',
    icon: 'Repeat',
    color: '#14B8A6',
  },
  validate(config: any): IValidationResult {
    return { valid: true, errors: [] };
  },
  async execute(input: INodeInput, context: IWorkflowExecutionContext): Promise<INodeOutput> {
    let items: any[] = [];
    if (Array.isArray(input.incomingData)) {
      items = input.incomingData;
    } else if (input.config?.itemsField) {
      const extracted = ExpressionEngine.resolveToken(input.config.itemsField, context);
      if (Array.isArray(extracted)) items = extracted;
    }

    const maxItems = Math.min(items.length, input.config?.maxIterations || 100);
    const sliced = items.slice(0, maxItems);

    return {
      status: 'success',
      data: {
        totalItems: items.length,
        processedItemsCount: sliced.length,
        items: sliced,
      },
    };
  },
};
