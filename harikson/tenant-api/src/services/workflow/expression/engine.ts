import { IWorkflowExecutionContext } from '../types.js';

export class ExpressionEngine {
  // Disallowed global / prototype properties to prevent sandbox escapes
  private static FORBIDDEN_PROPERTIES = new Set([
    '__proto__',
    'prototype',
    'constructor',
    'process',
    'global',
    'globalThis',
    'window',
    'document',
    'require',
    'module',
    'eval',
    'Function',
    'mainModule',
  ]);

  /**
   * Safely traverse a path in an object without exposing prototype pollution or globals
   */
  public static safeGet(target: any, path: string[]): any {
    let current = target;
    for (const segment of path) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (this.FORBIDDEN_PROPERTIES.has(segment)) {
        return undefined;
      }

      current = current[segment];
    }
    return current;
  }

  /**
   * Resolve an individual expression token e.g. "$trigger.body.email" or "$node['llm'].output.text"
   */
  public static resolveToken(rawToken: string, context: IWorkflowExecutionContext): any {
    const token = rawToken.trim();

    // Block any attempt to access forbidden prototype or process properties
    const tokenParts = token.split(/[\.\[\]'"]+/).filter(Boolean);
    if (tokenParts.some((p) => this.FORBIDDEN_PROPERTIES.has(p))) {
      return undefined;
    }

    // Built-in contextual variables
    if (token === '$now') {
      return new Date().toISOString();
    }
    if (token === '$workflow.id' || token === '$workflowId') {
      return context.workflowId;
    }
    if (token === '$execution.id' || token === '$executionId') {
      return context.executionId;
    }
    if (token === '$tenant.id' || token === '$tenantId') {
      return context.tenantId;
    }

    // 1. $trigger.body.xxx or $trigger.payload.xxx
    if (token.startsWith('$trigger.') || token.startsWith('trigger.')) {
      const pathParts = token.replace(/^\$?(trigger\.)/, '').split('.');
      // Support $trigger.body.email or $trigger.payload.email
      if (pathParts[0] === 'body' || pathParts[0] === 'payload') {
        pathParts.shift();
      }
      return this.safeGet(context.triggerPayload, pathParts);
    }

    // 2. $node["nodeId"].output.field or $node['nodeId'].output.field
    const bracketNodeMatch = token.match(/^\$node\[['"]([^'"]+)['"]\](?:\.(.*))?$/);
    if (bracketNodeMatch) {
      const nodeId = bracketNodeMatch[1];
      const subPath = bracketNodeMatch[2] ? bracketNodeMatch[2].split('.') : [];
      const nodeOutput = context.nodesOutputs?.[nodeId];
      if (subPath.length === 0) return nodeOutput;
      if (subPath[0] === 'output') subPath.shift(); // normalize .output.field -> .field
      return this.safeGet(nodeOutput, subPath);
    }

    // 3. $node.nodeId.output.field
    if (token.startsWith('$node.')) {
      const parts = token.slice(6).split('.');
      const nodeId = parts[0];
      const subPath = parts.slice(1);
      if (subPath[0] === 'output') subPath.shift();
      const nodeOutput = context.nodesOutputs?.[nodeId];
      return subPath.length === 0 ? nodeOutput : this.safeGet(nodeOutput, subPath);
    }

    // 4. Direct nodeId access: {{node_1.output.sentiment}} or {{node_1.sentiment}}
    const directParts = token.split('.');
    if (context.nodesOutputs && context.nodesOutputs[directParts[0]] !== undefined) {
      const nodeId = directParts[0];
      const subPath = directParts.slice(1);
      if (subPath[0] === 'output') subPath.shift();
      const nodeOutput = context.nodesOutputs[nodeId];
      return subPath.length === 0 ? nodeOutput : this.safeGet(nodeOutput, subPath);
    }

    // 5. Backwards compatibility: prev.output
    if (token === 'prev.output' || token === '$prev.output') {
      const lastStep = context.stepsResults[context.stepsResults.length - 1];
      return lastStep?.output;
    }

    // 6. Backwards compatibility: steps[index].output
    const stepArrMatch = token.match(/^steps\[(\d+)\](?:\.(.*))?$/);
    if (stepArrMatch) {
      const index = parseInt(stepArrMatch[1], 10);
      const step = context.stepsResults[index];
      const sub = stepArrMatch[2] ? stepArrMatch[2].split('.') : [];
      if (sub.length === 0 || sub[0] === 'output') {
        return sub.length <= 1 ? step?.output : this.safeGet(step?.output, sub.slice(1));
      }
      return this.safeGet(step, sub);
    }

    // 7. Context variables: {{$variables.env}} or {{variables.env}}
    if (token.startsWith('$variables.') || token.startsWith('variables.')) {
      const varParts = token.replace(/^\$?(variables\.)/, '').split('.');
      return this.safeGet(context.variables, varParts);
    }

    return undefined;
  }

  /**
   * Interpolate a string template replacing {{ ... }} tokens safely
   */
  public static interpolate(template: string, context: IWorkflowExecutionContext): string {
    if (!template || typeof template !== 'string') return template || '';

    return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, rawExpr) => {
      try {
        const resolved = this.resolveToken(rawExpr, context);
        if (resolved === undefined || resolved === null) {
          return match; // preserve raw template placeholder if unresolved
        }
        return typeof resolved === 'object' ? JSON.stringify(resolved) : String(resolved);
      } catch {
        return match;
      }
    });
  }

  /**
   * Deeply interpolate an object or array recursively
   */
  public static interpolateDeep<T>(value: T, context: IWorkflowExecutionContext): T {
    if (typeof value === 'string') {
      return this.interpolate(value, context) as unknown as T;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.interpolateDeep(item, context)) as unknown as T;
    }

    if (value && typeof value === 'object') {
      const result: any = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this.interpolateDeep(v, context);
      }
      return result;
    }

    return value;
  }
}
