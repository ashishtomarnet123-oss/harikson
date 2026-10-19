import { Router, Request, Response } from 'express';
import { executeTenantQuery } from '../db/pool.js';
import logger from '../utils/logger.js';
import {
  requireCustomModels,
  PLATFORM_DEFAULT_MODELS,
  isPlatformDefaultModel,
} from '../middleware/entitlements.js';
import { CredentialService } from '../services/workflow/credential.service.js';

const router = Router();

// Model identifier validation: alphanumeric, dash, dot, underscore, colon, 2-100 chars
const MODEL_IDENTIFIER_REGEX = /^[a-zA-Z0-9_\-.:]{2,100}$/;

function maskApiKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '****';
  return `${trimmed.slice(0, 3)}****${trimmed.slice(-4)}`;
}

function sanitizeModelRecord(row: any) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    modelIdentifier: row.model_identifier,
    baseModel: row.base_model,
    provider: row.provider,
    endpointUrl: row.endpoint_url || null,
    apiKeyMasked: row.api_key_masked || null,
    description: row.description || '',
    status: row.status || 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/models
 * Catalog of available models for this tenant.
 * Default platform models are always included for all tiers.
 * If tenant has custom_models entitlement, tenant-registered custom models are appended.
 */
router.get('/', async (req: any, res: Response) => {
  const tenantId = req.tenant?.id;
  let customModelsList: any[] = [];

  if (tenantId && req.entitlements?.customModels) {
    try {
      const customRes = await executeTenantQuery(tenantId, (client) =>
        client.query(
          `SELECT id, tenant_id, name, model_identifier, base_model, provider, endpoint_url, api_key_masked, description, status, created_at, updated_at
           FROM tenant_custom_models
           WHERE tenant_id = $1 AND status = 'active'
           ORDER BY created_at DESC`,
          [tenantId]
        )
      );
      customModelsList = (customRes.rows || []).map(sanitizeModelRecord);
    } catch (err: any) {
      logger.warn('Failed to load custom models for tenant:', err.message);
    }
  }

  const allModelIdentifiers = [
    ...PLATFORM_DEFAULT_MODELS,
    ...customModelsList.map((m) => m.modelIdentifier),
  ];

  res.status(200).json({
    models: allModelIdentifiers,
    platformModels: PLATFORM_DEFAULT_MODELS,
    customModels: customModelsList,
    entitlements: {
      customModelsEnabled: !!req.entitlements?.customModels,
      currentPlan: req.entitlements?.planId || 'free',
    },
  });
});

/**
 * GET /api/models/custom
 * Lists registered custom models for the authenticated tenant.
 * Requires custom_models entitlement (HTTP 403 PLAN_FEATURE_DISABLED if unentitled).
 */
