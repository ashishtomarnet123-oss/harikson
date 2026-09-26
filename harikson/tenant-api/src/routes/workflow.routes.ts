import { Router } from 'express';
import { executeTenantQuery, pool } from '../db/pool.js';
import logger from '../utils/logger.js';
import { WorkflowEngine } from '../services/workflow/engine.js';
import { WorkflowValidator } from '../services/workflow/compiler/validator.js';
import { WorkflowVersionService } from '../services/workflow/version.service.js';
import { NodeRegistry } from '../services/workflow/nodes/index.js';
import { CredentialService } from '../services/workflow/credential.service.js';
import { WorkflowEventEmitter } from '../services/workflow/telemetry/events.js';
import { enqueueWorkflowExecution } from '../services/workflow/queue.js';
import { WorkflowScheduler } from '../services/workflow/scheduler.js';

const router = Router();

// ==============================================================================
// 1. METADATA & NODE REGISTRY
// ==============================================================================

// GET /api/v1/workflows/metadata/nodes - Catalog of all registered node types
router.get('/metadata/nodes', (_req, res) => {
  try {
    const nodes = NodeRegistry.getAllMetadata();
    res.json({ success: true, nodes });
  } catch (err: any) {
    logger.error('Failed to fetch node metadata:', err);
    res.status(500).json({ error: 'Failed to fetch node catalog' });
  }
});

// ==============================================================================
// 2. CREDENTIAL MANAGEMENT (Encrypted Storage)
// ==============================================================================

// GET /api/v1/workflows/credentials - List encrypted credentials for tenant
router.get('/credentials', async (req: any, res) => {
  const tenantId = req.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

  try {
    const credentials = await CredentialService.listCredentials(tenantId);
    res.json({ success: true, credentials });
  } catch (err: any) {
    logger.error('Failed to list credentials:', err);
    res.status(500).json({ error: 'Failed to list credentials' });
  }
});

// POST /api/v1/workflows/credentials - Create new encrypted credential
router.post('/credentials', async (req: any, res) => {
  const tenantId = req.tenant?.id;
  if (!tenantId) return res.status(400).json({ error: 'Tenant context required' });

  const { name, type, secretData, metadata } = req.body;
  if (!name || !type || !secretData) {
    return res.status(400).json({ error: 'Name, type, and secretData are required' });
  }

  try {
    const credential = await CredentialService.createCredential(
      tenantId,
      name,
      type,
      secretData,
      metadata || {},
      req.user?.id
    );
    res.status(201).json({ success: true, credential });
  } catch (err: any) {
    logger.error('Failed to create credential:', err);
    res.status(500).json({ error: 'Failed to create credential' });
  }
});

// PUT /api/v1/workflows/credentials/:credId - Update credential
router.put('/credentials/:credId', async (req: any, res) => {
  const tenantId = req.tenant?.id;
  const { credId } = req.params;
  const { name, secretData, metadata } = req.body;

  try {
    const updated = await CredentialService.updateCredential(tenantId, credId, name, secretData, metadata);
    if (!updated) return res.status(404).json({ error: 'Credential not found' });
    res.json({ success: true, credential: updated });
  } catch (err: any) {
    logger.error('Failed to update credential:', err);
    res.status(500).json({ error: 'Failed to update credential' });
  }
});

// DELETE /api/v1/workflows/credentials/:credId - Delete credential
router.delete('/credentials/:credId', async (req: any, res) => {
  const tenantId = req.tenant?.id;
  const { credId } = req.params;

  try {
    const deleted = await CredentialService.deleteCredential(tenantId, credId);
    if (!deleted) return res.status(404).json({ error: 'Credential not found' });
    res.json({ success: true, message: 'Credential deleted' });
  } catch (err: any) {
    logger.error('Failed to delete credential:', err);
    res.status(500).json({ error: 'Failed to delete credential' });
  }
});

// ==============================================================================
// 3. WORKFLOW TEMPLATES
// ==============================================================================

