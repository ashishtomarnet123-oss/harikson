import { Router } from 'express';
import multer from 'multer';
import { executeTenantQuery } from '../db/pool.js';
import { DocumentIntelligenceEngine } from '../services/document-intelligence/index.js';
import { SpreadsheetProcessor } from '../services/document-intelligence/processors/spreadsheetProcessor.js';
import { DocumentRetriever } from '../services/document-intelligence/retrieval/retriever.js';
import { CitationEngine } from '../services/document-intelligence/retrieval/citations.js';
import { SecurityValidator } from '../services/document-intelligence/security/securityValidator.js';
import { decryptDocumentContent } from '../services/documentEncryptionService.js';
import { OllamaClient } from '../llm/ollama.js';
import logger from '../utils/logger.js';
import { requireScopes } from '../middleware/scopeAuth.js';

const router = Router();
const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size limit
});

// =========================================================================
// 1. DOCUMENT UPLOAD & PROCESSING
// =========================================================================

// POST /api/documents/upload
router.post('/upload', requireScopes('documents:write'), upload.single('file'), async (req: any, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { originalname, buffer, mimetype } = req.file;
  const userId = req.user?.userId || null;
  const collectionId = req.body?.collectionId || undefined;

  try {
    const result = await DocumentIntelligenceEngine.processAndIndexFile(
      req.tenant.id,
      userId,
      originalname,
      buffer,
      mimetype,
      collectionId
    );

    res.status(201).json({
      success: true,
      message: `Document ${result.filename} processed and indexed successfully.`,
      document: result,
    });
  } catch (err: any) {
    logger.error('Document upload/processing error:', err);
    res.status(500).json({ error: err.message || 'Failed to process and index document' });
  }
});

// =========================================================================
// 2. DOCUMENT COLLECTIONS (Fixed paths MUST come before /:id)
// =========================================================================

// GET /api/documents/collections and /api/documents/collections/list
const getCollectionsHandler = async (req: any, res: any) => {
  try {
    const result = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `SELECT dc.id, dc.name, dc.description, dc.color, dc.icon, dc.created_at,
                COUNT(kd.id)::int as document_count
         FROM document_collections dc
         LEFT JOIN knowledge_documents kd ON kd.collection_id = dc.id AND kd.is_active = true
         WHERE dc.tenant_id = $1
         GROUP BY dc.id
         ORDER BY dc.name ASC`,
        [req.tenant.id]
      )
    );

    res.json({ collections: result.rows });
  } catch (err: any) {
    logger.error('Fetch collections error:', err);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
};

router.get('/collections', requireScopes('documents:read'), getCollectionsHandler);
router.get('/collections/list', requireScopes('documents:read'), getCollectionsHandler);

// POST /api/documents/collections
router.post('/collections', requireScopes('documents:write'), async (req: any, res) => {
  const { name, description, color, icon } = req.body || {};
  const userId = req.user?.userId;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Collection name is required' });
  }

  try {
    const result = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `INSERT INTO document_collections (tenant_id, user_id, name, description, color, icon)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, description, color, icon, created_at`,
        [req.tenant.id, userId, name.trim(), description || '', color || '#2563EB', icon || 'folder']
      )
    );

    res.status(201).json({ success: true, collection: result.rows[0] });
  } catch (err: any) {
    logger.error('Create collection error:', err);
    res.status(500).json({ error: 'Failed to create collection' });
  }
});

