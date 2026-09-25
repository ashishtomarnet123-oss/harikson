import crypto from 'crypto';
import { CredentialType, IWorkflowCredential } from './types.js';
import { Logger } from '../../observability/logger.js';

async function getExecuteTenantQuery() {
  const mod = await import('../../db/pool.js');
  return mod.executeTenantQuery;
}

export class CredentialService {
  private static getEncryptionKey(): Buffer {
    const rawKey =
      process.env.WORKFLOW_CREDENTIAL_KEY ||
      process.env.TENANT_MASTER_KEY ||
      process.env.JWT_SECRET ||
      'xarwiz-default-secure-workflow-key-32b';
    return crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Encrypt plaintext secret object using AES-256-GCM
   */
  public static encrypt(secretData: Record<string, any>): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const plaintext = JSON.stringify(secretData);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // Return combined iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt AES-256-GCM ciphertext back into secret object
   */
  public static decrypt(encryptedPayload: string): Record<string, any> {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted credential payload format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = this.getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * Create an encrypted credential record
   */
  public static async createCredential(
    tenantId: string,
    name: string,
    type: CredentialType,
    secretData: Record<string, any>,
    metadata: Record<string, any> = {},
    userId?: string
  ): Promise<IWorkflowCredential> {
    const encryptedData = this.encrypt(secretData);

    // Compute safe preview if applicable
    const safeMetadata = { ...metadata };
    if (secretData.apiKey && typeof secretData.apiKey === 'string') {
      const key = secretData.apiKey;
      safeMetadata.preview = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : '••••••••';
    } else if (secretData.token && typeof secretData.token === 'string') {
      const tok = secretData.token;
      safeMetadata.preview = tok.length > 8 ? `${tok.slice(0, 4)}...${tok.slice(-4)}` : '••••••••';
    } else {
      safeMetadata.preview = '••••••••';
    }

    const executeTenantQuery = await getExecuteTenantQuery();
    const insertRes = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `INSERT INTO workflow_credentials (tenant_id, name, type, encrypted_data, metadata, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, tenant_id, name, type, metadata, created_by, created_at, updated_at`,
        [tenantId, name, type, encryptedData, JSON.stringify(safeMetadata), userId || null]
      )
    );

    const row = insertRes.rows[0];
    Logger.info(`[CredentialService] Created credential ${row.id} (type: ${type}) for tenant ${tenantId}`);

    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      type: row.type,
      metadata: row.metadata || {},
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * List credentials for a tenant (never returns plaintext secrets)
   */
  public static async listCredentials(tenantId: string): Promise<IWorkflowCredential[]> {
    const executeTenantQuery = await getExecuteTenantQuery();
    const res = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT id, tenant_id, name, type, metadata, created_by, created_at, updated_at
         FROM workflow_credentials
         WHERE tenant_id = $1
         ORDER BY created_at DESC`,
        [tenantId]
      )
    );

    return res.rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      type: row.type,
      metadata: row.metadata || {},
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Get single credential metadata (never returns plaintext secrets)
   */
  public static async getCredentialMetadata(
    tenantId: string,
    credentialId: string
  ): Promise<IWorkflowCredential | null> {
    const executeTenantQuery = await getExecuteTenantQuery();
    const res = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT id, tenant_id, name, type, metadata, created_by, created_at, updated_at
         FROM workflow_credentials
         WHERE id = $1 AND tenant_id = $2`,
        [credentialId, tenantId]
      )
    );

    if (!res.rows.length) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      type: row.type,
      metadata: row.metadata || {},
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Resolve plaintext secrets for runtime execution within the node worker
   * NOTE: This should ONLY be called by backend execution workers, never by client APIs
   */
  public static async resolveCredentialSecret(
    tenantId: string,
    credentialId: string
  ): Promise<Record<string, any> | null> {
    const executeTenantQuery = await getExecuteTenantQuery();
    const res = await executeTenantQuery(tenantId, (client) =>
      client.query(
        `SELECT encrypted_data FROM workflow_credentials WHERE id = $1 AND tenant_id = $2`,
        [credentialId, tenantId]
      )
    );

    if (!res.rows.length) return null;
    try {
      return this.decrypt(res.rows[0].encrypted_data);
    } catch (err: any) {
      Logger.error(`[CredentialService] Failed to decrypt credential ${credentialId}:`, err);
      return null;
    }
  }

  /**
   * Update credential metadata or secrets
   */
  public static async updateCredential(
    tenantId: string,
    credentialId: string,
    name?: string,
    secretData?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<IWorkflowCredential | null> {
    const existing = await this.getCredentialMetadata(tenantId, credentialId);
    if (!existing) return null;

    let encryptedData: string | undefined;
    const safeMetadata = { ...existing.metadata, ...(metadata || {}) };

    if (secretData) {
      encryptedData = this.encrypt(secretData);
      if (secretData.apiKey && typeof secretData.apiKey === 'string') {
        const key = secretData.apiKey;
        safeMetadata.preview = key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : '••••••••';
      } else if (secretData.token && typeof secretData.token === 'string') {
        const tok = secretData.token;
        safeMetadata.preview = tok.length > 8 ? `${tok.slice(0, 4)}...${tok.slice(-4)}` : '••••••••';
      }
    }

    const executeTenantQuery = await getExecuteTenantQuery();
    const updateRes = await executeTenantQuery(tenantId, (client) => {
      if (encryptedData) {
        return client.query(
          `UPDATE workflow_credentials
           SET name = COALESCE($1, name),
               encrypted_data = $2,
               metadata = $3,
               updated_at = NOW()
           WHERE id = $4 AND tenant_id = $5
           RETURNING id, tenant_id, name, type, metadata, created_by, created_at, updated_at`,
          [name || existing.name, encryptedData, JSON.stringify(safeMetadata), credentialId, tenantId]
        );
      } else {
        return client.query(
          `UPDATE workflow_credentials
           SET name = COALESCE($1, name),
               metadata = $2,
               updated_at = NOW()
           WHERE id = $3 AND tenant_id = $4
           RETURNING id, tenant_id, name, type, metadata, created_by, created_at, updated_at`,
          [name || existing.name, JSON.stringify(safeMetadata), credentialId, tenantId]
        );
      }
    });

    const row = updateRes.rows[0];
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      type: row.type,
      metadata: row.metadata || {},
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Delete credential
   */
  public static async deleteCredential(tenantId: string, credentialId: string): Promise<boolean> {
    const executeTenantQuery = await getExecuteTenantQuery();
    const res = await executeTenantQuery(tenantId, (client) =>
      client.query(`DELETE FROM workflow_credentials WHERE id = $1 AND tenant_id = $2`, [
        credentialId,
        tenantId,
      ])
    );
    return (res.rowCount ?? 0) > 0;
  }
}
