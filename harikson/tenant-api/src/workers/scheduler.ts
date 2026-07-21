import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { pool } from '../db/pool.js';
import { RepositoryIndexer } from '../services/indexer/repository-indexer.js';
import { MemoryExtractor } from '../services/memory/extractor.js';
import { ContextBuilder } from '../services/context/context-builder.js';
import { OllamaClient } from '../llm/ollama.js';
import { Logger } from '../observability/logger.js';

const redisConnections: Redis[] = [];

function createRedisConnection(): Redis {
  const conn = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });
  redisConnections.push(conn);
  return conn;
}

export interface IWorkerStat {
  name: string;
  expectedIntervalMs: number;
  lastRun: string | null;
  nextRun: string | null;
  healthy: boolean;
  errorCount: number;
  lastError?: string;
}

export class HariksonScheduler {
  public static instance: HariksonScheduler | null = null;

  public static memoryQueue: Queue;
  public static summarizerQueue: Queue;
  public static cacheQueue: Queue;
  public static cleanupQueue: Queue;
  public static failedQueue: Queue;

  private static memoryWorker: Worker;
  private static summarizerWorker: Worker;
  private static cacheWorker: Worker;
  private static cleanupWorker: Worker;

  private static activeWatchers = new Map<string, fs.FSWatcher>();
  private static startTime: number = 0;

  public static workerStats: Record<string, IWorkerStat> = {
    memoryWorker: {
      name: 'memoryWorker',
      expectedIntervalMs: 10000,
      lastRun: null,
      nextRun: null,
      healthy: true,
      errorCount: 0,
    },
    summarizerWorker: {
      name: 'summarizerWorker',
      expectedIntervalMs: 15000,
      lastRun: null,
      nextRun: null,
      healthy: true,
      errorCount: 0,
    },
    cacheWorker: {
      name: 'cacheWorker',
      expectedIntervalMs: 300000,
      lastRun: null,
      nextRun: null,
      healthy: true,
      errorCount: 0,
    },
    cleanupWorker: {
      name: 'cleanupWorker',
      expectedIntervalMs: 86400000,
      lastRun: null,
      nextRun: null,
      healthy: true,
      errorCount: 0,
    },
  };

  public static async startAll(tenantId?: string, workspacePath?: string, userId?: string) {
    // Singleton Guard
    if (this.instance) {
      Logger.warn('⚠️ [Harikson Scheduler] HariksonScheduler instance is already running. Skipping redundant start.');
      return;
    }
    this.instance = new HariksonScheduler();
    this.startTime = Date.now();

    Logger.info('🔋 [Harikson Scheduler] Starting BullMQ global background workers...');

    const queueConnection = createRedisConnection();

    // Initialize Queues
    this.memoryQueue = new Queue('memoryQueue', { connection: queueConnection });
    this.summarizerQueue = new Queue('summarizerQueue', { connection: queueConnection });
    this.cacheQueue = new Queue('cacheQueue', { connection: queueConnection });
    this.cleanupQueue = new Queue('cleanupQueue', { connection: queueConnection });
    this.failedQueue = new Queue('failedQueue', { connection: queueConnection });

    // 1. File Watcher Indexer (Incremental Indexer)
    this.startIndexerWorker(tenantId || 'system', workspacePath || './');

    // 2. Schedule repeatable/cron jobs
    try {
      // Clean up previous repeatable jobs to avoid duplicates on restart
      const repeatableMemory = await this.memoryQueue.getRepeatableJobs();
      for (const job of repeatableMemory) {
        await this.memoryQueue.removeRepeatableByKey(job.key);
      }
      const repeatableSummarizer = await this.summarizerQueue.getRepeatableJobs();
      for (const job of repeatableSummarizer) {
        await this.summarizerQueue.removeRepeatableByKey(job.key);
      }
      const repeatableCache = await this.cacheQueue.getRepeatableJobs();
      for (const job of repeatableCache) {
        await this.cacheQueue.removeRepeatableByKey(job.key);
      }
      const repeatableCleanup = await this.cleanupQueue.getRepeatableJobs();
      for (const job of repeatableCleanup) {
        await this.cleanupQueue.removeRepeatableByKey(job.key);
      }

      // Add fresh global repeatable jobs
      await this.memoryQueue.add('poller', {}, {
        repeat: { every: 10000 },
        removeOnComplete: true,
        removeOnFail: true,
      });

      await this.summarizerQueue.add('poller', {}, {
        repeat: { every: 15000 },
        removeOnComplete: true,
        removeOnFail: true,
      });

      await this.cacheQueue.add('cache-warmer', { workspacePath: workspacePath || './' }, {
        repeat: { every: 300000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      });

      await this.cleanupQueue.add('daily-cleanup', {}, {
        repeat: { pattern: '0 0 * * *' },
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 7 * 86400 },
      });

      // Trigger daily database cleanup immediately on startup (after 5s delay)
      setTimeout(async () => {
        try {
          await this.cleanupQueue.add('startup-cleanup', {});
        } catch (err) {
          Logger.error('Failed to trigger startup database cleanup job', err);
        }
      }, 5000);

    } catch (err) {
      Logger.error('Failed to register repeatable BullMQ jobs', err);
    }

    // 3. Start Workers
    this.startWorkers();
  }

