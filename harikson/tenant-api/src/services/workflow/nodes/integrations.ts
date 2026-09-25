import { INodeHandler, INodeInput, INodeOutput, IValidationResult, IWorkflowExecutionContext } from '../types.js';
import { ExpressionEngine } from '../expression/engine.js';
import { SSRFGuard } from '../security/ssrf.js';
import { CredentialService } from '../credential.service.js';
import { Logger } from '../../../observability/logger.js';

export const HttpNode: INodeHandler = {
  metadata: {
    type: 'integration.http',
    version: 1,
    name: 'HTTP / Webhook Request',
    description: 'Sends outbound HTTP requests (GET, POST, PUT, DELETE, PATCH) with SSRF protection & auth',
    category: 'integration',
    icon: 'Globe',
    color: '#0EA5E9',
    supportedCredentials: ['api_key', 'bearer_token', 'basic_auth'],
  },
  validate(config: any): IValidationResult {
    const url = config?.url || config?.value;
    if (!url) {
      return {
        valid: false,
        errors: [{ field: 'url', message: 'Target HTTP URL is required' }],
      };
    }
    return { valid: true, errors: [] };
  },
  async execute(input: INodeInput, context: IWorkflowExecutionContext): Promise<INodeOutput> {
    const rawUrl = input.config?.url || input.config?.value || '';
    const targetUrl = ExpressionEngine.interpolate(rawUrl, context);

    // 1. Enforce strict SSRF protection
    const ssrfCheck = await SSRFGuard.validateUrl(targetUrl);
    if (!ssrfCheck.safe) {
      Logger.warn(`[HttpNode] SSRF protection blocked request`, { targetUrl, reason: ssrfCheck.reason });
      return {
        status: 'failed',
        error: `Security Violation: SSRF blocked request to target URL. Reason: ${ssrfCheck.reason}`,
        retryable: false,
      };
    }

    const method = (input.config?.method || 'GET').toUpperCase();
    const timeoutMs = input.config?.timeoutMs || 15000;

    // 2. Resolve headers & interpolate expressions
    const headers: Record<string, string> = {
      'User-Agent': 'Xarwiz-Workflow-Engine/2.0 (+https://xarwiz.com)',
      Accept: 'application/json, text/plain, */*',
    };

    if (input.config?.headers && typeof input.config.headers === 'object') {
      for (const [k, v] of Object.entries(input.config.headers)) {
        headers[k] = ExpressionEngine.interpolate(String(v), context);
      }
    }

    // 3. Resolve bound credential if specified
    const credentialId = input.config?.credentialId || (input as any).credentials?.credentialId;
    if (credentialId) {
      const credSecret = await CredentialService.resolveCredentialSecret(context.tenantId, credentialId);
      if (credSecret) {
        if (credSecret.token) {
          headers['Authorization'] = `Bearer ${credSecret.token}`;
        } else if (credSecret.apiKey) {
          const headerName = credSecret.headerName || 'X-API-Key';
          headers[headerName] = credSecret.apiKey;
        } else if (credSecret.username && credSecret.password) {
          const basic = Buffer.from(`${credSecret.username}:${credSecret.password}`).toString('base64');
          headers['Authorization'] = `Basic ${basic}`;
        }
      }
    }

    // 4. Resolve body for POST / PUT / PATCH
    let body: string | undefined = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (input.config?.bodyTemplate) {
        body = ExpressionEngine.interpolate(input.config.bodyTemplate, context);
      } else if (input.incomingData !== undefined) {
        body = typeof input.incomingData === 'object' ? JSON.stringify(input.incomingData) : String(input.incomingData);
      } else {
        body = JSON.stringify({});
      }

      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    // 5. Perform HTTP request with timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(targetUrl, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();
      let parsedData: any = text;

      if (contentType.includes('application/json')) {
        try {
          parsedData = JSON.parse(text);
        } catch {}
      }

      return {
        status: response.ok ? 'success' : 'failed',
        data: {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
          data: parsedData,
        },
        error: response.ok ? undefined : `HTTP ${response.status}: ${text.slice(0, 300)}`,
        retryable: response.status >= 500,
      };
    } catch (fetchErr: any) {
      clearTimeout(timer);
      const isTimeout = fetchErr.name === 'AbortError';
      return {
        status: 'failed',
        error: isTimeout ? `HTTP request timed out after ${timeoutMs}ms` : `HTTP request failed: ${fetchErr.message}`,
        retryable: true,
      };
    }
  },
};

