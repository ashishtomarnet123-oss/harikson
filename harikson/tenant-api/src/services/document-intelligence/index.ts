import crypto from 'crypto';
import pLimit from 'p-limit';
import { executeTenantQuery } from '../../db/pool.js';
import { encryptDocumentContent, decryptDocumentContent } from '../documentEncryptionService.js';
import { OllamaClient } from '../../llm/ollama.js';
import logger from '../../utils/logger.js';

import { DocumentProcessor } from './processors/baseProcessor.js';
import { PdfProcessor } from './processors/pdfProcessor.js';
import { DocxProcessor } from './processors/docxProcessor.js';
import { SpreadsheetProcessor } from './processors/spreadsheetProcessor.js';
import { PresentationProcessor } from './processors/presentationProcessor.js';
import { CodeProcessor } from './processors/codeProcessor.js';
import { ImageProcessor } from './processors/imageProcessor.js';
import { TextProcessor } from './processors/textProcessor.js';

import { SecurityValidator } from './security/securityValidator.js';
import { SemanticChunker } from './chunking/semanticChunker.js';
import { DocumentAnalyzer } from './analysis/documentAnalyzer.js';
import { DocumentRetriever } from './retrieval/retriever.js';
import { CitationEngine } from './retrieval/citations.js';

import {
  DocumentMetadata,
  DocumentStructure,
  SemanticChunk,
  DocumentType,
  ProcessedDocumentResult,
  CitationReference,
} from './types.js';

export class DocumentIntelligenceEngine {
  private static processors: DocumentProcessor[] = [
    new PdfProcessor(),
    new DocxProcessor(),
    new SpreadsheetProcessor(),
    new PresentationProcessor(),
    new CodeProcessor(),
    new ImageProcessor(),
    new TextProcessor(),
  ];

  /**
   * Find matching processor for a given file
   */
  public static getProcessor(extension: string, mimeType?: string): DocumentProcessor {
    for (const processor of this.processors) {
      if (processor.supports(extension, mimeType)) {
        return processor;
      }
    }
    // Fallback to text processor
    return new TextProcessor();
  }

  /**
   * Complete end-to-end ingestion pipeline for an uploaded file
   */
  public static async processAndIndexFile(
    tenantId: string,
    userId: string | null,
    rawFilename: string,
    buffer: Buffer,
    mimeType?: string,
    collectionId?: string
  ): Promise<{
    documentId: string;
    filename: string;
    documentType: DocumentType;
    pageCount: number;
    wordCount: number;
    chunksCount: number;
    suggestedQuestions: string[];
    summary: string;
    status: string;
  }> {
    const startTime = Date.now();

    // 1. Security validation and sanitization
    const validation = SecurityValidator.validateFile(rawFilename, buffer, mimeType);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid file format or security rejection');
    }

    const { sanitizedFilename, extension, contentHash } = validation;
    const documentId = crypto.randomUUID();

    // 2. Check for duplicate file within tenant
    try {
      const existing = await executeTenantQuery(tenantId, async (client) => {
        const res = await client.query(
          `SELECT id, filename, document_type, page_count, word_count, metadata, status
           FROM knowledge_documents
           WHERE tenant_id = $1 AND content_hash = $2 AND is_active = true
           LIMIT 1`,
          [tenantId, contentHash]
        );
        return res.rows[0];
      });

      if (existing && existing.status === 'indexed') {
        logger.info(`[DocIntel] Deduplication HIT for ${sanitizedFilename} (matches doc ${existing.id})`);
        const meta = existing.metadata || {};
        return {
          documentId: existing.id,
          filename: existing.filename,
          documentType: existing.document_type || 'general',
          pageCount: existing.page_count || 1,
          wordCount: existing.word_count || 0,
          chunksCount: meta.chunksCount || 1,
          suggestedQuestions: meta.suggestedQuestions || [],
          summary: meta.summary || '',
          status: 'INDEXED',
        };
      }
    } catch (_) {}