  public static async stopAll(timeoutMs = 10000): Promise<void> {
    Logger.info('🔌 [Harikson Scheduler] Gracefully stopping all BullMQ workers...');

    const shutdownLogic = async () => {
      // Close all workers
      if (this.memoryWorker) await this.memoryWorker.close();
      if (this.summarizerWorker) await this.summarizerWorker.close();
      if (this.cacheWorker) await this.cacheWorker.close();
      if (this.cleanupWorker) await this.cleanupWorker.close();

      // Close all queues
      if (this.memoryQueue) await this.memoryQueue.close();
      if (this.summarizerQueue) await this.summarizerQueue.close();
      if (this.cacheQueue) await this.cacheQueue.close();
      if (this.cleanupQueue) await this.cleanupQueue.close();
      if (this.failedQueue) await this.failedQueue.close();

      // Close watchers
      this.activeWatchers.forEach((watcher) => watcher.close());
      this.activeWatchers.clear();

      // Quit Redis connections
      for (const conn of redisConnections) {
        try {
          await conn.quit();
        } catch (err) {
          // Ignored
        }
      }
      redisConnections.length = 0;
      this.instance = null;
    };

    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => {
        Logger.warn(`⚠️ [Harikson Scheduler] Shutdown timed out after ${timeoutMs}ms. Forcing stop.`);
        resolve(null);
      }, timeoutMs)
    );

    await Promise.race([shutdownLogic(), timeoutPromise]);
    Logger.info('🔌 [Harikson Scheduler] All BullMQ workers, queues, and connections closed.');
  }

  public static getHealth() {
    const now = Date.now();
    const workerList = Object.values(this.workerStats).map((stat) => {
      let healthy = true;
      if (stat.lastRun) {
        const elapsed = now - new Date(stat.lastRun).getTime();
        // Unhealthy if a worker hasn't run in 2x its expected interval
        if (elapsed > 2 * stat.expectedIntervalMs) {
          healthy = false;
        }
      } else {
        // If never run yet, check if startup time exceeds 2x expected interval
        if (this.startTime > 0 && (now - this.startTime) > 2 * stat.expectedIntervalMs) {
          healthy = false;
        }
      }

      return {
        name: stat.name,
        lastRun: stat.lastRun,
        nextRun: stat.nextRun,
        expectedIntervalMs: stat.expectedIntervalMs,
        healthy,
        errorCount: stat.errorCount,
        lastError: stat.lastError,
      };
    });

    const allHealthy = workerList.every((w) => w.healthy);

    return {
      status: allHealthy ? 'ok' : 'degraded',
      running: !!this.instance,
      timestamp: new Date().toISOString(),
      workers: workerList,
    };
  }

  private static recordWorkerRun(workerName: string) {
    const stat = this.workerStats[workerName];
    if (stat) {
      const now = new Date();
      stat.lastRun = now.toISOString();
      stat.nextRun = new Date(now.getTime() + stat.expectedIntervalMs).toISOString();
      stat.healthy = true;
    }
  }

  private static recordWorkerError(workerName: string, err: any) {
    const stat = this.workerStats[workerName];
    if (stat) {
      stat.errorCount++;
      stat.lastError = err.message || String(err);
    }
  }

  private static startWorkers() {
    // A. Memory Extractor Worker (Global multi-tenant discovery)
    const memoryWorkerConn = createRedisConnection();
    this.memoryWorker = new Worker('memoryQueue', async (job: Job) => {
      this.recordWorkerRun('memoryWorker');
      try {
        const { tenantId, userId, messageId, content } = job.data;
        if (job.name === 'poller') {
          // Discover all active tenants
          const tenantsRes = await pool.query("SELECT id FROM tenants WHERE status = 'active' AND deleted_at IS NULL");
          for (const tRow of tenantsRes.rows) {
            const activeTenantId = tRow.id;
            await this.executeQuery(activeTenantId, async (client) => {
              const res = await client.query(`
                SELECT m.id, m.content, m.conversation_id, c.user_id
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                WHERE m.role = 'user'
                ORDER BY m.created_at DESC
                LIMIT 10
              `);

              for (const row of res.rows) {
                await this.memoryQueue.add('extract', {
                  tenantId: activeTenantId,
                  userId: row.user_id,
                  messageId: row.id,
                  content: row.content,
                }, {
                  jobId: `memory-${row.id}`,
                  attempts: 3,
                  backoff: { type: 'exponential', delay: 1000 },
                  removeOnComplete: { age: 86400 },
                  removeOnFail: { age: 7 * 86400 },
                });
              }
            });
          }
        } else if (job.name === 'extract') {
          Logger.info(`🧠 [Memory Worker] Extracting facts from message ${messageId}...`);
          await MemoryExtractor.extractAndSave(tenantId, userId, content, '');
        }
      } catch (err) {
        this.recordWorkerError('memoryWorker', err);
        throw err;
      }
    }, {
      connection: memoryWorkerConn,
      concurrency: 1,
    });
    this.setupDLQ(this.memoryWorker, 'memoryQueue');

    // B. Summarizer Worker (Global multi-tenant discovery)
    const summarizerWorkerConn = createRedisConnection();
    this.summarizerWorker = new Worker('summarizerQueue', async (job: Job) => {
      this.recordWorkerRun('summarizerWorker');
      try {
        const { tenantId, userId, conversationId } = job.data;
        if (job.name === 'poller') {
          // Discover all active tenants
          const tenantsRes = await pool.query("SELECT id FROM tenants WHERE status = 'active' AND deleted_at IS NULL");
          for (const tRow of tenantsRes.rows) {
            const activeTenantId = tRow.id;
            await this.executeQuery(activeTenantId, async (client) => {
              const res = await client.query(`
                SELECT m.conversation_id, c.user_id, COUNT(*) as count
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                GROUP BY m.conversation_id, c.user_id
                HAVING COUNT(*) > 50
              `);

              for (const row of res.rows) {
                const convId = row.conversation_id;
                const convUserId = row.user_id;

                let checkRes;
                try {
                  checkRes = await client.query(
                    'SELECT id FROM conversation_summaries WHERE conversation_id = $1 LIMIT 1',
                    [convId]
                  );
                } catch (err: any) {
                  if (err.code === '42P01') {
                    checkRes = { rows: [] };
                  } else {
                    throw err;
                  }
                }

                if (checkRes.rows.length === 0) {
                  await this.summarizerQueue.add('summarize', {
                    tenantId: activeTenantId,
                    userId: convUserId,
                    conversationId: convId,
                  }, {
                    jobId: `summarize-${convId}`,
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 1000 },
                    removeOnComplete: { age: 86400 },
                    removeOnFail: { age: 7 * 86400 },
                  });
                }
              }
            });
          }
        } else if (job.name === 'summarize') {
          Logger.info(`📝 [Summarizer Worker] Compiling summary for conversation ${conversationId} (>50 messages)...`);
          await ContextBuilder.build(
            tenantId,
            userId,
            'Generate summary',
            conversationId,
            './'
          );
        }
      } catch (err) {
        this.recordWorkerError('summarizerWorker', err);
        throw err;
      }
    }, {
      connection: summarizerWorkerConn,
      concurrency: 5,
    });
    this.setupDLQ(this.summarizerWorker, 'summarizerQueue');

    // C. Cache Warmer Worker
    const cacheWorkerConn = createRedisConnection();
    this.cacheWorker = new Worker('cacheQueue', async (job: Job) => {
      this.recordWorkerRun('cacheWorker');
      try {
        const { workspacePath } = job.data;
        Logger.info('🔥 [Cache Warmer Worker] Warming vector embeddings cache...');

        const extensions = ['.ts', '.js', '.py'];
        const root = path.resolve(workspacePath || './');

        const scanAndWarm = async (dir: string) => {
          if (!fs.existsSync(dir)) return;
          const items = fs.readdirSync(dir);
          for (const item of items) {
            const full = path.join(dir, item);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) {
              if (item !== 'node_modules' && item !== '.git') {
                await scanAndWarm(full);
              }
            } else if (stat.isFile() && extensions.includes(path.extname(item))) {
              try {
                const content = fs.readFileSync(full, 'utf-8').substring(0, 1000);
                if (content.trim()) {
                  await OllamaClient.embed(content);
                }
              } catch (err: any) {
                console.warn(`Warning warming cache for file ${full}:`, err.message);
              }
            }
          }
        };

        await scanAndWarm(root);
      } catch (err) {
        this.recordWorkerError('cacheWorker', err);
        Logger.error('Cache warmer search traversal error', err);
        throw err;
      }
    }, {
      connection: cacheWorkerConn,
      concurrency: 1,
    });
    this.setupDLQ(this.cacheWorker, 'cacheQueue');

    // D. Cleanup Worker
    const cleanupWorkerConn = createRedisConnection();
    this.cleanupWorker = new Worker('cleanupQueue', async (job: Job) => {
      this.recordWorkerRun('cleanupWorker');
      try {
        Logger.info('[CRON] Running database cleanup & data retention rules (BullMQ)...');
        
        const delLogs = await pool.query(
          `DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '90 days'`
        );
        Logger.info(`[CRON] Cleaned up ${delLogs.rowCount} activity logs older than 90 days.`);

        const delSessions = await pool.query(
          `DELETE FROM user_sessions WHERE expires_at < NOW() OR revoked_at IS NOT NULL`
        );
        Logger.info(`[CRON] Cleaned up ${delSessions.rowCount} expired/revoked user sessions.`);

        const delInvoices = await pool.query(
          `DELETE FROM invoices WHERE created_at < NOW() - INTERVAL '2555 days'`
        );
        Logger.info(`[CRON] Hard deleted ${delInvoices.rowCount} invoices older than 7 years.`);

        const activeTenants = await pool.query(
          `SELECT id, plan, retention_overrides FROM tenants WHERE status = 'active' AND deleted_at IS NULL`
        );
        for (const tenantRow of activeTenants.rows) {
          const tId = tenantRow.id;
          const plan = (tenantRow.plan || 'starter').toLowerCase();
          const overrides = tenantRow.retention_overrides || {};

          let days = 365;
          if (plan === 'pro' || plan === 'professional') {
            days = 730;
          } else if (plan === 'enterprise') {
            days = overrides.conversations_days
              ? parseInt(overrides.conversations_days, 10)
              : null;
          }

          if (days !== null) {
            const delConvsResult = await pool.query(
              `DELETE FROM conversations 
               WHERE tenant_id = $1 AND updated_at < NOW() - $2 * INTERVAL '1 day'`,
              [tId, days]
            );
            if (delConvsResult.rowCount > 0) {
              Logger.info(`[CRON] Conversations retention: Hard deleted ${delConvsResult.rowCount} conversations older than ${days} days for tenant ${tId}`);
            }
          }
        }

        const retentionDays = parseInt(process.env.HARD_DELETE_AFTER_DAYS || '30', 10);

        const softDeletedTenantsToPurge = await pool.query(
          `SELECT id FROM tenants WHERE deleted_at < NOW() - $1 * INTERVAL '1 day'`,
          [retentionDays]
        );
        for (const tRow of softDeletedTenantsToPurge.rows) {
          await exportGDPRData(tRow.id);
        }

        const delTenants = await pool.query(
          `DELETE FROM tenants WHERE deleted_at < NOW() - $1 * INTERVAL '1 day'`,
          [retentionDays]
        );
        Logger.info(`[CRON] Hard deleted ${delTenants.rowCount} soft-deleted tenants older than ${retentionDays} days.`);

        const delUsers = await pool.query(
          `DELETE FROM users WHERE deleted_at < NOW() - $1 * INTERVAL '1 day'`,
          [retentionDays]
        );
        Logger.info(`[CRON] Hard deleted ${delUsers.rowCount} soft-deleted users older than ${retentionDays} days.`);

        const delConvs = await pool.query(
          `DELETE FROM conversations WHERE deleted_at < NOW() - $1 * INTERVAL '1 day'`,
          [retentionDays]
        );
        Logger.info(`[CRON] Hard deleted ${delConvs.rowCount} soft-deleted conversations older than ${retentionDays} days.`);

        const delMsgs = await pool.query(
          `DELETE FROM messages WHERE deleted_at < NOW() - $1 * INTERVAL '1 day'`,
          [retentionDays]
        );
        Logger.info(`[CRON] Hard deleted ${delMsgs.rowCount} soft-deleted messages older than ${retentionDays} days.`);

        const expiredGraceTenants = await pool.query(
          `SELECT id, plan, downgrade_grace_ends FROM tenants 
           WHERE downgrade_grace_ends < NOW() AND status = 'active'`
        );

        for (const tRow of expiredGraceTenants.rows) {
          const tId = tRow.id;
          const planId = tRow.plan.toLowerCase();

          const planRes = await pool.query(
            'SELECT agent_limit, features FROM plans WHERE id = $1',
            [planId]
          );
          if (planRes.rows.length > 0) {
            const plan = planRes.rows[0];
            const agentLimit = plan.agent_limit;

            if (agentLimit !== -1) {
              const activeAgents = await pool.query(
                `SELECT id FROM agents WHERE tenant_id = $1 AND status = 'active' ORDER BY created_at ASC`,
                [tId]
              );
              if (activeAgents.rows.length > agentLimit) {
                const extraAgentIds = activeAgents.rows
                  .slice(agentLimit)
                  .map((r) => r.id);
                await pool.query(
                  `UPDATE agents SET status = 'disabled' WHERE id = ANY($1)`,
                  [extraAgentIds]
                );
                Logger.info(`[CRON] Disabled ${extraAgentIds.length} extra agents for tenant ${tId}`);
              }
            }

            await pool.query(
              `INSERT INTO activity_logs (tenant_id, action, metadata)
               VALUES ($1, 'PLAN_LIMIT_VIOLATION_NOTIFIED', $2)`,
              [
                tId,
                JSON.stringify({
                  message: 'Tenant has violated plan limits after grace period. Immediate action required.',
                  plan: planId,
                  grace_ends: tRow.downgrade_grace_ends,
                }),
              ]
            );

            const graceEnds = new Date(tRow.downgrade_grace_ends);
            const autoSuspendTime = new Date(graceEnds.getTime() + 14 * 24 * 60 * 60 * 1000);
            if (new Date() > autoSuspendTime) {
              await pool.query(
                `UPDATE tenants SET status = 'suspended' WHERE id = $1`,
                [tId]
              );
              Logger.info(`[CRON] Auto-suspended tenant ${tId} due to unresolved plan limit violations for 14 days.`);
            }
          }
        }
      } catch (err) {
        this.recordWorkerError('cleanupWorker', err);
        throw err;
      }
    }, {
      connection: cleanupWorkerConn,
      concurrency: 1,
    });
    this.setupDLQ(this.cleanupWorker, 'cleanupQueue');
  }

  private static setupDLQ(worker: Worker, queueName: string) {
    worker.on('failed', async (job: Job | undefined, err: Error) => {
      if (!job) return;

      const maxAttempts = job.opts.attempts || 1;
      if (job.attemptsMade >= maxAttempts) {
        Logger.error(`❌ [DLQ] Job ${job.id} in ${queueName} failed after all ${job.attemptsMade} retries. Moving to failedQueue.`, err);

        try {
          if (this.failedQueue) {
            await this.failedQueue.add('failed-job', {
              originalQueue: queueName,
              jobId: job.id,
              name: job.name,
              data: job.data,
              failedReason: err.message || job.failedReason || 'Unknown failure reason',
              failedAt: new Date().toISOString(),
            }, {
              removeOnComplete: { age: 30 * 24 * 3600 },
              removeOnFail: false,
            });
          }
        } catch (dlqErr) {
          Logger.error('Failed to write job to failedQueue', dlqErr);
        }
      } else {
        Logger.warn(`⚠️ [Retry] Job ${job.id} in ${queueName} failed (Attempt ${job.attemptsMade}/${maxAttempts}). Will retry. Error: ${err.message}`);
      }
    });
  }

  private static async executeQuery<T>(
    tenantId: string,
    callback: (client: pg.PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('SELECT set_tenant_context($1)', [tenantId]);
      const result = await callback(client);
      await client.query('SELECT set_tenant_context(NULL)');
      return result;
    } catch (err) {
      try {
        await client.query('SELECT set_tenant_context(NULL)');
      } catch (cleanupErr: any) {
        console.warn('Warning clearing tenant context on query error:', cleanupErr.message);
      }
      throw err;
    } finally {
      client.release();
    }
  }

  private static startIndexerWorker(tenantId: string, workspacePath: string) {
    if (!fs.existsSync(workspacePath)) return;

    try {
      let cooldown = false;
      const watcher = fs.watch(
        workspacePath,
        { recursive: true },
        (eventType, filename) => {
          if (!filename || cooldown) return;
          cooldown = true;

          setTimeout(async () => {
            cooldown = false;
            try {
              Logger.info(`🔍 [Indexer Worker] File change detected: ${filename}. Re-indexing...`);
              await RepositoryIndexer.indexWorkspace(tenantId, workspacePath);
            } catch (err) {
              Logger.error('Failed to run incremental index scan', err);
            }
          }, 3000);
        }
      );

      this.activeWatchers.set(workspacePath, watcher);
    } catch (err) {
      Logger.error('Indexer Worker failed to watch workspace', err);
    }
  }
}