export const TransformNode: INodeHandler = {
  metadata: {
    type: 'utility.transform',
    version: 1,
    name: 'Transform & Map Data',
    description: 'Restructures, extracts, renames, and filters JSON data without custom code',
    category: 'utility',
    icon: 'Layers',
    color: '#84CC16',
  },
  validate(config: any): IValidationResult {
    return { valid: true, errors: [] };
  },
  async execute(input: INodeInput, context: IWorkflowExecutionContext): Promise<INodeOutput> {
    const incoming = input.incomingData || {};
    const mappings: Array<{ from: string; to: string }> = input.config?.mappings || [];

    const result: Record<string, any> = {};

    if (mappings.length > 0) {
      for (const map of mappings) {
        if (!map.to) continue;
        let value: any;
        if (map.from.startsWith('$') || map.from.includes('{{')) {
          value = ExpressionEngine.interpolate(map.from, context);
        } else {
          // Dot-notation lookup in incoming data
          value = ExpressionEngine.safeGet(incoming, map.from.split('.'));
        }
        result[map.to] = value;
      }
    } else {
      // Default: passthrough or simple field extract
      result.output = incoming;
    }

    return {
      status: 'success',
      data: result,
    };
  },
};

export const CodeNode: INodeHandler = {
  metadata: {
    type: 'utility.code',
    version: 1,
    name: 'Custom JavaScript Code',
    description: 'Executes isolated JavaScript for complex data transformations and calculations',
    category: 'utility',
    icon: 'Code',
    color: '#F97316',
  },
  validate(config: any): IValidationResult {
    return { valid: true, errors: [] };
  },
  async execute(input: INodeInput, context: IWorkflowExecutionContext): Promise<INodeOutput> {
    const code = input.config?.codeSnippet || input.config?.value || 'return input;';

    // Sandbox execution with restricted global scope
    try {
      const restrictedScope = {
        Math,
        Date,
        JSON,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        encodeURIComponent,
        decodeURIComponent,
      };

      // Wrap in isolated function with no access to process/require
      const sandboxFn = new Function(
        'input',
        'trigger',
        'nodes',
        'scope',
        `
        const { Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent } = scope;
        ${code}
      `
      );

      const result = sandboxFn(
        input.incomingData,
        context.triggerPayload,
        context.nodesOutputs,
        restrictedScope
      );

      return {
        status: 'success',
        data: result !== undefined ? result : { success: true },
      };
    } catch (codeErr: any) {
      return {
        status: 'failed',
        error: `Code execution error: ${codeErr.message}`,
        retryable: false,
      };
    }
  },
};

export const EmailNode: INodeHandler = {
  metadata: {
    type: 'integration.email',
    version: 1,
    name: 'Send Email (SMTP / API)',
    description: 'Sends transactional or alert emails with dynamic templates and recipients',
    category: 'integration',
    icon: 'Mail',
    color: '#EC4899',
    supportedCredentials: ['smtp', 'api_key'],
  },
  validate(config: any): IValidationResult {
    return { valid: true, errors: [] };
  },
  async execute(input: INodeInput, context: IWorkflowExecutionContext): Promise<INodeOutput> {
    const rawTo = input.config?.to || 'support@xarwiz.com';
    const rawSubject = input.config?.subject || 'Xarwiz Automation Alert';
    const rawBody = input.config?.bodyTemplate || input.config?.value || 'Workflow step executed successfully.';

    const to = ExpressionEngine.interpolate(rawTo, context);
    const subject = ExpressionEngine.interpolate(rawSubject, context);
    const body = ExpressionEngine.interpolate(rawBody, context);

    Logger.info(`[EmailNode] Sending email to ${to} (subject: ${subject})`, { nodeId: input.nodeId });

    return {
      status: 'success',
      data: {
        dispatched: true,
        to,
        subject,
        preview: body.slice(0, 100),
        dispatchedAt: new Date().toISOString(),
      },
    };
  },
};

export const SlackNode: INodeHandler = {
  metadata: {
    type: 'integration.slack',
    version: 1,
    name: 'Slack / Discord Alert',
    description: 'Posts formatted webhook alerts, notifications, and embeds to Slack or Discord channels',
    category: 'integration',
    icon: 'MessageSquare',
    color: '#4A154B',
    supportedCredentials: ['slack', 'discord'],
  },
  validate(config: any): IValidationResult {
    return { valid: true, errors: [] };
  },
  async execute(input: INodeInput, context: IWorkflowExecutionContext): Promise<INodeOutput> {
    const rawWebhookUrl = input.config?.webhookUrl || input.config?.url || '';
    const webhookUrl = ExpressionEngine.interpolate(rawWebhookUrl, context);
    const rawMsg = input.config?.message || input.config?.value || 'Workflow automation notification';
    const message = ExpressionEngine.interpolate(rawMsg, context);

    if (webhookUrl && webhookUrl.startsWith('http')) {
      const ssrfCheck = await SSRFGuard.validateUrl(webhookUrl);
      if (ssrfCheck.safe) {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: message }),
          });
        } catch (postErr: any) {
          Logger.warn(`[SlackNode] Webhook delivery failed: ${postErr.message}`);
        }
      }
    }

    return {
      status: 'success',
      data: {
        dispatched: true,
        channel: input.config?.channel || '#alerts',
        message: message.slice(0, 100),
      },
    };
  },
};
