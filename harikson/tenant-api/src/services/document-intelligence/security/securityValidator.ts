import crypto from 'crypto';

export class SecurityValidator {
  public static readonly ALLOWED_EXTENSIONS = new Set([
    // Documents
    'pdf', 'docx', 'txt', 'md', 'rtf',
    // Data & Spreadsheets
    'csv', 'xlsx', 'xls', 'json', 'xml', 'tsv',
    // Presentations
    'pptx',
    // Images
    'png', 'jpg', 'jpeg', 'webp',
    // Code
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'go', 'php', 'rb', 'rs',
    'cpp', 'c', 'h', 'css', 'html', 'sql', 'yaml', 'yml',
    // Logs
    'log'
  ]);

  public static readonly MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
  public static readonly MAX_UNCOMPRESSED_RATIO = 50; // Max compression ratio for zip-based files

  /**
   * Sanitize filename to prevent directory traversal and null byte attacks
   */
  public static sanitizeFilename(filename: string): string {
    if (!filename) return 'unnamed_file';
    return filename
      .replace(/[\0\r\n]/g, '')
      .replace(/(\.\.[\/\\])+/g, '')
      .replace(/[^a-zA-Z0-9_\-\.\s]/g, '_')
      .trim();
  }

  /**
   * Validate uploaded file properties
   */
  public static validateFile(filename: string, buffer: Buffer, mimeType?: string): {
    isValid: boolean;
    sanitizedFilename: string;
    extension: string;
    contentHash: string;
    error?: string;
  } {
    const sanitizedFilename = this.sanitizeFilename(filename);
    const parts = sanitizedFilename.split('.');
    if (parts.length < 2) {
      return {
        isValid: false,
        sanitizedFilename,
        extension: '',
        contentHash: '',
        error: 'File has no extension'
      };
    }

    const extension = parts.pop()!.toLowerCase();

    if (!this.ALLOWED_EXTENSIONS.has(extension)) {
      return {
        isValid: false,
        sanitizedFilename,
        extension,
        contentHash: '',
        error: `File format .${extension} is not supported. Supported: documents, spreadsheets, slides, code, images, and text.`
      };
    }

    if (buffer.length === 0) {
      return {
        isValid: false,
        sanitizedFilename,
        extension,
        contentHash: '',
        error: 'Uploaded file is empty'
      };
    }

    if (buffer.length > this.MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        sanitizedFilename,
        extension,
        contentHash: '',
        error: `File size (${(buffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds limit of 50MB`
      };
    }

    // Zip bomb detection for ZIP-based formats (.docx, .xlsx, .pptx)
    if (['docx', 'xlsx', 'pptx'].includes(extension)) {
      const isZip = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4B;
      if (!isZip) {
        return {
          isValid: false,
          sanitizedFilename,
          extension,
          contentHash: '',
          error: `Corrupted file: .${extension} must be a valid Office Open XML package.`
        };
      }
    }

    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');

    return {
      isValid: true,
      sanitizedFilename,
      extension,
      contentHash
    };
  }

  /**
   * Prompt Injection Defense:
   * Wraps document content in an untrusted boundary tag and neutralizes attempts
   * to override system instructions.
   */
  public static wrapUntrustedDocumentContext(
    documentName: string,
    content: string,
    pageOrLocation?: string | number
  ): string {
    const locationStr = pageOrLocation ? ` location="${pageOrLocation}"` : '';
    // Clean null bytes and sanitize XML brackets
    const sanitized = content
      .replace(/[\0]/g, '')
      .replace(/<\/?(?:system|instruction|admin|override)>/gi, '');

    return `<untrusted_document_context source="${documentName}"${locationStr}>\n${sanitized}\n</untrusted_document_context>`;
  }
}
