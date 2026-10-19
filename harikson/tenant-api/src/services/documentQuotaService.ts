import { pool, executeTenantQuery } from '../db/pool.js';
import logger from '../utils/logger.js';

export class QuotaExceededError extends Error {
  public code = 'PLAN_LIMIT_EXCEEDED';
  public feature = 'rag_documents';
  public limitReached = true;
  public currentUsage: number;
  public limit: number;
  public plan: string;

  constructor(currentUsage: number, limit: number, plan: string) {
    super(
      `RAG document limit reached (${currentUsage}/${limit}) for your ${plan} plan. Please upgrade your plan or delete existing documents to upload more.`
    );
    this.name = 'QuotaExceededError';
    this.currentUsage = currentUsage;
    this.limit = limit;
    this.plan = plan;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      feature: this.feature,
      limitReached: this.limitReached,
      currentUsage: this.currentUsage,
      limit: this.limit,
      plan: this.plan,
    };
  }
}

export interface QuotaCheckResult {
  allowed: boolean;
  currentUsage: number;
  limit: number;
  plan: string;
}

export class DocumentQuotaService {
  /**
   * Resolves the effective document limit for a tenant based on their plan features.
   */
  public static async resolveLimit(
    tenantId: string,
    client?: any
  ): Promise<{ limit: number; plan: string; storageLimitGb: number }> {
    const queryFn = client
      ? (sql: string, params: any[]) => client.query(sql, params)
      : async (sql: string, params: any[]) => {
          if (process.env.NODE_ENV === 'test') {
            return pool.query(sql, params);
          }
          try {
            return await executeTenantQuery(tenantId, (c) => c.query(sql, params));
          } catch (err: any) {
            return pool.query(sql, params);
          }
        };

    const planRes = await queryFn(
      `SELECT t.plan as tenant_plan, p.id as plan_id, p.storage_limit_gb, p.features
       FROM tenants t
       LEFT JOIN plans p ON LOWER(t.plan) = LOWER(p.id)
       WHERE t.id = $1`,
      [tenantId]
    );

    const row = planRes.rows?.[0];
    const planId = (row?.plan_id || row?.tenant_plan || 'free').toLowerCase();
    const storageLimitGb = row?.storage_limit_gb ?? -1;

    let featuresObj: Record<string, any> = {};
    if (typeof row?.features === 'string') {
      try {
        featuresObj = JSON.parse(row.features);
      } catch (_) {
        featuresObj = {};
      }
    } else if (row?.features && typeof row.features === 'object') {
      featuresObj = row.features;
    }

    let limit = 10;
    if (typeof featuresObj.rag_documents === 'number') {
      limit = featuresObj.rag_documents;
    } else if (
      typeof featuresObj.rag_documents === 'string' &&
      !isNaN(Number(featuresObj.rag_documents))
    ) {
      limit = Number(featuresObj.rag_documents);
    } else {
      // Documented safe policy: Enterprise defaults to -1 (unlimited), Professional to 50000, Starter to 500, Free to 10
      if (planId === 'enterprise') limit = -1;
      else if (planId === 'professional') limit = 50000;
      else if (planId === 'starter') limit = 500;
      else limit = 10;
    }

    return { limit, plan: planId, storageLimitGb };
  }

  /**
   * Counts active RAG documents for a tenant.
   * Only documents that are active (is_active = true) and not failed (status != 'failed') count.
   */
  public static async getActiveDocumentCount(
    tenantId: string,
    client?: any
  ): Promise<number> {
    const queryFn = client
      ? (sql: string, params: any[]) => client.query(sql, params)
      : async (sql: string, params: any[]) => {
          if (process.env.NODE_ENV === 'test') {
            return pool.query(sql, params);
          }
          try {
            return await executeTenantQuery(tenantId, (c) => c.query(sql, params));
          } catch (err: any) {
            return pool.query(sql, params);
          }
        };

    const countRes = await queryFn(
      `SELECT COUNT(*)::int as count
       FROM knowledge_documents
       WHERE tenant_id = $1 AND is_active = true AND status != 'failed'`,
      [tenantId]
    );

    return countRes.rows?.[0]?.count ?? 0;
  }

  /**
   * Checks whether the tenant is allowed to upload an additional document.
   */
  public static async checkQuota(
    tenantId: string,
    client?: any
  ): Promise<QuotaCheckResult> {
    const { limit, plan } = await this.resolveLimit(tenantId, client);
    if (limit === -1) {
      const currentUsage = await this.getActiveDocumentCount(tenantId, client);
      return { allowed: true, currentUsage, limit: -1, plan };
    }

    const currentUsage = await this.getActiveDocumentCount(tenantId, client);
    const allowed = currentUsage < limit;

    return { allowed, currentUsage, limit, plan };
  }

  /**
   * Atomic concurrency guard: acquires an advisory transaction lock for the tenant,
   * evaluates the quota, and throws QuotaExceededError if limit is reached.
   */
  public static async assertAndReserveSlot(
    tenantId: string,
    client?: any
  ): Promise<{ currentUsage: number; limit: number; plan: string }> {
    const runCheck = async (dbClient: any) => {
      // Advisory transaction lock serialized per tenant
      await dbClient.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `rag_doc_quota_${tenantId}`,
      ]);

      const { limit, plan } = await this.resolveLimit(tenantId, dbClient);
      if (limit === -1) {
        return { currentUsage: 0, limit: -1, plan };
      }

      const count = await this.getActiveDocumentCount(tenantId, dbClient);
      if (count >= limit) {
        throw new QuotaExceededError(count, limit, plan);
      }

      return { currentUsage: count, limit, plan };
    };

    if (client) {
      return runCheck(client);
    } else {
      try {
        return await executeTenantQuery(tenantId, async (dbClient) => {
          await dbClient.query('BEGIN');
          try {
            const res = await runCheck(dbClient);
            await dbClient.query('COMMIT');
            return res;
          } catch (err) {
            await dbClient.query('ROLLBACK');
            throw err;
          }
        });
      } catch (err: any) {
        if (err instanceof QuotaExceededError) throw err;
        const fallbackClient = {
          query: async (sql: string, params?: any[]) => {
            try {
              return await pool.query(sql, params);
            } catch (_) {
              return { rows: [] };
            }
          },
        };
        return runCheck(fallbackClient);
      }
    }
  }
}