router.get('/custom', requireCustomModels, async (req: any, res: Response) => {
  const tenantId = req.tenant.id;

  try {
    const result = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT id, tenant_id, name, model_identifier, base_model, provider, endpoint_url, api_key_masked, description, status, created_at, updated_at
         FROM tenant_custom_models
         WHERE tenant_id = $1
         ORDER BY created_at DESC`,
        [tenantId]
      )
    );

    const models = (result.rows || []).map(sanitizeModelRecord);
    res.status(200).json({ customModels: models });
  } catch (err: any) {
    logger.error('Failed to fetch custom models:', err);
    res.status(500).json({ error: 'Failed to fetch custom models' });
  }
});

/**
 * POST /api/models/custom
 * Registers a new tenant-specific custom model.
 * Requires custom_models entitlement (HTTP 403 PLAN_FEATURE_DISABLED if unentitled).
 */
router.post('/custom', requireCustomModels, async (req: any, res: Response) => {
  const tenantId = req.tenant.id;
  const userId = req.user?.userId || null;
  const {
    name,
    modelIdentifier,
    baseModel = 'qwen3-8b',
    provider = 'custom',
    endpointUrl,
    apiKey,
    description,
  } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Model name is required', code: 'INVALID_MODEL_NAME' });
  }

  if (!modelIdentifier || typeof modelIdentifier !== 'string' || !MODEL_IDENTIFIER_REGEX.test(modelIdentifier.trim())) {
    return res.status(400).json({
      error: 'Invalid modelIdentifier format. Must be 2-100 characters consisting of letters, digits, dashes, dots, underscores, or colons.',
      code: 'INVALID_MODEL_IDENTIFIER',
    });
  }

  const cleanIdentifier = modelIdentifier.trim();

  // Ensure identifier does not conflict with platform default models
  if (isPlatformDefaultModel(cleanIdentifier)) {
    return res.status(409).json({
      error: `Model identifier "${cleanIdentifier}" is reserved for platform default models.`,
      code: 'RESERVED_MODEL_IDENTIFIER',
    });
  }

  // Check if identifier is already registered by another tenant
  try {
    const existingOther = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT id FROM tenant_custom_models WHERE model_identifier = $1 AND tenant_id != $2`,
        [cleanIdentifier, tenantId]
      )
    );
    if (existingOther.rows && existingOther.rows.length > 0) {
      return res.status(409).json({
        error: 'Model identifier is already in use by another tenant.',
        code: 'IDENTIFIER_CONFLICT',
      });
    }
  } catch (err: any) {
    logger.warn('Identifier conflict check warning:', err.message);
  }

  // Validate endpoint URL if provided
  let cleanEndpoint: string | null = null;
  if (endpointUrl && typeof endpointUrl === 'string' && endpointUrl.trim().length > 0) {
    try {
      const parsedUrl = new URL(endpointUrl.trim());
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return res.status(400).json({
          error: 'Endpoint URL must use HTTP or HTTPS protocol.',
          code: 'INVALID_ENDPOINT_PROTOCOL',
        });
      }
      cleanEndpoint = parsedUrl.toString();
    } catch (_) {
      return res.status(400).json({
        error: 'Invalid endpoint URL format.',
        code: 'INVALID_ENDPOINT_URL',
      });
    }
  }

  // Securely encrypt API key if provided
  let encryptedKey: string | null = null;
  let maskedKey: string | null = null;
  if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
    try {
      encryptedKey = CredentialService.encrypt({ apiKey: apiKey.trim() });
      maskedKey = maskApiKey(apiKey);
    } catch (encErr) {
      logger.error('Failed to encrypt model API key:', encErr);
      return res.status(500).json({ error: 'Failed to secure model credentials' });
    }
  }

  try {
    const insertRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `INSERT INTO tenant_custom_models (
           tenant_id, name, model_identifier, base_model, provider,
           endpoint_url, encrypted_api_key, api_key_masked, description,
           status, created_by, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, NOW(), NOW())
         ON CONFLICT (tenant_id, model_identifier) DO UPDATE SET
           name = EXCLUDED.name,
           base_model = EXCLUDED.base_model,
           provider = EXCLUDED.provider,
           endpoint_url = EXCLUDED.endpoint_url,
           encrypted_api_key = COALESCE(EXCLUDED.encrypted_api_key, tenant_custom_models.encrypted_api_key),
           api_key_masked = COALESCE(EXCLUDED.api_key_masked, tenant_custom_models.api_key_masked),
           description = EXCLUDED.description,
           status = 'active',
           updated_at = NOW()
         RETURNING id, tenant_id, name, model_identifier, base_model, provider, endpoint_url, api_key_masked, description, status, created_at, updated_at`,
        [
          tenantId,
          name.trim(),
          cleanIdentifier,
          baseModel,
          provider,
          cleanEndpoint,
          encryptedKey,
          maskedKey,
          description || null,
          userId,
        ]
      )
    );

    const created = sanitizeModelRecord(insertRes.rows[0]);
    res.status(201).json({ customModel: created });
  } catch (err: any) {
    logger.error('Create custom model error:', err);
    res.status(500).json({ error: 'Failed to register custom model' });
  }
});

/**
 * GET /api/models/custom/:id
 * Retrieves custom model details for the authenticated tenant.
 * Strictly tenant-scoped (Tenant A cannot view Tenant B's model).
 */
router.get('/custom/:id', requireCustomModels, async (req: any, res: Response) => {
  const tenantId = req.tenant.id;
  const { id } = req.params;

  try {
    const result = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT id, tenant_id, name, model_identifier, base_model, provider, endpoint_url, api_key_masked, description, status, created_at, updated_at
         FROM tenant_custom_models
         WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      )
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Custom model not found', code: 'MODEL_NOT_FOUND' });
    }

    res.status(200).json({ customModel: sanitizeModelRecord(result.rows[0]) });
  } catch (err: any) {
    logger.error('Fetch custom model error:', err);
    res.status(500).json({ error: 'Failed to fetch custom model' });
  }
});

