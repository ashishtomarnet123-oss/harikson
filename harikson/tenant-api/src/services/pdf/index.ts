import { ContentNormalizer } from './normalizer.js';
import { PdfRenderer } from './renderer.js';
import { PdfValidator } from './validator.js';
import { PdfStorageService } from './storage.js';
import {
  DocumentModel,
  GeneratedPdfArtifact,
  PdfThemeTokens,
} from './types.js';
import { getTheme, PDF_THEMES } from './themes.js';
import logger from '../../utils/logger.js';

export * from './types.js';
export { getTheme, PDF_THEMES };
export { PdfOrchestrator } from './orchestrator.js';

export class UniversalPdfEngine {
  /**
   * Main generation pipeline:
   * Input -> Normalize -> Render -> Validate -> Store -> Return Artifact
   */
  public static async generateDocumentPdf(
    tenantId: string,
    input: string | Partial<DocumentModel> | { messages: any[]; title?: string },
    options: {
      filename?: string;
      defaultTitle?: string;
      theme?: any;
      pageSize?: any;
      orientation?: any;
      includeCoverPage?: boolean;
      includeTableOfContents?: boolean;
      includeHeaderFooter?: boolean;
      metadata?: any;
    } = {}
  ): Promise<{
    artifact: GeneratedPdfArtifact;
    buffer: Buffer;
  }> {
    const startTime = Date.now();

    // 1. Content normalization
    const docModel = ContentNormalizer.normalize(input, options);

    // 2. Render to PDF Buffer
    const buffer = await PdfRenderer.renderToBuffer(docModel);

    // 3. Post-generation validation
    const validation = await PdfValidator.validateBuffer(buffer);
    if (!validation.isValid) {
      logger.error({ error: validation.error, tenantId }, 'PDF generation produced invalid output');
      throw new Error(`PDF Generation failed validation: ${validation.error}`);
    }

    // 4. Persist in tenant-isolated storage
    const rawFilename = options.filename || docModel.title || 'xarwiz_report';
    const artifact = await PdfStorageService.persistPdf(
      tenantId,
      buffer,
      rawFilename,
      validation.pageCount
    );

    const durationMs = Date.now() - startTime;
    logger.info(
      {
        tenantId,
        title: docModel.title,
        pageCount: validation.pageCount,
        sizeBytes: buffer.length,
        durationMs,
      },
      'Universal PDF Engine completed document generation'
    );

    return { artifact, buffer };
  }

  /**
   * Render directly to Buffer without permanent disk storage (useful for direct streaming)
   */
  public static async renderDirect(
    input: string | Partial<DocumentModel> | { messages: any[]; title?: string },
    options: {
      defaultTitle?: string;
      theme?: any;
      pageSize?: any;
      orientation?: any;
      includeCoverPage?: boolean;
      includeTableOfContents?: boolean;
      includeHeaderFooter?: boolean;
      metadata?: any;
    } = {}
  ): Promise<{ buffer: Buffer; pageCount: number }> {
    const docModel = ContentNormalizer.normalize(input, options);
    const buffer = await PdfRenderer.renderToBuffer(docModel);

    const validation = await PdfValidator.validateBuffer(buffer);
    if (!validation.isValid) {
      throw new Error(`PDF validation error: ${validation.error}`);
    }

    return { buffer, pageCount: validation.pageCount };
  }
}
