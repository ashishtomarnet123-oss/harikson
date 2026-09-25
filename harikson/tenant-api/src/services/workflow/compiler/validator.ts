import { IWorkflowGraph, IWorkflowNode, IValidationResult, IValidationErrorItem } from '../types.js';
import { NodeRegistry } from '../nodes/registry.js';

export class WorkflowValidator {
  /**
   * Complete validation of a workflow graph DAG
   */
  public static validate(graph: IWorkflowGraph): IValidationResult {
    const errors: IValidationErrorItem[] = [];
    const warnings: IValidationErrorItem[] = [];

    const { nodes = [], edges = [] } = graph;

    // 1. Basic node count
    if (nodes.length === 0) {
      errors.push({ message: 'Workflow must contain at least one node' });
      return { valid: false, errors, warnings };
    }

    const nodeIds = new Set<string>();
    const nodeMap = new Map<string, IWorkflowNode>();

    // 2. Validate node uniqueness and registered schemas
    for (const node of nodes) {
      if (!node.id) {
        errors.push({ message: 'Every node must have a unique identifier' });
        continue;
      }

      if (nodeIds.has(node.id)) {
        errors.push({
          nodeId: node.id,
          message: `Duplicate node ID '${node.id}' detected in workflow`,
        });
      }
      nodeIds.add(node.id);
      nodeMap.set(node.id, node);

      const nodeType = (node.data?.type || node.type || '') as string;
      if (!nodeType) {
        errors.push({
          nodeId: node.id,
          message: `Node '${node.id}' is missing a valid node type`,
        });
        continue;
      }

      // Check node-level schema validation via NodeRegistry
      const configValidation = NodeRegistry.validate(nodeType, node.data?.config);
      if (!configValidation.valid) {
        for (const err of configValidation.errors) {
          errors.push({
            nodeId: node.id,
            field: err.field,
            message: `[Node ${node.id}] ${err.message}`,
          });
        }
      }
      if (configValidation.warnings) {
        for (const warn of configValidation.warnings) {
          warnings.push({
            nodeId: node.id,
            field: warn.field,
            message: `[Node ${node.id}] ${warn.message}`,
          });
        }
      }
    }

    // 3. Build adjacency lists
    const inEdges = new Map<string, string[]>();
    const outEdges = new Map<string, string[]>();

    for (const id of nodeIds) {
      inEdges.set(id, []);
      outEdges.set(id, []);
    }

    for (const edge of edges) {
      if (!edge.source || !edge.target) {
        errors.push({ message: `Edge '${edge.id}' is missing source or target` });
        continue;
      }

      if (!nodeIds.has(edge.source)) {
        errors.push({
          message: `Edge references non-existent source node '${edge.source}'`,
        });
      }
      if (!nodeIds.has(edge.target)) {
        errors.push({
          message: `Edge references non-existent target node '${edge.target}'`,
        });
      }

      if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
        inEdges.get(edge.target)!.push(edge.source);
        outEdges.get(edge.source)!.push(edge.target);
      }
    }

    // 4. Verify trigger presence
    const triggerNodes = nodes.filter((n) => {
      const type = (n.data?.type || n.type || '').toLowerCase();
      return type.startsWith('trigger') || type === 'manual' || type === 'webhook' || type === 'cron';
    });

    if (triggerNodes.length === 0) {
      errors.push({
        message: 'Workflow must have at least one trigger node (Manual, Webhook, or Cron)',
      });
    }

    // 5. Detect cycles via DFS (Directed Acyclic Graph invariant)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = outEdges.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true; // cycle found
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const id of nodeIds) {
      if (!visited.has(id)) {
        if (hasCycle(id)) {
          errors.push({
            nodeId: id,
            message: `Circular dependency / cycle detected involving node '${id}'`,
          });
          break;
        }
      }
    }

    // 6. Detect orphan / unreachable nodes
    const rootNodes = nodes.filter((n) => (inEdges.get(n.id)?.length || 0) === 0);
    const reachable = new Set<string>();

    const markReachable = (nodeId: string) => {
      reachable.add(nodeId);
      for (const next of outEdges.get(nodeId) || []) {
        if (!reachable.has(next)) markReachable(next);
      }
    };

    for (const root of rootNodes) {
      markReachable(root.id);
    }

    for (const node of nodes) {
      if (!reachable.has(node.id)) {
        warnings.push({
          nodeId: node.id,
          message: `Node '${node.id}' is disconnected and unreachable from any trigger`,
        });
      }
    }

    // 7. Verify branch handles for conditional nodes
    for (const node of nodes) {
      const type = (node.data?.type || node.type || '').toLowerCase();
      if (type === 'filter' || type === 'router' || type === 'logic.if') {
        const nodeOutEdges = edges.filter((e) => e.source === node.id);
        const hasTrue = nodeOutEdges.some((e) => e.sourceHandle === 'true');
        const hasFalse = nodeOutEdges.some((e) => e.sourceHandle === 'false');

        if (!hasTrue && !hasFalse && nodeOutEdges.length === 0) {
          warnings.push({
            nodeId: node.id,
            message: `Condition node '${node.id}' has no outgoing branches connected`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
