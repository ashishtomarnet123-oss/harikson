import { executeTenantQuery } from '../../db/pool.js';
import { IWorkflowGraph, IWorkflowSettings, IWorkflowVersion, WorkflowVersionStatus } from './types.js';
import { Logger } from '../../observability/logger.js';

export class WorkflowVersionService {
  /**
   * Normalize legacy linear steps into graph representation if needed
   */
  public static normalizeToGraph(definitionOrSteps: any): IWorkflowGraph {
    if (!definitionOrSteps) {
      return { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
    }

    // Already a graph
    if (typeof definitionOrSteps === 'object' && Array.isArray(definitionOrSteps.nodes)) {
      return {
        nodes: definitionOrSteps.nodes,
        edges: Array.isArray(definitionOrSteps.edges) ? definitionOrSteps.edges : [],
        viewport: definitionOrSteps.viewport || { x: 0, y: 0, zoom: 1 },
      };
    }

    // Legacy linear steps array
    if (Array.isArray(definitionOrSteps)) {
      const nodes = definitionOrSteps.map((step: any, index: number) => ({
        id: step.id ? String(step.id) : `step_${index + 1}`,
        type: step.type || 'prompt',
        position: { x: 100 + index * 280, y: 200 },
        data: {
          label: step.name || `Step ${index + 1}`,
          type: step.type,
          value: step.value,
          config: step.config || {},
        },
      }));

      const edges = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        edges.push({
          id: `edge_${nodes[i].id}_to_${nodes[i + 1].id}`,
          source: nodes[i].id,
          target: nodes[i + 1].id,
        });
      }

      return { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } };
    }

    return { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
  }

