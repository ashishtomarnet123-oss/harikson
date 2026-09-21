import pg from 'pg';
import { pool, redis } from '../db/pool.js';
import { OllamaClient } from '../llm/ollama.js';
import pdf from 'pdf-parse';
import crypto from 'crypto';
import pLimit from 'p-limit';
import axios from 'axios';
import { encryptDocumentContent } from './documentEncryptionService.js';

export class RagService {
  private static async executeQuery<T>(
    tenantId: string,
    callback: (client: pg.PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("SELECT set_config('app.current_tenant', $1, false)", [tenantId]).catch(() => {});
      const result = await callback(client);
      await client.query("SELECT set_config('app.current_tenant', '', false)").catch(() => {});
      return result;
    } catch (err) {
      try {
        await client.query("SELECT set_config('app.current_tenant', '', false)").catch(() => {});
      } catch (cleanupErr: any) {
        console.warn(
          'Warning clearing tenant context on query error in RagService:',
          cleanupErr.message
        );
      }
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Parallelized batch embedding generation with p-limit concurrency (max 5),
   * 30-second chunk timeout, single retry after 2s, chunk skipping on failure, and progress tracking.
   */
  private static async generateBatchEmbeddings(
    chunks: string[],
    concurrency = 5
  ): Promise<Array<{ chunk: string; embedding: number[] }>> {
    const validChunks = chunks.filter((c) => c && c.trim().length > 0);
    const total = validChunks.length;
    if (total === 0) return [];

    const limit = pLimit(concurrency);
    let completedCount = 0;

    const tasks = validChunks.map((chunk, index) =>
      limit(async () => {
        const timeoutMs = 30000;

        const embedSingleChunk = async (): Promise<number[]> => {
          let timer: NodeJS.Timeout | null = null;
          const timeoutPromise = new Promise<number[]>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Embedding timed out after 30s`)), timeoutMs);
          });

          try {
            const res = await Promise.race([OllamaClient.embed(chunk), timeoutPromise]);
            if (timer) clearTimeout(timer);
            return res;
          } catch (err) {
            if (timer) clearTimeout(timer);
            throw err;
          }
        };

        let embedding: number[] | null = null;
        try {
          embedding = await embedSingleChunk();
        } catch (firstErr: any) {
          console.warn(
            `⚠️ [Xarwiz RAG] Embed attempt 1 failed for chunk ${index + 1}/${total}: ${firstErr.message}. Retrying in 2s...`
          );
          await new Promise((res) => setTimeout(res, 2000));
          try {
            embedding = await embedSingleChunk();
          } catch (retryErr: any) {
            console.error(
              `❌ [Xarwiz RAG] Skipping chunk ${index + 1}/${total} after retry failure:`,
              retryErr.message
            );
            return null;
          }
        }

        completedCount++;
        const percent = Math.round((completedCount / total) * 100);
        console.log(`⏳ [Xarwiz RAG] Embedding chunk ${completedCount}/${total} (${percent}%)`);

        return { chunk, embedding };
      })
    );

    const results = await Promise.all(tasks);
    return results.filter((item): item is { chunk: string; embedding: number[] } => item !== null);
  }

  // Parse uploaded file buffers based on file type
  static async indexFile(
    tenantId: string,
    userId: string,
    name: string,
    buffer: Buffer,
    type: string
  ): Promise<number> {
    let text = '';

    if (type.toLowerCase() === 'pdf') {
      const parsed = await pdf(buffer);
      text = parsed.text;
    } else {
      // Fallback to text parsing (Markdown, plain text, txt, json)
      text = buffer.toString('utf-8');
    }

    const result = await this.indexText(tenantId, userId, name, text, type || 'txt', buffer.length || 0);
    return result.chunksIndexed;
  }

  // Index already-extracted plain text (e.g. client-side PDF.js/OCR output
  // from the "My RAG Drive" settings tab, or a downloaded Google Drive file
  // — anything that never sends a raw file buffer, just text it already
  // extracted). Returns the created document's id alongside the chunk count
  // so callers like the Drive sync worker can link a synced-file record to
  // the resulting knowledge_documents row.
  static async indexText(
    tenantId: string,
    userId: string,
    name: string,
    text: string,
    fileType: string = 'txt',
    sizeBytes: number = 0
  ): Promise<{ documentId: string; chunksIndexed: number }> {
    try {
      if (!text.trim()) {
        throw new Error('Document content is empty');
      }

      const chunks = this.chunkText(text, 800, 150);
      const newDocId = crypto.randomUUID();

      // Encrypt content at rest using AES-256-GCM
      const { encryptedContent, iv, authTag, keyId } = encryptDocumentContent(newDocId, text);

      await this.executeQuery(tenantId, async (client) => {
        await client.query(
          `INSERT INTO knowledge_documents (
            id, tenant_id, user_id, title, filename, file_type, file_size_bytes,
            content, content_iv, content_tag, key_id, is_active, rag_enabled, status
           )
           VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, true, true, 'indexed')`,
          [
            newDocId,
            tenantId,
            userId,
            name,
            fileType,
            sizeBytes || text.length,
            encryptedContent,
            iv,
            authTag,
            keyId,
          ]
        );
      });

      // Generate embeddings in parallel (max 5 concurrent calls)
      const chunkEmbeddings = await this.generateBatchEmbeddings(chunks, 5);

      // Save embeddings inside DB connection
      await this.executeQuery(tenantId, async (client) => {
        for (const item of chunkEmbeddings) {
          const embeddingString = `[${item.embedding.join(',')}]`;
          await client.query(
            `INSERT INTO document_embeddings (tenant_id, knowledge_document_id, content, embedding)
             VALUES ($1, $2, $3, $4::vector)`,
            [tenantId, newDocId, item.chunk, embeddingString]
          );
        }
      });

      console.log(
        `📂 [Xarwiz RAG] Indexed document ${name}: created ${chunkEmbeddings.length}/${chunks.length} chunks.`
      );
      return { documentId: newDocId, chunksIndexed: chunkEmbeddings.length };
    } catch (error) {
      console.error(
        `❌ [Xarwiz RAG] Ingestion error on document ${name}:`,
        error
      );
      throw error;
    }
  }

  // Crawl and index URL content
  static async indexUrl(
    tenantId: string,
    userId: string,
    url: string
  ): Promise<number> {
    const res = await axios.get(url, {
      timeout: 15000,
      maxContentLength: 5 * 1024 * 1024,
      headers: { 'User-Agent': 'XarwizBot/1.0 (+https://xarwiz.com)' },
      responseType: 'text',
    });
    const html = typeof res.data === 'string' ? res.data : String(res.data);
    const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) throw new Error('No extractable text content at URL');
    const result = await this.indexText(tenantId, userId, url, text, 'url', text.length);
    return result.chunksIndexed;
  }

  // Hybrid (Semantic Vector + Full-Text BM25) search to find relevant context with Redis caching
  static async queryContext(
    tenantId: string,
    query: string,
    maxResults = 3
  ): Promise<string> {
    const startTime = Date.now();
    const queryHash = crypto
      .createHash('sha256')
      .update(query.trim().toLowerCase())
      .digest('hex')
      .slice(0, 32);

    const ctxCacheKey = `rag:ctx:${tenantId}:${queryHash}:${maxResults}`;
    const embCacheKey = `rag:emb:${queryHash}`;

    try {
      // 1. Check Query-Level Context Cache
      try {
        const cachedCtx = await redis.get(ctxCacheKey);
        if (cachedCtx !== null) {
          const duration = Date.now() - startTime;
          console.log(`⚡ [TIMING] RAG Context Cache HIT in ${duration}ms for "${query.slice(0, 30)}..."`);
          return cachedCtx;
        }
      } catch (cacheErr: any) {
        // Cache read failure is non-fatal
      }

      // 2. Check Embedding Cache or compute embedding
      let queryEmbedding: number[] | null = null;
      try {
        const cachedEmb = await redis.get(embCacheKey);
        if (cachedEmb) {
          queryEmbedding = JSON.parse(cachedEmb);
        }
      } catch (_) {}

      if (!queryEmbedding) {
        const embStart = Date.now();
        queryEmbedding = await OllamaClient.embed(query);
        console.log(`[TIMING] Ollama embedding generation took ${Date.now() - embStart}ms`);
        try {
          await redis.setex(embCacheKey, 86400, JSON.stringify(queryEmbedding)); // 24hr TTL
        } catch (_) {}
      }

      const embeddingString = `[${queryEmbedding.join(',')}]`;

      const ragRows = await this.executeQuery(tenantId, async (client) => {
        const res = await client.query(
          `SELECT de.content, kd.filename,
                  (1 - (de.embedding <=> $1::vector)) AS vector_score,
                  COALESCE(ts_rank(kd.tsv, plainto_tsquery('english', $2)), 0) AS text_score,
                  (0.7 * (1 - (de.embedding <=> $1::vector)) + 0.3 * COALESCE(ts_rank(kd.tsv, plainto_tsquery('english', $2)), 0)) AS final_score
           FROM document_embeddings de
           JOIN knowledge_documents kd ON de.knowledge_document_id = kd.id
           WHERE de.tenant_id = $3 AND kd.is_active = true AND kd.rag_enabled = true
           ORDER BY (0.7 * (1 - (de.embedding <=> $1::vector)) + 0.3 * COALESCE(ts_rank(kd.tsv, plainto_tsquery('english', $2)), 0)) DESC
           LIMIT $4`,
          [embeddingString, query, tenantId, maxResults]
        );
        return res.rows as Array<{
          content: string;
          vector_score: number;
          text_score: number;
          final_score: number;
          filename: string;
        }>;
      });

      const matched = ragRows
        .filter((row) => (row.final_score || row.vector_score) > 0.25)
        .map((row) => `[Source: ${row.filename}]: ${row.content}`);

      const result = matched.length === 0
        ? 'No matching context found in knowledge base.'
        : matched.join('\n\n');

      // 3. Cache Query Context (TTL 300s = 5m)
      try {
        await redis.setex(ctxCacheKey, 300, result);
      } catch (_) {}

      const totalDuration = Date.now() - startTime;
      console.log(`[TIMING] RAG Context lookup completed in ${totalDuration}ms for "${query.slice(0, 30)}..."`);
      return result;
    } catch (error: any) {
      console.warn(
        '⚠️ [Xarwiz RAG] Query failed, returning empty context:',
        error.message
      );
      return 'No matching context found in knowledge base.';
    }
  }

  // Split text into sliding chunks
  private static chunkText(
    text: string,
    size: number,
    overlap: number
  ): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    let i = 0;
    while (i < words.length) {
      const chunkWords = words.slice(i, i + size);
      if (chunkWords.length > 0) {
        chunks.push(chunkWords.join(' '));
      }
      i += size - overlap;
    }

    return chunks;
  }
}
