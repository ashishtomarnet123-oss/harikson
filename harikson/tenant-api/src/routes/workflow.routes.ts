import { Router } from 'express';
import { executeTenantQuery, pool } from '../db/pool.js';
import logger from '../utils/logger.js';
import { WorkflowEngine } from '../services/workflow/engine.js';

const router = Router();

// GET /api/workflows - List workflows for tenant
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

// POST /api/workflows - Create new workflow
router.post('/', async (req: any, res) => {
  const { name, description, trigger_type = 'manual', cron_expression, webhook_secret, status = 'active', steps = [] } = req.body;
  const tenantId = req.tenant?.id;

  if (!name) {
    return res.status(400).json({ error: 'Workflow name is required' });
  }

  try {
    const insertRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `INSERT INTO workflows (tenant_id, name, description, trigger_type, cron_expression, webhook_secret, status, steps, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
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
        ]
      )
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err: any) {
    logger.error('Create workflow error:', err);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// GET /api/workflows/:id - Get workflow details
router.get('/:id', async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.tenant?.id;

  try {
    const wfRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT * FROM workflows WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      )
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

// PUT /api/workflows/:id - Update workflow
router.put('/:id', async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.tenant?.id;
  const { name, description, trigger_type, cron_expression, webhook_secret, status, steps } = req.body;

  try {
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
             updated_at = NOW()
         WHERE id = $8 AND tenant_id = $9
         RETURNING *`,
        [
          name,
          description,
          trigger_type,
          cron_expression,
          webhook_secret,
          status,
          steps ? JSON.stringify(steps) : null,
          id,
          tenantId,
        ]
      )
    );

    if (!updateRes.rows.length) {
      return res.status(404).json({ error: 'Workflow not found or unauthorized' });
    }

    res.json(updateRes.rows[0]);
  } catch (err: any) {
    logger.error('Update workflow error:', err);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// DELETE /api/workflows/:id - Delete workflow
router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.tenant?.id;

  try {
    const delRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `DELETE FROM workflows WHERE id = $1 AND tenant_id = $2 RETURNING id`,
        [id, tenantId]
      )
    );

    if (!delRes.rows.length) {
      return res.status(404).json({ error: 'Workflow not found or unauthorized' });
    }

    res.json({ success: true, deletedId: id });
  } catch (err: any) {
    logger.error('Delete workflow error:', err);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// POST /api/workflows/:id/run - Manually execute workflow
router.post('/:id/run', async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.tenant?.id;
  const triggerPayload = req.body || {};

  try {
    // Check existence
    const checkRes = await executeTenantQuery(tenantId, (client) =>
      client.query(`SELECT id, status FROM workflows WHERE id = $1 AND tenant_id = $2`, [id, tenantId])
    );

    if (!checkRes.rows.length) {
      return res.status(404).json({ error: 'Workflow not found or unauthorized' });
    }

    // Execute through WorkflowEngine
    const executionResult = await WorkflowEngine.executeWorkflow(
      id,
      'manual',
      triggerPayload,
      tenantId
    );

    res.json({
      success: executionResult.status === 'completed',
      message: `Workflow executed with status: ${executionResult.status}`,
      ...executionResult,
    });
  } catch (err: any) {
    logger.error('Run workflow error:', err);
    res.status(500).json({ error: err.message || 'Failed to run workflow' });
  }
});

// GET /api/workflows/:id/executions - Fetch execution runs history
router.get('/:id/executions', async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.tenant?.id;

  try {
    const execRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT id, workflow_id, status, started_at, completed_at, duration_ms, logs, error_message, step_results, trigger_type
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

// POST /api/workflows/:id/trigger - Inbound Webhook HTTP Endpoint
// Can be triggered from external services without session cookie if webhook_secret matches or is open
router.post('/:id/trigger', async (req: any, res) => {
  const { id } = req.params;
  const secretHeader = req.headers['x-workflow-secret'] || req.query.secret;

  try {
    // Lookup workflow without strict session tenant (public trigger)
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

    const payload = req.body || {};

    // Asynchronously run workflow so webhook client gets immediate acknowledgement
    setImmediate(async () => {
      try {
        await WorkflowEngine.executeWorkflow(
          workflow.id,
          'webhook',
          payload,
          workflow.tenant_id
        );
      } catch (runErr) {
        logger.error('Async webhook workflow execution error:', runErr);
      }
    });

    res.status(202).json({
      success: true,
      message: 'Workflow webhook accepted and queued for execution',
      workflow_id: workflow.id,
    });
  } catch (err: any) {
    logger.error('Workflow webhook trigger error:', err);
    res.status(500).json({ error: 'Failed to process webhook trigger' });
  }
});

export default router;