    // Validate if userId exists in tenant's users table, else set null to respect FK
    let validUserId: string | null = null;
    if (userId && userId !== '00000000-0000-0000-0000-000000000000') {
      try {
        const userExists = await executeTenantQuery(tenantId, async (client) => {
          const r = await client.query('SELECT id FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
          return r.rows.length > 0;
        });
        if (userExists) validUserId = userId;
      } catch (_) {
        validUserId = null;
      }
    }

    // 3. Create initial document record with 'processing' state
    await executeTenantQuery(tenantId, async (client) => {
      await client.query(
        `INSERT INTO knowledge_documents (
          id, tenant_id, user_id, title, filename, file_type, file_size_bytes,
          content, content_hash, collection_id, is_active, rag_enabled, status, processing_step
         )
         VALUES ($1, $2, $3, $4, $4, $5, $6, '', $7, $8, true, true, 'processing', 'extracting')`,
        [
          documentId,
          tenantId,
          validUserId,
          sanitizedFilename,
          extension,
          buffer.length,
          contentHash,
          collectionId || null,
        ]
      );
    });

    try {
      // 4. Run Specialized Document Processor
      const processor = this.getProcessor(extension, mimeType);
      const processed = await processor.process(buffer, sanitizedFilename, mimeType, { userId, tenantId });
      const { fullText, structure } = processed;

      if (!fullText || !fullText.trim()) {
        throw new Error('No extractable text or content detected in document.');
      }

      // 5. Structure & Classification Analysis
      const docType = processed.metadata?.documentType || DocumentAnalyzer.classifyDocument(sanitizedFilename, fullText, extension);
      const entities = DocumentAnalyzer.extractEntities(fullText);
      const suggestedQuestions = DocumentAnalyzer.generateSuggestedQuestions(docType, sanitizedFilename);
      const quickSummary = DocumentAnalyzer.generateQuickSummary(docType, fullText, processed.metadata);

      const pageCount = processed.metadata.pageCount || 1;
      const wordCount = processed.metadata.wordCount || fullText.split(/\s+/).filter(Boolean).length;

      // Update state: Structuring & Chunking
      await executeTenantQuery(tenantId, async (client) => {
        await client.query(
          `UPDATE knowledge_documents
           SET processing_step = 'chunking'
           WHERE id = $1 AND tenant_id = $2`,
          [documentId, tenantId]
        );
      });

      // 6. Semantic Structure-Aware Chunking
      const chunks = SemanticChunker.chunkDocument(
        documentId,
        sanitizedFilename,
        fullText,
        structure,
        docType
      );

      // 7. Encrypt content at rest using AES-256-GCM
      const { encryptedContent, iv, authTag, keyId } = encryptDocumentContent(documentId, fullText);

      // Update state: Embedding
      await executeTenantQuery(tenantId, async (client) => {
        await client.query(
          `UPDATE knowledge_documents
           SET processing_step = 'embedding'
           WHERE id = $1 AND tenant_id = $2`,
          [documentId, tenantId]
        );
      });

      // 8. Generate Embeddings with concurrency control (max 5 parallel calls)
      const limit = pLimit(5);
      const embedTasks = chunks.map((chunk) =>
        limit(async () => {
          try {
            const emb = await OllamaClient.embed(chunk.content);
            return { chunk, embedding: emb };
          } catch (err: any) {
            logger.warn(`Failed embedding chunk: ${err?.message}`);
            return null;
          }
        })
      );

      const embeddedResults = (await Promise.all(embedTasks)).filter(
        (r): r is { chunk: SemanticChunk; embedding: number[] } => r !== null
      );

      // 9. Store embeddings and update document metadata
      const durationMs = Date.now() - startTime;
      const metadataPayload: DocumentMetadata = {
        filename: sanitizedFilename,
        mimeType: mimeType || 'application/octet-stream',
        sizeBytes: buffer.length,
        pageCount,
        wordCount,
        documentType: docType,
        contentHash,
        entities,
        tablesCount: processed.metadata.tablesCount || 0,
        imagesCount: processed.metadata.imagesCount || 0,
        summary: quickSummary,
        suggestedQuestions,
        processingDurationMs: durationMs,
        hasOcr: processed.metadata.hasOcr || false,
        hasVision: processed.metadata.hasVision || false,
      };

      await executeTenantQuery(tenantId, async (client) => {
        // Insert chunks with page and section metadata
        for (const item of embeddedResults) {
          const embStr = `[${item.embedding.join(',')}]`;
          const chunkMeta = {
            page_number: item.chunk.pageNumber,
            section: item.chunk.section,
            heading: item.chunk.heading,
            source_location: item.chunk.sourceLocation,
            token_count: item.chunk.tokenCount,
          };

          await client.query(
            `INSERT INTO document_embeddings (
              tenant_id, knowledge_document_id, content, embedding, metadata
             )
             VALUES ($1, $2, $3, $4::vector, $5)`,
            [tenantId, documentId, item.chunk.content, embStr, JSON.stringify(chunkMeta)]
          );
        }

        // Finalize knowledge_documents row
        await client.query(
          `UPDATE knowledge_documents
           SET content = $1,
               content_iv = $2,
               content_tag = $3,
               key_id = $4,
               metadata = $5,
               structure = $6,
               page_count = $7,
               word_count = $8,
               document_type = $9,
               status = 'indexed',
               processing_step = 'completed',
               updated_at = NOW()
           WHERE id = $10 AND tenant_id = $11`,
          [
            encryptedContent,
            iv,
            authTag,
            keyId,
            JSON.stringify(metadataPayload),
            JSON.stringify(structure),
            pageCount,
            wordCount,
            docType,
            documentId,
            tenantId,
          ]
        );
      });

      logger.info(
        `✅ [DocIntel] Processed & indexed ${sanitizedFilename} (${docType}, ${pageCount} pages, ${chunks.length} chunks) in ${durationMs}ms`
      );

      return {
        documentId,
        filename: sanitizedFilename,
        documentType: docType,
        pageCount,
        wordCount,
        chunksCount: embeddedResults.length,
        suggestedQuestions,
        summary: quickSummary,
        status: 'INDEXED',
      };
    } catch (err: any) {
      logger.error(`❌ [DocIntel] Pipeline failure on ${sanitizedFilename}:`, err);
      // Mark failed with error message
      await executeTenantQuery(tenantId, async (client) => {
        await client.query(
          `UPDATE knowledge_documents
           SET status = 'failed',
               processing_step = 'failed',
               error_message = $1,
               updated_at = NOW()
           WHERE id = $2 AND tenant_id = $3`,
          [err?.message || 'Processing failed', documentId, tenantId]
        );
      });
      throw err;
    }
  }