/**
 * PUT /api/models/custom/:id
 * Updates custom model details for the authenticated tenant.
 * Strictly tenant-scoped (Tenant A cannot modify Tenant B's model).
 */
router.put('/custom/:id', requireCustomModels, async (req: any, res: Response) => {
  const tenantId = req.tenant.id;
  const { id } = req.params;
  const { name, baseModel, provider, endpointUrl, apiKey, description, status } = req.body || {};

  let cleanEndpoint: string | undefined = undefined;
  if (endpointUrl !== undefined) {
    if (endpointUrl && typeof endpointUrl === 'string' && endpointUrl.trim().length > 0) {
      try {
        const parsedUrl = new URL(endpointUrl.trim());
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          return res.status(400).json({
            error: 'Endpoint URL must use HTTP or HTTPS protocol.',
            code: 'INVALID_ENDPOINT_PROTOCOL',
          });
        }
        cleanEndpoint = parsedUrl.toString();
      } catch (_) {
        return res.status(400).json({
          error: 'Invalid endpoint URL format.',
          code: 'INVALID_ENDPOINT_URL',
        });
      }
    } else {
      cleanEndpoint = null as any;
    }
  }

  let encryptedKey: string | undefined = undefined;
  let maskedKey: string | undefined = undefined;
  if (apiKey !== undefined && typeof apiKey === 'string' && apiKey.trim().length > 0) {
    encryptedKey = CredentialService.encrypt({ apiKey: apiKey.trim() });
    maskedKey = maskApiKey(apiKey);
  }

  try {
    const updateRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `UPDATE tenant_custom_models
         SET name = COALESCE($1, name),
             base_model = COALESCE($2, base_model),
             provider = COALESCE($3, provider),
             endpoint_url = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE endpoint_url END,
             encrypted_api_key = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE encrypted_api_key END,
             api_key_masked = CASE WHEN $6::text IS NOT NULL THEN $6 ELSE api_key_masked END,
             description = COALESCE($7, description),
             status = COALESCE($8, status),
             updated_at = NOW()
         WHERE id = $9 AND tenant_id = $10
         RETURNING id, tenant_id, name, model_identifier, base_model, provider, endpoint_url, api_key_masked, description, status, created_at, updated_at`,
        [
          name || null,
          baseModel || null,
          provider || null,
          cleanEndpoint !== undefined ? cleanEndpoint : null,
          encryptedKey !== undefined ? encryptedKey : null,
          maskedKey !== undefined ? maskedKey : null,
          description !== undefined ? description : null,
          status || null,
          id,
          tenantId,
        ]
      )
    );

    if (!updateRes.rows || updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Custom model not found or already deleted', code: 'MODEL_NOT_FOUND' });
    }

    res.status(200).json({ customModel: sanitizeModelRecord(updateRes.rows[0]) });
  } catch (err: any) {
    logger.error('Update custom model error:', err);
    res.status(500).json({ error: 'Failed to update custom model' });
  }
});

/**
 * DELETE /api/models/custom/:id
 * Removes a custom model.
 * Strictly tenant-scoped (Tenant A cannot delete Tenant B's model).
 */
router.delete('/custom/:id', requireCustomModels, async (req: any, res: Response) => {
  const tenantId = req.tenant.id;
  const { id } = req.params;

  try {
    const delRes = await executeTenantQuery(tenantId, (client) =>
      client.query(`DELETE FROM tenant_custom_models WHERE id = $1 AND tenant_id = $2`, [id, tenantId])
    );

    if (delRes.rowCount === 0) {
      return res.status(404).json({ error: 'Custom model not found', code: 'MODEL_NOT_FOUND' });
    }

    res.status(200).json({ success: true, message: 'Custom model removed successfully' });
  } catch (err: any) {
    logger.error('Delete custom model error:', err);
    res.status(500).json({ error: 'Failed to delete custom model' });
  }
});

export default router;