  /**
   * Retrieve the currently active/published version for execution
   */
  public static async getPublishedVersion(
    tenantId: string,
    workflowId: string
  ): Promise<IWorkflowVersion | null> {
    const res = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT wv.*
         FROM workflows w
         JOIN workflow_versions wv ON wv.id = w.published_version_id
         WHERE w.id = $1 AND w.tenant_id = $2`,
        [workflowId, tenantId]
      )
    );

    if (res.rows.length) {
      return this.mapVersionRow(res.rows[0]);
    }

    // Fallback: look for latest published version in workflow_versions table
    const fallbackRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT *
         FROM workflow_versions
         WHERE workflow_id = $1 AND tenant_id = $2 AND status = 'published'
         ORDER BY version DESC LIMIT 1`,
        [workflowId, tenantId]
      )
    );

    if (fallbackRes.rows.length) {
      return this.mapVersionRow(fallbackRes.rows[0]);
    }

    return null;
  }

  /**
   * Retrieve or create the current draft version for editing
   */
  public static async getOrCreateDraft(
    tenantId: string,
    workflowId: string,
    userId?: string
  ): Promise<IWorkflowVersion> {
    // 1. Check if draft already exists
    const draftRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT *
         FROM workflow_versions
         WHERE workflow_id = $1 AND tenant_id = $2 AND status = 'draft'
         ORDER BY version DESC LIMIT 1`,
        [workflowId, tenantId]
      )
    );

    if (draftRes.rows.length) {
      return this.mapVersionRow(draftRes.rows[0]);
    }

    // 2. Fetch workflow and highest version number
    const wfRes = await executeTenantQuery(tenantId, (client) =>
      client.query(`SELECT * FROM workflows WHERE id = $1 AND tenant_id = $2`, [workflowId, tenantId])
    );
    if (!wfRes.rows.length) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    const wf = wfRes.rows[0];

    const maxVerRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT COALESCE(MAX(version), 0) as max_ver FROM workflow_versions WHERE workflow_id = $1 AND tenant_id = $2`,
        [workflowId, tenantId]
      )
    );
    const nextVer = (maxVerRes.rows[0]?.max_ver || 0) + 1;

    // Use latest published definition as draft base
    const basePublished = await this.getPublishedVersion(tenantId, workflowId);
    const definition = basePublished
      ? basePublished.definition
      : this.normalizeToGraph(wf.definition || wf.steps);

    const insertRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `INSERT INTO workflow_versions (
           workflow_id, tenant_id, version, status, name, description, definition, settings, created_by
         ) VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          workflowId,
          tenantId,
          nextVer,
          wf.name,
          wf.description,
          JSON.stringify(definition),
          JSON.stringify(wf.settings || {}),
          userId || null,
        ]
      )
    );

    return this.mapVersionRow(insertRes.rows[0]);
  }

  /**
   * Save canvas changes to draft without affecting published execution
   */
  public static async saveDraft(
    tenantId: string,
    workflowId: string,
    definition: IWorkflowGraph,
    settings?: IWorkflowSettings,
    changelog?: string,
    userId?: string
  ): Promise<IWorkflowVersion> {
    const draft = await this.getOrCreateDraft(tenantId, workflowId, userId);

    const updateRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `UPDATE workflow_versions
         SET definition = $1,
             settings = COALESCE($2, settings),
             changelog = COALESCE($3, changelog),
             updated_at = NOW()
         WHERE id = $4 AND tenant_id = $5
         RETURNING *`,
        [JSON.stringify(definition), settings ? JSON.stringify(settings) : null, changelog || null, draft.id, tenantId]
      )
    );

    // Also update draft preview in workflows table definition
    await executeTenantQuery(tenantId, (client) =>
      client.query(
        `UPDATE workflows
         SET definition = $1,
             updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3`,
        [JSON.stringify(definition), workflowId, tenantId]
      )
    );

    Logger.info(`[WorkflowVersionService] Saved draft version ${draft.version} for workflow ${workflowId}`);
    return this.mapVersionRow(updateRes.rows[0]);
  }

  /**
   * Publish draft to production:
   * Sets draft status to 'published', updates workflow.published_version_id,
   * archives previous published versions.
   */
  public static async publishVersion(
    tenantId: string,
    workflowId: string,
    versionId: string,
    changelog?: string
  ): Promise<IWorkflowVersion> {
    return await executeTenantQuery(tenantId, async (client) => {
      // 1. Demote any previously published versions to 'archived'
      await client.query(
        `UPDATE workflow_versions
         SET status = 'archived', updated_at = NOW()
         WHERE workflow_id = $1 AND tenant_id = $2 AND status = 'published'`,
        [workflowId, tenantId]
      );

      // 2. Promote target version to 'published'
      const pubRes = await client.query(
        `UPDATE workflow_versions
         SET status = 'published',
             changelog = COALESCE($1, changelog),
             updated_at = NOW()
         WHERE id = $2 AND workflow_id = $3 AND tenant_id = $4
         RETURNING *`,
        [changelog || 'Published production release', versionId, workflowId, tenantId]
      );

      if (!pubRes.rows.length) {
        throw new Error(`Version ${versionId} not found for workflow ${workflowId}`);
      }

      const published = pubRes.rows[0];

      // 3. Update master workflows record pointers
      await client.query(
        `UPDATE workflows
         SET published_version_id = $1,
             active_version_id = $1,
             current_version = $2,
             status = 'active',
             definition = $3,
             updated_at = NOW()
         WHERE id = $4 AND tenant_id = $5`,
        [published.id, published.version, published.definition, workflowId, tenantId]
      );

      Logger.info(`[WorkflowVersionService] Successfully published version ${published.version} for workflow ${workflowId}`);
      return WorkflowVersionService.mapVersionRow(published);
    });
  }

  /**
   * List all versions for a workflow
   */
  public static async listVersions(tenantId: string, workflowId: string): Promise<IWorkflowVersion[]> {
    const res = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT *
         FROM workflow_versions
         WHERE workflow_id = $1 AND tenant_id = $2
         ORDER BY version DESC`,
        [workflowId, tenantId]
      )
    );

    return res.rows.map((row) => this.mapVersionRow(row));
  }

  /**
   * Rollback to a specific historical version by creating a new published copy
   */
  public static async rollbackToVersion(
    tenantId: string,
    workflowId: string,
    targetVersionId: string,
    userId?: string
  ): Promise<IWorkflowVersion> {
    const target = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT * FROM workflow_versions WHERE id = $1 AND workflow_id = $2 AND tenant_id = $3`,
        [targetVersionId, workflowId, tenantId]
      )
    );

    if (!target.rows.length) {
      throw new Error(`Target rollback version ${targetVersionId} not found`);
    }

    const targetVer = target.rows[0];
    const maxVerRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT COALESCE(MAX(version), 0) as max_ver FROM workflow_versions WHERE workflow_id = $1 AND tenant_id = $2`,
        [workflowId, tenantId]
      )
    );
    const nextVer = (maxVerRes.rows[0]?.max_ver || 0) + 1;

    // Create a new version with the rolled-back definition
    const insertRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `INSERT INTO workflow_versions (
           workflow_id, tenant_id, version, status, name, description, definition, settings, changelog, created_by
         ) VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          workflowId,
          tenantId,
          nextVer,
          targetVer.name,
          targetVer.description,
          targetVer.definition,
          targetVer.settings,
          `Rollback from version ${targetVer.version}`,
          userId || null,
        ]
      )
    );

    const newDraft = insertRes.rows[0];
    // Publish it immediately as the active version
    return await this.publishVersion(tenantId, workflowId, newDraft.id, `Rollback to version ${targetVer.version}`);
  }

  private static mapVersionRow(row: any): IWorkflowVersion {
    const def = typeof row.definition === 'string' ? JSON.parse(row.definition) : row.definition;
    const settings = typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings;

    return {
      id: row.id,
      workflowId: row.workflow_id,
      tenantId: row.tenant_id,
      version: row.version,
      status: row.status as WorkflowVersionStatus,
      name: row.name,
      description: row.description,
      definition: this.normalizeToGraph(def),
      settings: settings || {},
      changelog: row.changelog,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