  /**
   * Ask AI question over a specific document with verified citations
   */
  public static async queryDocument(
    tenantId: string,
    documentId: string,
    query: string
  ): Promise<{
    answer: string;
    citations: CitationReference[];
  }> {
    const retrieval = await DocumentRetriever.retrieveContext(tenantId, query, {
      documentIds: [documentId],
      maxResults: 6,
    });

    if (!retrieval.contextText) {
      return {
        answer: 'No relevant information found in this document for your question.',
        citations: [],
      };
    }

    const docRow = await executeTenantQuery(tenantId, async (client) => {
      const res = await client.query(
        `SELECT filename, document_type, metadata FROM knowledge_documents WHERE id = $1 AND tenant_id = $2`,
        [documentId, tenantId]
      );
      return res.rows[0];
    });

    const docName = docRow?.filename || 'Document';
    const wrappedContext = SecurityValidator.wrapUntrustedDocumentContext(docName, retrieval.contextText);

    const systemPrompt = `You are Xarwiz Document Intelligence. Answer the user's question accurately using ONLY the verified excerpts from "${docName}".
Cite specific pages and sections whenever possible (e.g. "[Page X, Section Y]").
Do not invent facts not present in the excerpt. If the answer cannot be found in the document, state so clearly.`;

    const prompt = `${wrappedContext}\n\nUser Question: ${query}`;
    const rawAnswer = await OllamaClient.generate(prompt, systemPrompt);
    const finalAnswer = CitationEngine.appendMarkdownCitations(rawAnswer, retrieval.citations);

    return {
      answer: finalAnswer,
      citations: retrieval.citations,
    };
  }