// GET /api/v1/workflows/templates - Pre-built templates catalog
router.get('/templates', async (_req, res) => {
  try {
    const templatesRes = await pool.query(
      `SELECT * FROM workflow_templates WHERE is_public = true ORDER BY created_at ASC`
    );
    res.json({ success: true, templates: templatesRes.rows });
  } catch (err: any) {
    // If templates table hasn't been migrated yet, return built-in defaults
    res.json({
      success: true,
      templates: [
        {
          name: 'AI Support Auto-Responder',
          slug: 'ai-support-auto-responder',
          category: 'Support',
          description: 'Webhook triggers LLM sentiment analysis, condition check, and transactional email alert.',
        },
        {
          name: 'Knowledge Base Vector Sync',
          slug: 'knowledge-base-vector-sync',
          category: 'AI',
          description: 'Scheduled cron checks new documents, embeds into pgvector, and dispatches Slack report.',
        },
        {
          name: 'AI Lead Qualification & CRM Sync',
          slug: 'ai-lead-qualification',
          category: 'Sales',
          description: 'Inbound lead webhook → RAG knowledge search → LLM lead scorer → CRM webhook.',
        },
      ],
    });
  }
});

// ==============================================================================
// 4. CORE WORKFLOW CRUD
// ==============================================================================

