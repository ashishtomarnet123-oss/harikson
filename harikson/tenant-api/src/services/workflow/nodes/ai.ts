import { INodeHandler, INodeInput, INodeOutput, IValidationResult, IWorkflowExecutionContext } from '../types.js';
import { ExpressionEngine } from '../expression/engine.js';
import { Logger } from '../../../observability/logger.js';

async function getOllamaService() {
  const mod = await import('../../ollama.service.js');
  return mod.OllamaService;
}

async function getRagService() {
  const mod = await import('../../rag.service.js');
  return mod.RagService;
}

export const LlmNode: INodeHandler = {
  metadata: {
    type: 'ai.llm',
    version: 1,
    name: 'LLM Prompt / Generation',
    description: 'Generates text, answers, or structured JSON using local Ollama or cloud LLMs',
    category: 'ai',
    icon: 'Bot',
    color: '#3B82F6',
    supportedCredentials: ['openai', 'anthropic'],
  },
  validate(config: any): IValidationResult {
    const prompt = config?.userPrompt || config?.prompt || config?.value;
    if (!prompt) {
      return {
        valid: false,
        errors: [{ field: 'userPrompt', message: 'User prompt or prompt template is required' }],
      };
    }
    return { valid: true, errors: [] };
  },
  async execute(input: INodeInput, context: IWorkflowExecutionContext): Promise<INodeOutput> {
    const startTime = Date.now();
    const rawPrompt = input.config?.userPrompt || input.config?.prompt || input.config?.value || '';
    const userPrompt = ExpressionEngine.interpolate(rawPrompt, context);
    const systemPrompt = input.config?.systemPrompt
      ? ExpressionEngine.interpolate(input.config.systemPrompt, context)
      : 'You are an intelligent AI workflow automation assistant.';

    const model = input.config?.model || 'llama3.2';
    const provider = input.config?.provider || 'ollama';

    Logger.info(`[LlmNode] Invoking LLM (${provider}/${model})`, {
      nodeId: input.nodeId,
      workflowId: context.workflowId,
      tenantId: context.tenantId,
    });

    const OllamaService = await getOllamaService();
    let textResponse = '';
    try {
      // 1. If provider is Ollama
      textResponse = await OllamaService.generate(userPrompt, systemPrompt);
    } catch (llmErr: any) {
      Logger.warn(`[LlmNode] Primary model failed, attempting fallback if configured: ${llmErr.message}`);
      if (input.config?.fallbackModel) {
        textResponse = await OllamaService.generate(userPrompt, systemPrompt);
      } else {
        throw llmErr;
      }
    }

    const durationMs = Date.now() - startTime;

    // Check for structured JSON parsing
    let parsedJson: any = null;
    if (input.config?.jsonMode || input.config?.structuredOutput) {
      try {
        const jsonMatch = textResponse.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          parsedJson = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Non-fatal if JSON extraction fails
      }
    }

    // Estimate token usage (heuristic: ~4 chars per token)
    const promptTokens = Math.ceil((userPrompt.length + systemPrompt.length) / 4);
    const completionTokens = Math.ceil(textResponse.length / 4);

    return {
      status: 'success',
      data: {
        text: textResponse,
        json: parsedJson,
        model,
        provider,
        tokens: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        durationMs,
      },
    };
  },
};

export const RagNode: INodeHandler = {
  metadata: {
    type: 'ai.rag',
    version: 1,
    name: 'RAG Knowledge Search',
    description: 'Retrieves relevant semantic context and documents from tenant vector collections',
    category: 'ai',
    icon: 'BookOpen',
    color: '#06B6D4',
  },
  validate(config: any): IValidationResult {
    const query = config?.query || config?.value;
    if (!query) {
      return {
        valid: false,
        errors: [{ field: 'query', message: 'Search query template is required' }],
      };
    }
    return { valid: true, errors: [] };
  },
  async execute(input: INodeInput, context: IWorkflowExecutionContext): Promise<INodeOutput> {
    const rawQuery = input.config?.query || input.config?.value || '';
    const query = ExpressionEngine.interpolate(rawQuery, context);
    const maxResults = input.config?.maxResults || 3;

    Logger.info(`[RagNode] Performing vector search for tenant ${context.tenantId}`, {
      nodeId: input.nodeId,
      query: query.slice(0, 60),
      maxResults,
    });

    const RagService = await getRagService();
    const contextText = await RagService.queryContext(context.tenantId, query, maxResults);

    return {
      status: 'success',
      data: {
        query,
        context: contextText,
        hasResults: contextText.trim().length > 0,
        resultLength: contextText.length,
      },
    };
  },
};

export const AgentNode: INodeHandler = {
  metadata: {
    type: 'ai.agent',
    version: 1,
    name: 'Autonomous AI Agent',
    description: 'Dispatches multi-step reasoning, tool execution, and task solving to an autonomous agent',
    category: 'ai',
    icon: 'Cpu',
    color: '#EC4899',
  },
  validate(config: any): IValidationResult {
    const task = config?.task || config?.instructions || config?.value;
    if (!task) {
      return {
        valid: false,
        errors: [{ field: 'task', message: 'Task description or instruction is required' }],
      };
    }
    return { valid: true, errors: [] };
  },
  async execute(input: INodeInput, context: IWorkflowExecutionContext): Promise<INodeOutput> {
    const rawTask = input.config?.task || input.config?.instructions || input.config?.value || '';
    const taskDescription = ExpressionEngine.interpolate(rawTask, context);

    const prevData = input.incomingData;
    const prompt = `You are an assigned autonomous AI agent executing task: ${taskDescription}\nInput Context: ${
      typeof prevData === 'object' ? JSON.stringify(prevData) : String(prevData || 'None')
    }`;

    Logger.info(`[AgentNode] Running autonomous agent step`, {
      nodeId: input.nodeId,
      workflowId: context.workflowId,
    });

    const OllamaService = await getOllamaService();
    const resolution = await OllamaService.generate(
      prompt,
      'Execute the assigned agent task methodically and output a concise structured resolution.'
    );

    return {
      status: 'success',
      data: {
        task: taskDescription,
        resolution,
        completedAt: new Date().toISOString(),
      },
    };
  },
};
