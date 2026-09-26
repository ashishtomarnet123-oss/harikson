import { pool } from '../../db/pool.js';
import logger from '../../utils/logger.js';
import { getWorkflowQueue } from './queue.js';

export class WorkflowScheduler {
  private static isInitialized = false;

  /**
   * Initialize cron workflow scheduler on application startup.
   * Scans all active workflows with trigger_type='cron' and registers repeatable jobs.
   */
  public static async init(): Promise<void> {
    try {
      const queue = getWorkflowQueue();
      logger.info('⏰ [WorkflowScheduler] Initializing workflow cron scheduler...');

      // 1. Fetch all active cron workflows across all tenants
      const res = await pool.query(
        `SELECT id, tenant_id, name, cron_expression, status 
         FROM workflows 
         WHERE trigger_type = 'cron' AND status = 'active' AND cron_expression IS NOT NULL`
      );

      // 2. Fetch existing repeatable jobs to avoid stale schedules
      let existingRepeatables: any[] = [];
      try {
        existingRepeatables = await queue.getRepeatableJobs();
      } catch (err: any) {
        logger.warn('[WorkflowScheduler] Could not inspect existing repeatable jobs (Redis may still be connecting):', err.message);
      }

      // Remove existing workflow cron jobs
      for (const rep of existingRepeatables) {
        if (rep.name && rep.name.startsWith('cron-wf-')) {
          try {
            await queue.removeRepeatableByKey(rep.key);
          } catch (remErr) {
            // Ignore removal errors for stale keys
          }
        }
      }

      // 3. Register each active cron workflow
      let scheduledCount = 0;
      for (const wf of res.rows) {
        if (!wf.cron_expression || !wf.cron_expression.trim()) continue;
        try {
          await this.scheduleWorkflow(wf.id, wf.tenant_id, wf.cron_expression.trim());
          scheduledCount++;
        } catch (schedErr: any) {
          logger.error(`[WorkflowScheduler] Failed to schedule workflow ${wf.id} (${wf.cron_expression}):`, schedErr.message);
        }
      }

      this.isInitialized = true;
      logger.info(`⏰ [WorkflowScheduler] Successfully registered ${scheduledCount} active cron workflow schedules.`);
    } catch (err: any) {
      logger.error('❌ [WorkflowScheduler] Error initializing workflow scheduler:', err);
    }
  }

  /**
   * Schedule a single workflow with a cron pattern
   */
  public static async scheduleWorkflow(workflowId: string, tenantId: string, cronExpression: string): Promise<void> {
    const queue = getWorkflowQueue();
    const jobName = `cron-wf-${workflowId}`;

    await queue.add(
      jobName,
      {
        workflowId,
        tenantId,
        triggerType: 'cron',
        payload: { scheduledAt: new Date().toISOString() },
      },
      {
        repeat: {
          pattern: cronExpression,
        },
        jobId: `repeat-${workflowId}`,
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 7 * 86400 },
      }
    );

    logger.info(`⏰ [WorkflowScheduler] Scheduled workflow ${workflowId} with pattern "${cronExpression}"`);
  }

  /**
   * Remove any active cron schedule for a workflow
   */
  public static async removeSchedule(workflowId: string): Promise<void> {
    try {
      const queue = getWorkflowQueue();
      const existingRepeatables = await queue.getRepeatableJobs();
      const jobName = `cron-wf-${workflowId}`;

      for (const rep of existingRepeatables) {
        if (rep.name === jobName || rep.id === `repeat-${workflowId}`) {
          await queue.removeRepeatableByKey(rep.key);
          logger.info(`⏰ [WorkflowScheduler] Removed cron schedule for workflow ${workflowId}`);
        }
      }
    } catch (err: any) {
      logger.warn(`[WorkflowScheduler] Failed to remove schedule for ${workflowId}:`, err.message);
    }
  }

  /**
   * Re-arm / refresh schedule when a workflow is updated, published, paused, or deleted
   */
  public static async rearmWorkflow(workflowId: string, tenantId: string): Promise<void> {
    try {
      // 1. Remove any previous schedule first
      await this.removeSchedule(workflowId);

      // 2. Check if workflow is currently active with cron trigger
      const res = await pool.query(
        `SELECT id, tenant_id, trigger_type, status, cron_expression 
         FROM workflows 
         WHERE id = $1 AND tenant_id = $2`,
        [workflowId, tenantId]
      );

      if (!res.rows.length) return;
      const wf = res.rows[0];

      if (wf.trigger_type === 'cron' && wf.status === 'active' && wf.cron_expression?.trim()) {
        await this.scheduleWorkflow(wf.id, wf.tenant_id, wf.cron_expression.trim());
      }
    } catch (err: any) {
      logger.error(`[WorkflowScheduler] Failed to re-arm workflow ${workflowId}:`, err);
    }
  }
}
