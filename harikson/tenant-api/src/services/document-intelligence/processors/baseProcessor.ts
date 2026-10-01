import { ProcessedDocumentResult, DocumentMetadata } from '../types.js';

export interface DocumentProcessor {
  supports(extension: string, mimeType?: string): boolean;
  process(
    buffer: Buffer,
    filename: string,
    mimeType?: string,
    options?: { userId?: string; tenantId?: string }
  ): Promise<{
    fullText: string;
    structure: any;
    metadata: Partial<DocumentMetadata>;
  }>;
}
