import pg from "pg";
import { pool } from "../db/pool.js";
import { OllamaClient } from "../llm/ollama.js";
import pdf from "pdf-parse";
import crypto from "crypto";

export class RagService {
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
        console.warn("Warning clearing tenant context on query error in RagService:", cleanupErr.message);
      }
      throw err;
    } finally {
      client.release();
    }
  }

  // Parse uploaded file buffers based on file type
  static async indexFile(tenantId: string, userId: string, name: string, buffer: Buffer, type: string): Promise<number> {
    let text = "";

    try {
      if (type.toLowerCase() === "pdf") {
        const parsed = await pdf(buffer);
        text = parsed.text;
      } else {
        // Fallback to text parsing (Markdown, plain text, txt, json)
        text = buffer.toString("utf-8");
      }

      if (!text.trim()) {
        throw new Error("Extracted document content is empty");
      }

      // Chunk the text
      const chunks = this.chunkText(text, 800, 150);

      // Save document to knowledge_documents first
      const newDocId = crypto.randomUUID();
      const fileType = type || "txt";
      
      await this.executeQuery(tenantId, async (client) => {
        await client.query(
          `INSERT INTO knowledge_documents (id, tenant_id, user_id, filename, file_type, file_size_bytes, content, is_active, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'indexed')`,
          [newDocId, tenantId, userId, name, fileType, buffer.length || 0, text, true]
        );
      });

      // Generate embeddings and insert chunks outside client query loop to avoid holding connections
      const chunkEmbeddings: Array<{ chunk: string; embedding: number[] }> = [];
      for (const chunk of chunks) {
        if (!chunk.trim()) continue;
        const embedding = await OllamaClient.embed(chunk);
        chunkEmbeddings.push({ chunk, embedding });
      }

      // Save embeddings inside DB connection
      await this.executeQuery(tenantId, async (client) => {
        for (const item of chunkEmbeddings) {
          const embeddingString = `[${item.embedding.join(",")}]`;
          await client.query(
            `INSERT INTO document_embeddings (tenant_id, knowledge_document_id, content, embedding)
             VALUES ($1, $2, $3, $4::vector)`,
            [tenantId, newDocId, item.chunk, embeddingString]
          );
        }
      });

      console.log(`📂 [Harikson RAG] Indexed document ${name}: created ${chunks.length} chunks.`);
      return chunks.length;
    } catch (error) {
      console.error(`❌ [Harikson RAG] Ingestion error on document ${name}:`, error);
      throw error;
    }
  }

  // Crawl and index URL content
  static async indexUrl(tenantId: string, userId: string, url: string): Promise<number> {
    try {
      // Mock crawler fetching content from remote webpage
      const text = `Neuravolt AI agent documentation for ${url}. This page details configuration, setup, widget integration, billing subscriptions, support guidelines, and deployment metrics. The platform executes on isolated VPS nodes using Qwen3-Coder models.`;
      
      const chunks = this.chunkText(text, 800, 150);
      const newDocId = crypto.randomUUID();

      await this.executeQuery(tenantId, async (client) => {
        await client.query(
          `INSERT INTO knowledge_documents (id, tenant_id, user_id, filename, file_type, file_size_bytes, content, is_active, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'indexed')`,
          [newDocId, tenantId, userId, url, "url", text.length || 0, text, true]
        );
      });

      const chunkEmbeddings: Array<{ chunk: string; embedding: number[] }> = [];
      for (const chunk of chunks) {
        if (!chunk.trim()) continue;
        const embedding = await OllamaClient.embed(chunk);
        chunkEmbeddings.push({ chunk, embedding });
      }

      await this.executeQuery(tenantId, async (client) => {
        for (const item of chunkEmbeddings) {
          const embeddingString = `[${item.embedding.join(",")}]`;
          await client.query(
            `INSERT INTO document_embeddings (tenant_id, knowledge_document_id, content, embedding)
             VALUES ($1, $2, $3, $4::vector)`,
            [tenantId, newDocId, item.chunk, embeddingString]
          );
        }
      });

      console.log(`📂 [Harikson RAG] Indexed URL ${url}: created ${chunks.length} chunks.`);
      return chunks.length;
    } catch (error) {
      console.error(`❌ [Harikson RAG] Crawl error on ${url}:`, error);
      throw error;
    }
  }

  // Semantic/Keyword search to find relevant context
  static async queryContext(tenantId: string, query: string, maxResults = 3): Promise<string> {
    try {
      const queryEmbedding = await OllamaClient.embed(query);
      const embeddingString = `[${queryEmbedding.join(",")}]`;
      
      const ragRows = await this.executeQuery(tenantId, async (client) => {
        const res = await client.query(
          `SELECT de.content, 1 - (de.embedding <=> $1::vector) AS similarity, kd.filename
           FROM document_embeddings de
           JOIN knowledge_documents kd ON de.knowledge_document_id = kd.id
           WHERE de.tenant_id = $2 AND kd.is_active = true
           ORDER BY de.embedding <=> $1::vector
           LIMIT $3`,
          [embeddingString, tenantId, maxResults]
        );
        return res.rows as Array<{ content: string; similarity: number; filename: string }>;
      });

      const matched = ragRows
        .filter((row) => row.similarity > 0.35)
        .map((row) => `[Source: ${row.filename}]: ${row.content}`);

      if (matched.length === 0) {
        return "No matching context found in knowledge base.";
      }

      return matched.join("\n\n");
    } catch (error: any) {
      console.warn("⚠️ [Harikson RAG] Query failed, returning empty context:", error.message);
      return "No matching context found in knowledge base.";
    }
  }

  // Split text into sliding chunks
  private static chunkText(text: string, size: number, overlap: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    
    let i = 0;
    while (i < words.length) {
      const chunkWords = words.slice(i, i + size);
      if (chunkWords.length > 0) {
        chunks.push(chunkWords.join(" "));
      }
      i += (size - overlap);
    }

    return chunks;
  }
}
