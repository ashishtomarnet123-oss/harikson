import { Router } from 'express';
import { UniversalPdfEngine } from '../services/pdf/index.js';
import { PdfStorageService } from '../services/pdf/storage.js';
import logger from '../utils/logger.js';
import { requireScopes } from '../middleware/scopeAuth.js';

const router = Router();

// =========================================================================
// 1. GENERATE PDF (Returns artifact reference with download URL)
// =========================================================================
router.post('/generate', async (req: any, res) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant context required' });
    }

    const { markdown, document, messages, title, filename, options = {} } = req.body || {};
    const input = document || messages ? { messages, title } : (markdown || '');

    if (!input && !markdown) {
      return res.status(400).json({ error: 'Document content, markdown, or messages are required' });
    }

    const mergedOptions = {
      ...options,
      defaultTitle: title || options.defaultTitle,
      filename: filename || options.filename,
    };

    const { artifact } = await UniversalPdfEngine.generateDocumentPdf(tenantId, input, mergedOptions);

    res.status(201).json({
      success: true,
      artifact,
    });
  } catch (err: any) {
    logger.error({ err: err?.message }, 'PDF Generation failed');
    res.status(500).json({ error: err.message || 'Failed to generate PDF document' });
  }
});

// =========================================================================
// 2. EXPORT PDF DIRECT (Streams file buffer directly to browser)
// =========================================================================
router.post('/export', async (req: any, res) => {
  try {
    const { markdown, document, messages, title, filename, options = {} } = req.body || {};
    const input = document || (messages ? { messages, title } : (markdown || ''));

    if (!input && !markdown) {
      return res.status(400).json({ error: 'Document content is required' });
    }

    const mergedOptions = {
      ...options,
      defaultTitle: title || options.defaultTitle || 'Xarwiz Report',
    };

    const { buffer } = await UniversalPdfEngine.renderDirect(input, mergedOptions);

    const outName = (filename || title || 'xarwiz_document')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.pdf$/i, '');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${outName}.pdf"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  } catch (err: any) {
    logger.error({ err: err?.message }, 'Direct PDF export failed');
    res.status(500).json({ error: err.message || 'Failed to stream PDF export' });
  }
});

// =========================================================================
// 3. SECURE DOWNLOAD (Tenant-scoped file retrieval)
// =========================================================================
router.get('/download/:fileId', async (req: any, res) => {
  try {
    const tenantId = req.tenant?.id;
    const { fileId } = req.params;

    if (!tenantId || !fileId) {
      return res.status(400).json({ error: 'Missing tenant or file identification' });
    }

    const file = PdfStorageService.getPdfFile(tenantId, fileId);
    if (!file.exists) {
      return res.status(404).json({ error: 'PDF document not found or access denied' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Content-Length', file.buffer.length.toString());
    res.send(file.buffer);
  } catch (err: any) {
    logger.error({ err: err?.message }, 'Download PDF failed');
    res.status(500).json({ error: 'Failed to download PDF' });
  }
});

export default router;