// PUT /api/documents/collections/:id
router.put('/collections/:id', requireScopes('documents:write'), async (req: any, res) => {
  const { id } = req.params;
  const { name, description, color, icon } = req.body || {};

  try {
    const result = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `UPDATE document_collections
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             color = COALESCE($3, color),
             icon = COALESCE($4, icon),
             updated_at = NOW()
         WHERE id = $5 AND tenant_id = $6
         RETURNING id, name, description, color, icon, updated_at`,
        [name, description, color, icon, id, req.tenant.id]
      )
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Collection not found' });
    res.json({ success: true, collection: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update collection' });
  }
});

// DELETE /api/documents/collections/:id
router.delete('/collections/:id', requireScopes('documents:write'), async (req: any, res) => {
  const { id } = req.params;

  try {
    await executeTenantQuery(req.tenant.id, async (client) => {
      // Unlink documents from collection
      await client.query(
        `UPDATE knowledge_documents SET collection_id = NULL WHERE collection_id = $1 AND tenant_id = $2`,
        [id, req.tenant.id]
      );
      await client.query(
        `DELETE FROM document_collections WHERE id = $1 AND tenant_id = $2`,
        [id, req.tenant.id]
      );
    });

    res.json({ success: true, message: 'Collection deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete collection' });
  }
});

// POST /api/documents/collections/:id/add-document
router.post('/collections/:id/add-document', requireScopes('documents:write'), async (req: any, res) => {
  const { id } = req.params;
  const { documentId } = req.body || {};

  if (!documentId) return res.status(400).json({ error: 'documentId required' });

  try {
    await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `UPDATE knowledge_documents
         SET collection_id = $1, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3`,
        [id, documentId, req.tenant.id]
      )
    );

    res.json({ success: true, message: 'Document added to collection' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add document to collection' });
  }
});

// POST /api/documents/collections/:id/chat
router.post('/collections/:id/chat', requireScopes('documents:read'), async (req: any, res) => {
  const { id } = req.params;
  const { question } = req.body || {};

  if (!question || !question.trim()) return res.status(400).json({ error: 'question required' });

  try {
    const retrieval = await DocumentRetriever.retrieveContext(req.tenant.id, question.trim(), {
      collectionId: id,
      maxResults: 8,
    });

    if (!retrieval.contextText) {
      return res.json({
        answer: 'No relevant information found across documents in this collection.',
        citations: [],
      });
    }

    const wrapped = SecurityValidator.wrapUntrustedDocumentContext('Collection Documents', retrieval.contextText);
    const systemPrompt = `You are Xarwiz Document Intelligence. Answer using verified excerpts across the collection. Cite source documents and page numbers explicitly.`;
    const prompt = `${wrapped}\n\nQuestion: ${question}`;

    const rawAnswer = await OllamaClient.generate(prompt, systemPrompt);
    const finalAnswer = CitationEngine.appendMarkdownCitations(rawAnswer, retrieval.citations);

    res.json({
      answer: finalAnswer,
      citations: retrieval.citations,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Collection query failed' });
  }
});

// =========================================================================
// 3. CROSS-DOCUMENT OPERATIONS (Fixed paths MUST come before /:id)
// =========================================================================

// POST /api/documents/compare
router.post('/compare', requireScopes('documents:read'), async (req: any, res) => {
  const { documentIds, topic } = req.body || {};

  if (!Array.isArray(documentIds) || documentIds.length < 2) {
    return res.status(400).json({ error: 'documentIds array with at least 2 document IDs is required' });
  }

  try {
    const result = await DocumentIntelligenceEngine.compareDocuments(req.tenant.id, documentIds, topic);
    res.json(result);
  } catch (err: any) {
    logger.error('Document comparison error:', err);
    res.status(500).json({ error: err.message || 'Failed to compare documents' });
  }
});

// POST /api/documents/query-data
router.post('/query-data', requireScopes('documents:read'), async (req: any, res) => {
  const { documentId, operation, columnName, limit } = req.body || {};

  if (!documentId || !operation) {
    return res.status(400).json({ error: 'documentId and operation (sum, avg, min, max, count, find_duplicates) required' });
  }

  try {
    const docRes = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `SELECT structure FROM knowledge_documents WHERE id = $1 AND tenant_id = $2`,
        [documentId, req.tenant.id]
      )
    );

    if (docRes.rows.length === 0) return res.status(404).json({ error: 'Document not found' });

    const structure = docRes.rows[0].structure;
    const table = structure?.tables?.[0];
    if (!table || !table.headers) {
      return res.status(400).json({ error: 'No structured tabular data found in this document' });
    }

    const computation = SpreadsheetProcessor.executeComputation(
      table.headers,
      table.rows,
      operation,
      columnName,
      limit || 10
    );

    res.json(computation);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Data computation failed' });
  }
});

// =========================================================================
// 4. DOCUMENT ROOT LISTING
// =========================================================================

// GET /api/documents
router.get('/', requireScopes('documents:read'), async (req: any, res) => {
  const collectionFilter = req.query.collectionId ? ' AND kd.collection_id = $2' : '';
  const params: any[] = [req.tenant.id];
  if (req.query.collectionId) params.push(req.query.collectionId);

  try {
    const docsRes = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `SELECT kd.id, kd.filename, kd.file_type, kd.file_size_bytes, kd.status,
                kd.processing_step, kd.error_message, kd.is_active, kd.page_count,
                kd.word_count, kd.document_type, kd.metadata, kd.collection_id,
                dc.name as collection_name, kd.created_at, kd.updated_at
         FROM knowledge_documents kd
         LEFT JOIN document_collections dc ON kd.collection_id = dc.id
         WHERE kd.tenant_id = $1 AND kd.is_active = true ${collectionFilter}
         ORDER BY kd.created_at DESC`,
        params
      )
    );

    res.json({ documents: docsRes.rows });
  } catch (err: any) {
    logger.error('Fetch documents error:', err);
    res.status(500).json({ error: 'Failed to fetch knowledge documents' });
  }
});