// GET /api/v1/workflows - List workflows for tenant
router.get('/', async (req: any, res) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const workflowsRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT w.*,
                (SELECT COUNT(*) FROM workflow_executions we WHERE we.workflow_id = w.id) as total_runs,
                (SELECT we2.status FROM workflow_executions we2 WHERE we2.workflow_id = w.id ORDER BY started_at DESC LIMIT 1) as last_status
         FROM workflows w
         WHERE w.tenant_id = $1
         ORDER BY w.created_at DESC`,
        [tenantId]
      )
    );

    res.json(workflowsRes.rows);
  } catch (err: any) {
    logger.error('Fetch workflows error:', err);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// POST /api/v1/workflows - Create new workflow
router.post('/', async (req: any, res) => {
  const {
    name,
    description,
    trigger_type = 'manual',
    cron_expression,
    webhook_secret,
    status = 'active',
    steps = [],
    definition,
  } = req.body;
  const tenantId = req.tenant?.id;

  if (!name) {
    return res.status(400).json({ error: 'Workflow name is required' });
  }

  try {
    const normalizedGraph = WorkflowVersionService.normalizeToGraph(definition || steps);

    const insertRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `INSERT INTO workflows (
           tenant_id, name, description, trigger_type, cron_expression, webhook_secret, status,
           steps, definition, current_version, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, NOW(), NOW())
         RETURNING *`,
        [
          tenantId,
          name,
          description || '',
          trigger_type,
          cron_expression || null,
          webhook_secret || null,
          status,
          JSON.stringify(steps),
          JSON.stringify(normalizedGraph),
        ]
      )
    );

    const workflow = insertRes.rows[0];

    // Create initial published version 1 if active
    try {
      const draft = await WorkflowVersionService.saveDraft(
        tenantId,
        workflow.id,
        normalizedGraph,
        undefined,
        'Initial version',
        req.user?.id
      );

      if (status === 'active') {
        await WorkflowVersionService.publishVersion(tenantId, workflow.id, draft.id, 'Initial published version');
      }

      await WorkflowScheduler.rearmWorkflow(workflow.id, tenantId);
    } catch (verErr: any) {
      logger.warn('[WorkflowRoutes] Could not finalize initial version or scheduler:', verErr.message);
    }

    res.status(201).json(workflow);
  } catch (err: any) {
    logger.error('Create workflow error:', err);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// GET /api/v1/workflows/:id - Get workflow details
router.get('/:id', async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.tenant?.id;

  try {
    const wfRes = await executeTenantQuery(tenantId, (client) =>
      client.query(`SELECT * FROM workflows WHERE id = $1 AND tenant_id = $2`, [id, tenantId])
    );

    if (!wfRes.rows.length) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json(wfRes.rows[0]);
  } catch (err: any) {
    logger.error('Get workflow error:', err);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

// PUT /api/v1/workflows/:id - Update workflow metadata & definition
router.put('/:id', async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.tenant?.id;
  const { name, description, trigger_type, cron_expression, webhook_secret, status, steps, definition } = req.body;

  try {
    const normalizedGraph = definition ? WorkflowVersionService.normalizeToGraph(definition) : undefined;

    const updateRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `UPDATE workflows
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             trigger_type = COALESCE($3, trigger_type),
             cron_expression = COALESCE($4, cron_expression),
             webhook_secret = COALESCE($5, webhook_secret),
             status = COALESCE($6, status),
             steps = CASE WHEN $7::jsonb IS NOT NULL THEN $7::jsonb ELSE steps END,
             definition = CASE WHEN $8::jsonb IS NOT NULL THEN $8::jsonb ELSE definition END,
             updated_at = NOW()
         WHERE id = $9 AND tenant_id = $10
         RETURNING *`,
        [
          name,
          description,
          trigger_type,
          cron_expression,
          webhook_secret,
          status,
          steps ? JSON.stringify(steps) : null,
          normalizedGraph ? JSON.stringify(normalizedGraph) : null,
          id,
          tenantId,
        ]
      )
    );

    if (!updateRes.rows.length) {
      return res.status(404).json({ error: 'Workflow not found or unauthorized' });
    }

    const updated = updateRes.rows[0];
    await WorkflowScheduler.rearmWorkflow(id, tenantId);
    res.json(updated);
  } catch (err: any) {
    logger.error('Update workflow error:', err);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// DELETE /api/v1/workflows/:id - Delete workflow
router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.tenant?.id;

  try {
    const delRes = await executeTenantQuery(tenantId, (client) =>
      client.query(`DELETE FROM workflows WHERE id = $1 AND tenant_id = $2 RETURNING id`, [id, tenantId])
    );

    if (!delRes.rows.length) {
      return res.status(404).json({ error: 'Workflow not found or unauthorized' });
    }

    await WorkflowScheduler.removeSchedule(id);
    res.json({ success: true, deletedId: id });
  } catch (err: any) {
    logger.error('Delete workflow error:', err);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// ==============================================================================
// 5. VALIDATION, VERSIONING & PUBLISHING
// ==============================================================================

// POST /api/v1/workflows/:id/validate - Validate current graph
router.post('/:id/validate', async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.tenant?.id;
  const graph = req.body.definition;

  try {
    let targetGraph = graph;
    if (!targetGraph) {
      const wfRes = await executeTenantQuery(tenantId, (client) =>
        client.query(`SELECT definition, steps FROM workflows WHERE id = $1 AND tenant_id = $2`, [id, tenantId])
      );
      if (!wfRes.rows.length) return res.status(404).json({ error: 'Workflow not found' });
      targetGraph = WorkflowVersionService.normalizeToGraph(wfRes.rows[0].definition || wfRes.rows[0].steps);
    }

    const validation = WorkflowValidator.validate(targetGraph);
    res.json({
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings || [],
    });
  } catch (err: any) {
    logger.error('Validate workflow error:', err);
    res.status(500).json({ valid: false, errors: [{ message: err.message }] });
  }
});

// GET /api/v1/workflows/:id/versions - List all versions
router.get('/:id/versions', async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.tenant?.id;

  try {
    const versions = await WorkflowVersionService.listVersions(tenantId, id);
    res.json({ success: true, versions });
  } catch (err: any) {
    logger.error('List versions error:', err);
    res.status(500).json({ error: 'Failed to list workflow versions' });
  }
});

// POST /api/v1/workflows/:id/draft - Save canvas draft
router.post('/:id/draft', async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.tenant?.id;
  const { definition, settings, changelog } = req.body;

  if (!definition) return res.status(400).json({ error: 'definition is required' });

  try {
    const draft = await WorkflowVersionService.saveDraft(
      tenantId,
      id,
      definition,
      settings,
      changelog,
      req.user?.id
    );
    res.json({ success: true, draft });
  } catch (err: any) {
    logger.error('Save draft error:', err);
    res.status(500).json({ error: err.message || 'Failed to save draft' });
  }
});

// POST /api/v1/workflows/:id/publish - Publish version to production
router.post('/:id/publish', async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.tenant?.id;
  const { versionId, changelog } = req.body;

  try {
    let targetVersionId = versionId;
    if (!targetVersionId) {
      const draft = await WorkflowVersionService.getOrCreateDraft(tenantId, id);
      targetVersionId = draft.id;
    }

    // Validate graph before publishing
    const versionRes = await executeTenantQuery(tenantId, (client) =>
      client.query(`SELECT definition FROM workflow_versions WHERE id = $1`, [targetVersionId])
    );
    if (versionRes.rows.length) {
      const graph = WorkflowVersionService.normalizeToGraph(versionRes.rows[0].definition);
      const validation = WorkflowValidator.validate(graph);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Cannot publish invalid workflow',
          validationErrors: validation.errors,
        });
      }
    }

    const published = await WorkflowVersionService.publishVersion(tenantId, id, targetVersionId, changelog);
    await WorkflowScheduler.rearmWorkflow(id, tenantId);
    res.json({ success: true, published });
  } catch (err: any) {
    logger.error('Publish version error:', err);
    res.status(500).json({ error: err.message || 'Failed to publish workflow' });
  }
});

// POST /api/v1/workflows/:id/rollback - Rollback to past version
router.post('/:id/rollback', async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.tenant?.id;
  const { targetVersionId } = req.body;

  if (!targetVersionId) return res.status(400).json({ error: 'targetVersionId is required' });

  try {
    const rolledBack = await WorkflowVersionService.rollbackToVersion(
      tenantId,
      id,
      targetVersionId,
      req.user?.id
    );
    await WorkflowScheduler.rearmWorkflow(id, tenantId);
    res.json({ success: true, version: rolledBack });
  } catch (err: any) {
    logger.error('Rollback error:', err);
    res.status(500).json({ error: err.message || 'Failed to rollback version' });
  }
});

// ==============================================================================
// 6. EXECUTION & REAL-TIME TELEMETRY
// ==============================================================================

// POST /api/v1/workflows/:id/run or /execute - Manually execute workflow via BullMQ queue
router.post(['/:id/run', '/:id/execute'], async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.tenant?.id;
  const triggerPayload = req.body || {};

  try {
    const checkRes = await executeTenantQuery(tenantId, (client) =>
      client.query(`SELECT id, status FROM workflows WHERE id = $1 AND tenant_id = $2`, [id, tenantId])
    );

    if (!checkRes.rows.length) {
      return res.status(404).json({ error: 'Workflow not found or unauthorized' });
    }

    const version = await WorkflowVersionService.getPublishedVersion(tenantId, id);
    if (!version) {
      return res.status(400).json({
        error: 'Cannot execute workflow: No active or published version found. Workflows must be published before execution.',
      });
    }

    // Pre-create execution record with 'queued' status
    const execRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `INSERT INTO workflow_executions (
           workflow_id, workflow_version_id, tenant_id, status, trigger_type, trigger_payload, started_at
         ) VALUES ($1, $2, $3, 'queued', 'manual', $4, NOW()) RETURNING id`,
        [id, version.id, tenantId, JSON.stringify(triggerPayload)]
      )
    );
    const executionId = execRes.rows[0].id;

    // Enqueue to BullMQ
    await enqueueWorkflowExecution({
      executionId,
      workflowId: id,
      triggerType: 'manual',
      payload: triggerPayload,
      tenantId,
    });

    res.status(202).json({
      success: true,
      executionId,
      status: 'queued',
      message: 'Workflow queued for execution',
    });
  } catch (err: any) {
    logger.error('Run workflow error:', err);
    res.status(500).json({ error: err.message || 'Failed to queue workflow run' });
  }
});

// GET /api/v1/workflows/:id/executions - Fetch execution history
router.get('/:id/executions', async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.tenant?.id;

  try {
    const execRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT id, workflow_id, workflow_version_id, status, started_at, completed_at, duration_ms, logs, error_message, step_results, trigger_type
         FROM workflow_executions
         WHERE workflow_id = $1 AND tenant_id = $2
         ORDER BY started_at DESC
         LIMIT 50`,
        [id, tenantId]
      )
    );

    res.json(execRes.rows);
  } catch (err: any) {
    logger.error('Fetch executions error:', err);
    res.status(500).json({ error: 'Failed to fetch execution history' });
  }
});

