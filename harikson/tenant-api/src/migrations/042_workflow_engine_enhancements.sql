-- Migration 042: Workflow Engine Enhancements and Schema Alignment
-- Ensures workflows and workflow_executions have all necessary fields for
-- multi-step autonomous execution, BullMQ scheduling, webhook triggering, and step telemetry.

-- 1. Ensure columns on workflows table
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(50) DEFAULT 'manual';
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS cron_expression VARCHAR(100);
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS webhook_secret VARCHAR(255);
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS execution_count INT DEFAULT 0;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS last_execution_at TIMESTAMPTZ;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS avg_duration_ms INT DEFAULT 0;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS success_rate NUMERIC(5,2) DEFAULT 100.00;
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Ensure columns on workflow_executions table
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS duration_ms INT DEFAULT 0;
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS logs TEXT;
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS step_results JSONB DEFAULT '[]'::jsonb;
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS trigger_payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE workflow_executions ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(50) DEFAULT 'manual';

-- 3. Indexes for high performance querying and scheduling
CREATE INDEX IF NOT EXISTS idx_workflows_tenant_status
  ON workflows (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_workflows_cron
  ON workflows (trigger_type, status)
  WHERE trigger_type = 'cron' AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_workflow_executions_wf_started
  ON workflow_executions (workflow_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_tenant
  ON workflow_executions (tenant_id, started_at DESC);