  /**
   * Run specialized document analysis mode (Executive, Legal, Financial, etc.)
   */
  public static async analyzeDocumentMode(
    tenantId: string,
    documentId: string,
    mode: 'executive' | 'financial' | 'legal' | 'technical' | 'compliance' | 'risks' | 'data'
  ): Promise<{
    analysis: string;
    mode: string;
    citations: CitationReference[];
  }> {
    const docRow = await executeTenantQuery(tenantId, async (client) => {
      const res = await client.query(
        `SELECT id, filename, document_type, page_count, word_count, content, content_iv, content_tag, key_id, structure, metadata
         FROM knowledge_documents WHERE id = $1 AND tenant_id = $2`,
        [documentId, tenantId]
      );
      return res.rows[0];
    });

    if (!docRow) throw new Error('Document not found');

    let plainText = docRow.content;
    if (docRow.content_iv && docRow.content_tag) {
      plainText = decryptDocumentContent(docRow.id, docRow.content, docRow.content_iv, docRow.content_tag, docRow.key_id);
    }

    // Limit context for prompt to 12,000 chars to avoid model truncation
    const contextExcerpt = plainText.substring(0, 12000);
    const wrapped = SecurityValidator.wrapUntrustedDocumentContext(docRow.filename, contextExcerpt);

    const modePrompts: Record<string, string> = {
      executive: 'Provide an Executive Summary: 1) Purpose & Scope, 2) Key Takeaways (bulleted), 3) Strategic Implications, 4) Recommended Next Actions.',
      financial: 'Perform a Financial Analysis: 1) Revenue & Cost Summary, 2) Key Financial Metrics & Totals, 3) Cash Flow & Margin Observations, 4) Financial Risks.',
      legal: 'Conduct a Legal & Risk Review: 1) Core Obligations & Liabilities, 2) Termination & Breach Conditions, 3) Indemnity & Warranties, 4) High-Risk or Ambiguous Clauses.',
      technical: 'Provide a Technical Breakdown: 1) Architecture & Components, 2) Data Structures & Flows, 3) Dependencies & Interfaces, 4) Potential Bottlenecks or Security Risks.',
      compliance: 'Review for Regulatory & Policy Compliance: 1) Mandatory Requirements, 2) Gaps or Violations Identified, 3) Audit Readiness, 4) Remediation Steps.',
      risks: 'Perform a Comprehensive Risk Assessment: 1) Critical Risks, 2) Moderate Risks, 3) Unknowns/Missing Information, 4) Mitigation Strategies.',
      data: 'Provide a Data & Metric Summary: 1) Key Numbers & Statistics, 2) Data Quality / Missing Information, 3) Significant Outliers or Trends.',
    };

    const requestedTask = modePrompts[mode] || modePrompts.executive;
    const systemPrompt = `You are a Senior Document Intelligence Specialist. Conduct a structured, professional ${mode.toUpperCase()} analysis of the attached document. Be direct, authoritative, and cite specific pages/sections.`;

    const prompt = `${wrapped}\n\nTask:\n${requestedTask}`;
    const rawAnalysis = await OllamaClient.generate(prompt, systemPrompt);

    const citations = [
      {
        documentId: docRow.id,
        filename: docRow.filename,
        pageNumber: 1,
        sourceLocation: `Full Document Analysis (${docRow.page_count} pages)`,
        snippet: contextExcerpt.substring(0, 150),
        confidence: 'HIGH' as const,
      },
    ];

    return {
      analysis: rawAnalysis,
      mode,
      citations,
    };
  }

  /**
   * Compare two or more documents
   */
  public static async compareDocuments(
    tenantId: string,
    documentIds: string[],
    comparisonTopic?: string
  ): Promise<{
    comparison: string;
    documents: Array<{ id: string; filename: string }>;
  }> {
    if (documentIds.length < 2) {
      throw new Error('At least two documents are required for comparison');
    }

    const docs = await executeTenantQuery(tenantId, async (client) => {
      const res = await client.query(
        `SELECT id, filename, document_type, content, content_iv, content_tag, key_id
         FROM knowledge_documents
         WHERE id = ANY($1::uuid[]) AND tenant_id = $2`,
        [documentIds, tenantId]
      );
      return res.rows;
    });

    if (docs.length < 2) {
      throw new Error('One or more documents could not be found');
    }

    const docTexts = docs.map((doc: any) => {
      let text = doc.content;
      if (doc.content_iv && doc.content_tag) {
        text = decryptDocumentContent(doc.id, doc.content, doc.content_iv, doc.content_tag, doc.key_id);
      }
      const excerpt = text.substring(0, 6000);
      return SecurityValidator.wrapUntrustedDocumentContext(doc.filename, excerpt);
    });

    const topicInstruction = comparisonTopic
      ? `Focus specifically on: "${comparisonTopic}".`
      : 'Compare overall terms, obligations, scope, financial figures, and discrepancies.';

    const systemPrompt = `You are a Senior Document Comparison and Intelligence Specialist. Compare the attached documents side-by-side:
1. Executive Summary of Comparison
2. Direct Point-by-Point Differences (use a structured markdown comparison table if applicable)
3. Contradictions, Discrepancies, or Inconsistencies between documents
4. Shared/Identical Terms
5. Recommended Action Items`;

    const prompt = `${docTexts.join('\n\n')}\n\nTask: ${topicInstruction}`;
    const comparison = await OllamaClient.generate(prompt, systemPrompt);

    return {
      comparison,
      documents: docs.map((d: any) => ({ id: d.id, filename: d.filename })),
    };
  }
}