async function exportGDPRData(tenantId: string) {
  try {
    const users = await pool.query('SELECT * FROM users WHERE tenant_id = $1', [tenantId]);
    const conversations = await pool.query('SELECT * FROM conversations WHERE tenant_id = $1', [tenantId]);
    const messages = await pool.query('SELECT * FROM messages WHERE tenant_id = $1', [tenantId]);
    const invoices = await pool.query('SELECT * FROM invoices WHERE tenant_id = $1', [tenantId]);
    const tenant = await pool.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);

    const payload = {
      exported_at: new Date().toISOString(),
      tenant: tenant.rows[0] || null,
      users: users.rows,
      conversations: conversations.rows,
      messages: messages.rows,
      invoices: invoices.rows,
    };

    const exportDir = path.resolve('./backups/gdpr_exports');
    fs.mkdirSync(exportDir, { recursive: true });
    const exportPath = path.join(exportDir, `tenant_gdpr_export_${tenantId}_${Date.now()}.json`);
    fs.writeFileSync(exportPath, JSON.stringify(payload, null, 2));
    Logger.info(`[GDPR] Exported tenant ${tenantId} data successfully to ${exportPath}`);
  } catch (err) {
    Logger.error(`[GDPR ERROR] Failed to export tenant data for ${tenantId}:`, err);
  }
}
