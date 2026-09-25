import { IWorkflowGraph, IWorkflowNode, IWorkflowEdge } from '../types.js';
import { WorkflowValidator } from './validator.js';

export interface ICompiledNode {
  id: string;
  type: string;
  node: IWorkflowNode;
  inDegree: number;
  dependencies: string[]; // Node IDs that must complete before this node can run
  dependents: string[];   // Node IDs that listen to this node's output
  outgoingEdges: IWorkflowEdge[];
  incomingEdges: IWorkflowEdge[];
}

export interface ICompiledWorkflow {
  workflowId?: string;
  version?: number;
  nodesMap: Map<string, ICompiledNode>;
  rootNodeIds: string[];
  executionPlan: string[][]; // Array of parallel execution stages in topological order
}

export class WorkflowCompiler {
  /**
   * Compile a validated workflow graph into an execution plan
   */
  public static compile(graph: IWorkflowGraph): ICompiledWorkflow {
    // 1. Validate graph first
    const validation = WorkflowValidator.validate(graph);
    if (!validation.valid) {
      const errorMsg = validation.errors.map((e) => e.message).join('; ');
      throw new Error(`Workflow validation failed: ${errorMsg}`);
    }

    const { nodes = [], edges = [] } = graph;
    const nodesMap = new Map<string, ICompiledNode>();

    for (const node of nodes) {
      nodesMap.set(node.id, {
        id: node.id,
        type: (node.data?.type || node.type || 'prompt') as string,
        node,
        inDegree: 0,
        dependencies: [],
        dependents: [],
        outgoingEdges: [],
        incomingEdges: [],
      });
    }

    // Build incoming and outgoing edges
    for (const edge of edges) {
      const source = nodesMap.get(edge.source);
      const target = nodesMap.get(edge.target);

      if (source && target) {
        source.outgoingEdges.push(edge);
        source.dependents.push(target.id);

        target.incomingEdges.push(edge);
        target.dependencies.push(source.id);
        target.inDegree += 1;
      }
    }

    // Identify root nodes (inDegree === 0 or trigger type)
    const rootNodeIds = nodes
      .filter((n) => {
        const cNode = nodesMap.get(n.id);
        return cNode && (cNode.inDegree === 0 || cNode.type.toLowerCase().startsWith('trigger'));
      })
      .map((n) => n.id);

    // Topological sort into parallel stages (Kahn's Algorithm)
    const executionPlan: string[][] = [];
    const inDegreeCopy = new Map<string, number>();

    for (const [id, cNode] of nodesMap.entries()) {
      inDegreeCopy.set(id, cNode.inDegree);
    }

    let currentQueue: string[] = rootNodeIds.slice();

    while (currentQueue.length > 0) {
      executionPlan.push([...currentQueue]);
      const nextQueue: string[] = [];

      for (const nodeId of currentQueue) {
        const cNode = nodesMap.get(nodeId);
        if (!cNode) continue;

        for (const childId of cNode.dependents) {
          const currentIn = (inDegreeCopy.get(childId) || 1) - 1;
          inDegreeCopy.set(childId, currentIn);
          if (currentIn === 0 && !nextQueue.includes(childId)) {
            nextQueue.push(childId);
          }
        }
      }

      currentQueue = nextQueue;
    }

    return {
      nodesMap,
      rootNodeIds,
      executionPlan,
    };
  }
}