// =========================================================================
// 5. PARAMETERIZED DOCUMENT ROUTES (/:id...)
// =========================================================================

// GET /api/documents/:id/status
router.get('/:id/status', requireScopes('documents:read'), async (req: any, res) => {
  const { id } = req.params;

  try {
    const docRes = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `SELECT id, status, processing_step, error_message, updated_at
         FROM knowledge_documents
         WHERE id = $1 AND tenant_id = $2`,
        [id, req.tenant.id]
      )
    );

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(docRes.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// GET /api/documents/:id/download
router.get('/:id/download', requireScopes('documents:read'), async (req: any, res) => {
  const { id } = req.params;

  try {
    const docRes = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `SELECT id, filename, file_type, content, content_iv, content_tag, key_id
         FROM knowledge_documents
         WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
        [id, req.tenant.id]
      )
    );

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = docRes.rows[0];
    let plainText = doc.content;

    if (doc.content_iv && doc.content_tag) {
      plainText = decryptDocumentContent(doc.id, doc.content, doc.content_iv, doc.content_tag, doc.key_id);
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);
    res.send(plainText);
  } catch (err: any) {
    logger.error('Download document error:', err);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

// POST /api/documents/:id/ask
router.post('/:id/ask', requireScopes('documents:read'), async (req: any, res) => {
  const { id } = req.params;
  const { question } = req.body || {};

  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Question is required' });
  }

  try {
    const result = await DocumentIntelligenceEngine.queryDocument(req.tenant.id, id, question.trim());
    res.json(result);
  } catch (err: any) {
    logger.error('Document Q&A error:', err);
    res.status(500).json({ error: err.message || 'Failed to answer question over document' });
  }
});

// POST /api/documents/:id/analyze
router.post('/:id/analyze', requireScopes('documents:read'), async (req: any, res) => {
  const { id } = req.params;
  const { mode = 'executive' } = req.body || {};

  try {
    const result = await DocumentIntelligenceEngine.analyzeDocumentMode(req.tenant.id, id, mode);
    res.json(result);
  } catch (err: any) {
    logger.error('Document analysis error:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze document' });
  }
});

// GET /api/documents/:id
router.get('/:id', requireScopes('documents:read'), async (req: any, res) => {
  const { id } = req.params;

  try {
    const docRes = await executeTenantQuery(req.tenant.id, (client) =>
      client.query(
        `SELECT kd.id, kd.filename, kd.file_type, kd.file_size_bytes, kd.status,
                kd.processing_step, kd.error_message, kd.is_active, kd.page_count,
                kd.word_count, kd.document_type, kd.metadata, kd.structure,
                kd.collection_id, dc.name as collection_name, kd.created_at, kd.updated_at
         FROM knowledge_documents kd
         LEFT JOIN document_collections dc ON kd.collection_id = dc.id
         WHERE kd.id = $1 AND kd.tenant_id = $2 AND kd.is_active = true`,
        [id, req.tenant.id]
      )
    );

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ document: docRes.rows[0] });
  } catch (err: any) {
    logger.error('Fetch document detail error:', err);
    res.status(500).json({ error: 'Failed to fetch document details' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', requireScopes('documents:write'), async (req: any, res) => {
  const { id } = req.params;

  try {
    await executeTenantQuery(req.tenant.id, async (client) => {
      await client.query(
        'UPDATE knowledge_documents SET is_active = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2',
        [id, req.tenant.id]
      );
      await client.query(
        'DELETE FROM document_embeddings WHERE knowledge_document_id = $1 AND tenant_id = $2',
        [id, req.tenant.id]
      );
    });

    res.json({ success: true, message: 'Document and its embeddings deleted successfully' });
  } catch (err: any) {
    logger.error('Delete document error:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
