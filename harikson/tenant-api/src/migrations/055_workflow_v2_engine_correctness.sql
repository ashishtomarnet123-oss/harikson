-- Migration 055: Workflow V2 Engine Correctness
-- Drop unique constraint on (execution_id, node_id) in workflow_node_executions
-- to enable recording durable checkpoint attempts for retried nodes.

ALTER TABLE workflow_node_executions DROP CONSTRAINT IF EXISTS uq_node_execution_attempt;

-- Index for querying node attempts by execution and node
CREATE INDEX IF NOT EXISTS idx_node_executions_attempt 
  ON workflow_node_executions(execution_id, node_id, retry_count);
