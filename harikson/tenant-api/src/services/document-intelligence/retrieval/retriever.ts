import crypto from 'crypto';
import { Redis } from 'ioredis';
import { executeTenantQuery } from '../../../db/pool.js';
import { OllamaClient } from '../../../llm/ollama.js';
import { CitationEngine } from './citations.js';
import { CitationReference } from '../types.js';
import logger from '../../../utils/logger.js';

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

export interface RetrievalOptions {
  documentIds?: string[];
  collectionId?: string;
  maxResults?: number;
  minScoreThreshold?: number;
}

export interface RetrievalResult {
  contextText: string;
  citations: CitationReference[];
  matchedChunksCount: number;
}

export class DocumentRetriever {
  /**
   * Hybrid retrieval across tenant documents with optional document or collection filters
   */
  public static async retrieveContext(
    tenantId: string,
    query: string,
    options: RetrievalOptions = {}
  ): Promise<RetrievalResult> {
    const startTime = Date.now();
    const maxResults = options.maxResults || 5;
    const minThreshold = options.minScoreThreshold ?? 0.25;

    // Cache key incorporates tenantId, query, and filter IDs
    const docFilterKey = (options.documentIds || []).sort().join(',');
    const queryHash = crypto
      .createHash('sha256')
      .update(`${query.trim().toLowerCase()}:${docFilterKey}:${options.collectionId || ''}`)
      .digest('hex')
      .slice(0, 32);

    const ctxCacheKey = `doc_intel:ctx:${tenantId}:${queryHash}:${maxResults}`;
    const embCacheKey = `doc_intel:emb:${crypto.createHash('sha256').update(query.trim().toLowerCase()).digest('hex').slice(0, 32)}`;

    // 1. Check Redis Context Cache
    try {
      const cached = await redis.get(ctxCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        logger.info({ durationMs: Date.now() - startTime }, `[RAG] Document Retriever cache HIT for "${query.slice(0, 30)}..."`);
        return parsed;
      }
    } catch (_) {}

    // 2. Compute or retrieve query embedding
    let queryEmbedding: number[] | null = null;
    try {
      const cachedEmb = await redis.get(embCacheKey);
      if (cachedEmb) queryEmbedding = JSON.parse(cachedEmb);
    } catch (_) {}

    if (!queryEmbedding) {
      try {
        queryEmbedding = await OllamaClient.embed(query);
        try {
          await redis.setex(embCacheKey, 86400, JSON.stringify(queryEmbedding));
        } catch (_) {}
      } catch (err: any) {
        logger.warn('Embedding computation failed, falling back to text search only:', err?.message);
      }
    }

    const embeddingString = queryEmbedding ? `[${queryEmbedding.join(',')}]` : null;

    // 3. Construct SQL with Multi-Document and Collection filtering
    const params: any[] = [tenantId, query];
    let paramIndex = 3;

    let filterClause = '';
    if (options.documentIds && options.documentIds.length > 0) {
      filterClause += ` AND kd.id = ANY($${paramIndex++}::uuid[])`;
      params.push(options.documentIds);
    }

    if (options.collectionId) {
      filterClause += ` AND kd.collection_id = $${paramIndex++}::uuid`;
      params.push(options.collectionId);
    }

    params.push(maxResults);
    const limitParam = `$${paramIndex}`;

    // Hybrid SQL: Vector similarity (0.65) + Full-Text BM25 tsvector (0.35)
    const sql = embeddingString
      ? `SELECT de.content,
                kd.id as document_id,
                kd.filename,
                de.metadata->>'page_number' as page_number,
                de.metadata->>'section' as section,
                de.metadata->>'source_location' as source_location,
                (1 - (de.embedding <=> '${embeddingString}'::vector)) AS vector_score,
                COALESCE(ts_rank(kd.tsv, plainto_tsquery('english', $2)), 0) AS text_score,
                (0.65 * (1 - (de.embedding <=> '${embeddingString}'::vector)) + 0.35 * COALESCE(ts_rank(kd.tsv, plainto_tsquery('english', $2)), 0)) AS final_score
         FROM document_embeddings de
         JOIN knowledge_documents kd ON de.knowledge_document_id = kd.id
         WHERE de.tenant_id = $1 AND kd.is_active = true AND kd.rag_enabled = true ${filterClause}
         ORDER BY (0.65 * (1 - (de.embedding <=> '${embeddingString}'::vector)) + 0.35 * COALESCE(ts_rank(kd.tsv, plainto_tsquery('english', $2)), 0)) DESC
         LIMIT ${limitParam}`
      : `SELECT de.content,
                kd.id as document_id,
                kd.filename,
                de.metadata->>'page_number' as page_number,
                de.metadata->>'section' as section,
                de.metadata->>'source_location' as source_location,
                0 AS vector_score,
                COALESCE(ts_rank(kd.tsv, plainto_tsquery('english', $2)), 0) AS text_score,
                COALESCE(ts_rank(kd.tsv, plainto_tsquery('english', $2)), 0) AS final_score
         FROM document_embeddings de
         JOIN knowledge_documents kd ON de.knowledge_document_id = kd.id
         WHERE de.tenant_id = $1 AND kd.is_active = true AND kd.rag_enabled = true ${filterClause}
         ORDER BY text_score DESC
         LIMIT ${limitParam}`;

    try {
      const rows = await executeTenantQuery(tenantId, async (client) => {
        const res = await client.query(sql, params);
        return res.rows;
      });

      const matchedRows = rows.filter((r: any) => (r.final_score || r.vector_score || r.text_score) > minThreshold);

      const formattedChunks = matchedRows.map((r: any) => {
        const pageNum = r.page_number ? parseInt(r.page_number, 10) : undefined;
        const loc = r.source_location || (pageNum ? `Page ${pageNum}` : 'General Document');
        return `[Source: ${r.filename} | ${loc}]\n${r.content}`;
      });

      const contextText = formattedChunks.length === 0
        ? ''
        : formattedChunks.join('\n\n---\n\n');

      const citations = CitationEngine.buildCitations(
        matchedRows.map((r: any) => ({
          documentId: r.document_id,
          filename: r.filename,
          pageNumber: r.page_number ? parseInt(r.page_number, 10) : undefined,
          section: r.section || undefined,
          content: r.content,
          final_score: r.final_score,
        }))
      );

      const result: RetrievalResult = {
        contextText,
        citations,
        matchedChunksCount: matchedRows.length,
      };

      // Cache for 300s
      try {
        await redis.setex(ctxCacheKey, 300, JSON.stringify(result));
      } catch (_) {}

      logger.info(
        { durationMs: Date.now() - startTime, chunks: matchedRows.length },
        `[RAG] Document Retriever returned ${matchedRows.length} chunks for "${query.slice(0, 30)}..."`
      );

      return result;
    } catch (err: any) {
      logger.error('Document Retriever error:', err);
      return { contextText: '', citations: [], matchedChunksCount: 0 };
    }
  }
}
