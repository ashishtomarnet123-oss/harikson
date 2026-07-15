import fs from "fs";
import path from "path";
import pg from "pg";
import { pool } from "../db/pool.js";
import { RepositoryIndexer } from "../services/indexer/repository-indexer.js";
import { MemoryExtractor } from "../services/memory/extractor.js";
import { ContextBuilder } from "../services/context/context-builder.js";
import { OllamaClient } from "../llm/ollama.js";
import { Logger } from "../observability/logger.js";
import { metrics } from "../observability/metrics.js";

export class HariksonScheduler {
  private static processedMessages = new Set<string>();
  private static activeWatchers = new Map<string, fs.FSWatcher>();
  private static intervals: NodeJS.Timeout[] = [];

  static startAll(tenantId: string, workspacePath: string, userId: string) {
    Logger.info("🔋 [Harikson Scheduler] Starting background workers...", { workspacePath });

    // 1. Incremental Indexer Worker (File Watcher)
    this.startIndexerWorker(tenantId, workspacePath);

    // 2. Memory Extractor Worker (Polls messages every 10 seconds)
    const memInt = setInterval(() => {
      this.runMemoryExtractorWorker(tenantId, userId).catch((err) =>
        Logger.error("MemoryExtractorWorker failed", err)
      );
    }, 10000);
    this.intervals.push(memInt);

    // 3. Conversation Summarizer Worker (Polls conversations every 15 seconds)
    const sumInt = setInterval(() => {
      this.runConversationSummarizerWorker(tenantId, userId).catch((err) =>
        Logger.error("ConversationSummarizerWorker failed", err)
      );
    }, 15000);
    this.intervals.push(sumInt);

    // 4. Cache Warmer Worker (Runs every 5 minutes = 300,000 ms)
    const warmInt = setInterval(() => {
      this.runCacheWarmerWorker(tenantId, workspacePath).catch((err) =>
        Logger.error("CacheWarmerWorker failed", err)
      );
    }, 300000);
    this.intervals.push(warmInt);
  }

  static stopAll() {
    Logger.info("🔌 [Harikson Scheduler] Stopping all background workers.");
    this.intervals.forEach((int) => clearInterval(int));
    this.intervals = [];
    this.activeWatchers.forEach((watcher) => watcher.close());
    this.activeWatchers.clear();
  }

  private static async executeQuery<T>(tenantId: string, callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("SELECT set_tenant_context($1)", [tenantId]);
      const result = await callback(client);
      await client.query("SELECT set_tenant_context(NULL)");
      return result;
    } catch (err) {
      try {
        await client.query("SELECT set_tenant_context(NULL)");
      } catch (cleanupErr: any) {
        console.warn("Warning clearing tenant context on query error:", cleanupErr.message);
      }
      throw err;
    } finally {
      client.release();
    }
  }

  // 🔹 Worker A: Incremental File Indexer Watcher
  private static startIndexerWorker(tenantId: string, workspacePath: string) {
    if (!fs.existsSync(workspacePath)) return;

    try {
      let cooldown = false;
      const watcher = fs.watch(workspacePath, { recursive: true }, (eventType, filename) => {
        if (!filename || cooldown) return;
        cooldown = true;

        setTimeout(async () => {
          cooldown = false;
          try {
            Logger.info(`🔍 [Indexer Worker] File change detected: ${filename}. Re-indexing...`);
            await RepositoryIndexer.indexWorkspace(tenantId, workspacePath);
          } catch (err) {
            Logger.error("Failed to run incremental index scan", err);
          }
        }, 3000); // 3-second throttle cooldown
      });

      this.activeWatchers.set(workspacePath, watcher);
    } catch (err) {
      Logger.error("Indexer Worker failed to watch workspace", err);
    }
  }

  // 🔹 Worker B: Memory Extractor Poller
  private static async runMemoryExtractorWorker(tenantId: string, userId: string) {
    await this.executeQuery(tenantId, async (client) => {
      const res = await client.query(`
        SELECT m.id, m.content, m.conversation_id
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE m.role = 'user'
        ORDER BY m.created_at DESC
        LIMIT 10
      `);

      for (const row of res.rows) {
        if (this.processedMessages.has(row.id)) continue;
        this.processedMessages.add(row.id);

        Logger.info(`🧠 [Memory Worker] Extracting facts from message ${row.id}...`);
        await MemoryExtractor.extractAndSave(tenantId, userId, row.content, "");
      }
    });
  }

  // 🔹 Worker C: Conversation Summarizer Poller (>50 messages)
  private static async runConversationSummarizerWorker(tenantId: string, userId: string) {
    await this.executeQuery(tenantId, async (client) => {
      const res = await client.query(`
        SELECT conversation_id, COUNT(*) as count
        FROM messages
        GROUP BY conversation_id
        HAVING COUNT(*) > 50
      `);

      for (const row of res.rows) {
        const conversationId = row.conversation_id;
        
        // Check if summarized recently
        const checkRes = await client.query(
          "SELECT id FROM conversation_summaries WHERE conversation_id = $1 LIMIT 1",
          [conversationId]
        );

        if (checkRes.rows.length === 0) {
          Logger.info(`📝 [Summarizer Worker] Compiling summary for conversation ${conversationId} (>50 messages)...`);
          // Build context which will trigger summarization
          await ContextBuilder.build(tenantId, userId, "Generate summary", conversationId, "./");
        }
      }
    });
  }

  // 🔹 Worker D: Cache Warmer (Precomputes embeddings for target files)
  private static async runCacheWarmerWorker(tenantId: string, workspacePath: string) {
    Logger.info("🔥 [Cache Warmer Worker] Warming vector embeddings cache...");
    
    // Warm top accessed extensions in workspace
    const extensions = [".ts", ".js", ".py"];
    const root = path.resolve(workspacePath);

    const scanAndWarm = async (dir: string) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          if (item !== "node_modules" && item !== ".git") {
            await scanAndWarm(full);
          }
        } else if (stat.isFile() && extensions.includes(path.extname(item))) {
          try {
            const content = fs.readFileSync(full, "utf-8").substring(0, 1000);
            if (content.trim()) {
              // Trigger embedding warming call
              await OllamaClient.embed(content);
            }
          } catch (err: any) {
            console.warn(`Warning warming cache for file ${full}:`, err.message);
          }
        }
      }
    };

    try {
      await scanAndWarm(root);
    } catch (err) {
      Logger.error("Cache warmer search traversal error", err);
    }
  }
}
