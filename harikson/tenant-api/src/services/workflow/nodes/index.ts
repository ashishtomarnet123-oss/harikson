import { NodeRegistry } from './registry.js';
import { ManualTriggerNode, WebhookTriggerNode, CronTriggerNode } from './triggers.js';
import { LlmNode, RagNode, AgentNode } from './ai.js';
import { IfConditionNode, SwitchNode, DelayNode, LoopNode } from './logic.js';
import { HttpNode, TransformNode, CodeNode, EmailNode, SlackNode } from './integrations.js';

let initialized = false;

export function initializeNodeRegistry(): void {
  if (initialized) return;

  // Triggers
  NodeRegistry.register(ManualTriggerNode);
  NodeRegistry.register(WebhookTriggerNode);
  NodeRegistry.register(CronTriggerNode);

  // AI & RAG
  NodeRegistry.register(LlmNode);
  NodeRegistry.register(RagNode);
  NodeRegistry.register(AgentNode);

  // Logic & Control Flow
  NodeRegistry.register(IfConditionNode);
  NodeRegistry.register(SwitchNode);
  NodeRegistry.register(DelayNode);
  NodeRegistry.register(LoopNode);

  // Integrations & Utilities
  NodeRegistry.register(HttpNode);
  NodeRegistry.register(TransformNode);
  NodeRegistry.register(CodeNode);
  NodeRegistry.register(EmailNode);
  NodeRegistry.register(SlackNode);

  initialized = true;
}

// Auto-initialize on import
initializeNodeRegistry();

export { NodeRegistry };