// GET /api/v1/workflows/:id/executions/:execId - Get single execution with durable checkpoints
router.get('/:id/executions/:execId', async (req: any, res) => {
  const { id, execId } = req.params;
  const tenantId = req.tenant?.id;

  try {
    const execRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT * FROM workflow_executions WHERE id = $1 AND workflow_id = $2 AND tenant_id = $3`,
        [execId, id, tenantId]
      )
    );

    if (!execRes.rows.length) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    const nodeExecsRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT * FROM workflow_node_executions WHERE execution_id = $1 ORDER BY started_at ASC`,
        [execId]
      )
    );

    res.json({
      success: true,
      execution: execRes.rows[0],
      nodeExecutions: nodeExecsRes.rows,
    });
  } catch (err: any) {
    logger.error('Fetch execution details error:', err);
    res.status(500).json({ error: 'Failed to fetch execution details' });
  }
});

// POST /api/v1/workflows/:id/executions/:execId/retry - Re-enqueue failed execution with same payload via BullMQ
router.post('/:id/executions/:execId/retry', async (req: any, res) => {
  const { id, execId } = req.params;
  const tenantId = req.tenant?.id;

  try {
    const prevRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT * FROM workflow_executions WHERE id = $1 AND workflow_id = $2 AND tenant_id = $3`,
        [execId, id, tenantId]
      )
    );

    if (!prevRes.rows.length) {
      return res.status(404).json({ error: 'Execution not found or unauthorized' });
    }

    const prev = prevRes.rows[0];
    const triggerPayload =
      typeof prev.trigger_payload === 'string'
        ? JSON.parse(prev.trigger_payload)
        : prev.trigger_payload || {};
    const triggerType = prev.trigger_type || 'manual';

    const version =
      (await WorkflowVersionService.getPublishedVersion(tenantId, id)) || { id: prev.workflow_version_id };

    // Pre-create new execution record with 'queued' status
    const newExecRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `INSERT INTO workflow_executions (
           workflow_id, workflow_version_id, tenant_id, status, trigger_type, trigger_payload, started_at
         ) VALUES ($1, $2, $3, 'queued', $4, $5, NOW()) RETURNING id`,
        [id, version.id, tenantId, triggerType, JSON.stringify(triggerPayload)]
      )
    );
    const newExecutionId = newExecRes.rows[0].id;

    // Enqueue to BullMQ
    await enqueueWorkflowExecution({
      executionId: newExecutionId,
      workflowId: id,
      triggerType: triggerType as any,
      payload: triggerPayload,
      tenantId,
    });

    res.status(202).json({
      success: true,
      executionId: newExecutionId,
      status: 'queued',
      message: 'Execution re-queued for retry with original trigger payload',
    });
  } catch (err: any) {
    logger.error('Retry execution error:', err);
    res.status(500).json({ error: err.message || 'Failed to retry execution' });
  }
});

// POST /api/v1/workflows/:id/run-from-node - Execute downstream subgraph from specific node using checkpoints
router.post('/:id/run-from-node', async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.tenant?.id;
  const { startNodeId, previousExecutionId } = req.body;

  if (!startNodeId) {
    return res.status(400).json({ error: 'startNodeId is required' });
  }

  try {
    const version = await WorkflowVersionService.getPublishedVersion(tenantId, id);
    if (!version) {
      return res.status(400).json({ error: 'No published workflow version found' });
    }

    let initialNodesOutputs: Record<string, any> = {};
    let triggerPayload: Record<string, any> = {};
    let triggerType = 'manual';

    if (previousExecutionId) {
      // 1. Fetch checkpoints from previous execution
      const checkpointsRes = await executeTenantQuery(tenantId, (client) =>
        client.query(
          `SELECT node_id, output FROM workflow_node_executions 
           WHERE execution_id = $1 AND status = 'success'`,
          [previousExecutionId]
        )
      );

      for (const row of checkpointsRes.rows) {
        if (row.node_id) {
          initialNodesOutputs[row.node_id] = row.output;
        }
      }

      // 2. Fetch original trigger payload
      const prevExecRes = await executeTenantQuery(tenantId, (client) =>
        client.query(`SELECT trigger_payload, trigger_type FROM workflow_executions WHERE id = $1`, [
          previousExecutionId,
        ])
      );
      if (prevExecRes.rows.length) {
        triggerPayload =
          typeof prevExecRes.rows[0].trigger_payload === 'string'
            ? JSON.parse(prevExecRes.rows[0].trigger_payload)
            : prevExecRes.rows[0].trigger_payload || {};
        triggerType = prevExecRes.rows[0].trigger_type || 'manual';
      }
    }

    // Pre-create execution record with 'queued' status
    const execRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `INSERT INTO workflow_executions (
           workflow_id, workflow_version_id, tenant_id, status, trigger_type, trigger_payload, started_at
         ) VALUES ($1, $2, $3, 'queued', $4, $5, NOW()) RETURNING id`,
        [id, version.id, tenantId, triggerType, JSON.stringify(triggerPayload)]
      )
    );
    const executionId = execRes.rows[0].id;

    // Enqueue execution to BullMQ with startNodeId and initialNodesOutputs
    await enqueueWorkflowExecution({
      executionId,
      workflowId: id,
      triggerType: triggerType as any,
      payload: triggerPayload,
      tenantId,
      options: {
        startNodeId,
        initialNodesOutputs,
      },
    });

    res.status(202).json({
      success: true,
      executionId,
      status: 'queued',
      startNodeId,
      message: `Execution queued starting downstream from node ${startNodeId}`,
    });
  } catch (err: any) {
    logger.error('Run from node error:', err);
    res.status(500).json({ error: err.message || 'Failed to execute downstream from node' });
  }
});

// GET /api/v1/workflows/:id/executions/:execId/events - Server-Sent Events (SSE) telemetry stream
router.get('/:id/executions/:execId/events', (req: any, res) => {
  const { execId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial ping
  res.write(`data: ${JSON.stringify({ event: 'connected', executionId: execId })}\n\n`);

  const unsubscribe = WorkflowEventEmitter.subscribeExecution(execId, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
  });
});

// ==============================================================================
// 7. INBOUND WEBHOOK ENDPOINTS
// ==============================================================================

// POST /api/v1/workflows/:id/trigger or /webhook/:token - Inbound Webhook
router.post(['/:id/trigger', '/:id/webhook', '/:id/webhook/:token'], async (req: any, res) => {
  const { id, token } = req.params;
  const secretHeader = req.headers['x-workflow-secret'] || req.query.secret || token;
  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body?.idempotency_key || req.body?.idempotencyKey;

  try {
    const wfRes = await pool.query(
      `SELECT id, tenant_id, status, webhook_secret, trigger_type FROM workflows WHERE id = $1`,
      [id]
    );

    if (!wfRes.rows.length) {
      return res.status(404).json({ error: 'Workflow webhook endpoint not found' });
    }

    const workflow = wfRes.rows[0];

    if (workflow.status !== 'active') {
      return res.status(400).json({ error: 'Workflow is paused or inactive' });
    }

    if (workflow.webhook_secret && workflow.webhook_secret !== secretHeader) {
      return res.status(401).json({ error: 'Invalid or missing webhook secret' });
    }

    // Idempotency: on webhook-triggered execution, if matching row exists, return 200 with existing executionId
    if (idempotencyKey) {
      const existing = await pool.query(
        `SELECT id, status FROM workflow_executions 
         WHERE tenant_id = $1 AND idempotency_key = $2 LIMIT 1`,
        [workflow.tenant_id, idempotencyKey]
      );
      if (existing.rows.length > 0) {
        return res.status(200).json({
          success: true,
          executionId: existing.rows[0].id,
          status: existing.rows[0].status,
          duplicate: true,
          message: 'Idempotent request: returning existing execution',
        });
      }
    }

    const version = await WorkflowVersionService.getPublishedVersion(workflow.tenant_id, id);
    if (!version) {
      return res.status(400).json({ error: 'Cannot trigger workflow: No published version found.' });
    }

    const payload = req.body || {};

    // Pre-create execution record with 'queued' status and idempotency_key
    const execRes = await pool.query(
      `INSERT INTO workflow_executions (
         workflow_id, workflow_version_id, tenant_id, status, trigger_type, trigger_payload, idempotency_key, started_at
       ) VALUES ($1, $2, $3, 'queued', 'webhook', $4, $5, NOW()) RETURNING id`,
      [workflow.id, version.id, workflow.tenant_id, JSON.stringify(payload), idempotencyKey || null]
    );
    const executionId = execRes.rows[0].id;

    // Enqueue to BullMQ worker (unified with manual execution)
    await enqueueWorkflowExecution({
      executionId,
      workflowId: workflow.id,
      triggerType: 'webhook',
      payload,
      tenantId: workflow.tenant_id,
    });

    res.status(202).json({
      success: true,
      executionId,
      status: 'queued',
      message: 'Workflow webhook accepted and queued for execution',
      workflow_id: workflow.id,
    });
  } catch (err: any) {
    logger.error('Workflow webhook error:', err);
    res.status(500).json({ error: 'Failed to process webhook trigger' });
  }
});

export default router;
