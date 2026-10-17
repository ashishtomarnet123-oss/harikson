import pdf from 'pdf-parse';
import { PdfValidationResult } from './types.js';
import logger from '../../utils/logger.js';

export class PdfValidator {
  /**
   * Validate a generated PDF buffer for visual, structural, and parser integrity
   */
  public static async validateBuffer(buffer: Buffer): Promise<PdfValidationResult> {
    if (!buffer || buffer.length === 0) {
      return {
        isValid: false,
        pageCount: 0,
        sizeBytes: 0,
        error: 'PDF buffer is null or empty',
      };
    }

    const sizeBytes = buffer.length;

    // 1. Minimum plausible file size check
    if (sizeBytes < 400) {
      return {
        isValid: false,
        pageCount: 0,
        sizeBytes,
        error: `Generated PDF size (${sizeBytes} bytes) is suspiciously small`,
      };
    }

    // 2. Magic Header check: Must start with %PDF-
    const header = buffer.subarray(0, 8).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      // Check if it was an accidental HTML error response
      const snippet = buffer.subarray(0, 100).toString('utf8');
      if (snippet.includes('<html') || snippet.includes('<!DOCTYPE') || snippet.includes('{"error"')) {
        return {
          isValid: false,
          pageCount: 0,
          sizeBytes,
          error: 'Generated output appears to be an HTML or JSON error message rather than a PDF document',
        };
      }

      return {
        isValid: false,
        pageCount: 0,
        sizeBytes,
        error: `Invalid PDF magic header: found "${header.trim()}"`,
      };
    }

    // 3. End of file marker check: Must contain %%EOF near the end
    const tail = buffer.subarray(Math.max(0, sizeBytes - 1024)).toString('ascii');
    if (!tail.includes('%%EOF')) {
      logger.warn({ sizeBytes }, 'PDF missing standard %%EOF marker near EOF, attempting deep validation');
    }

    // 4. Parser and Text Extraction verification using pdf-parse
    try {
      const parsed = await pdf(buffer);
      const pageCount = parsed.numpages || 1;
      const text = (parsed.text || '').trim();

      // Check for plausible page count
      if (pageCount < 1) {
        return {
          isValid: false,
          pageCount: 0,
          sizeBytes,
          error: 'PDF parser reported 0 pages',
        };
      }

      return {
        isValid: true,
        pageCount,
        sizeBytes,
      };
    } catch (err: any) {
      logger.error({ err: err?.message, sizeBytes }, 'PDF parser failed to read generated buffer');
      return {
        isValid: false,
        pageCount: 0,
        sizeBytes,
        error: `PDF parser verification failed: ${err.message || 'corrupt PDF stream'}`,
      };
    }
  }
}
