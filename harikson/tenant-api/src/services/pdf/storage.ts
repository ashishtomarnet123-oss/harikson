import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GeneratedPdfArtifact } from './types.js';
import logger from '../../utils/logger.js';

export class PdfStorageService {
  private static getUploadBaseDir(): string {
    const customDir = process.env.UPLOADS_DIR;
    if (customDir) return path.resolve(customDir);
    return path.join(process.cwd(), 'uploads');
  }

  /**
   * Persist a generated PDF buffer to tenant-isolated disk storage
   */
  public static async persistPdf(
    tenantId: string,
    buffer: Buffer,
    rawFilename: string,
    pageCount: number
  ): Promise<GeneratedPdfArtifact> {
    const fileId = crypto.randomUUID();
    const dateFolder = new Date().toISOString().slice(0, 7); // YYYY-MM
    const tenantDir = path.join(this.getUploadBaseDir(), 'pdf', tenantId, dateFolder);

    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    // Sanitize filename
    const safeName = rawFilename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/\.pdf$/i, '');
    const filename = `${safeName || 'report'}_${fileId.slice(0, 8)}.pdf`;
    const storagePath = path.join(tenantDir, filename);

    fs.writeFileSync(storagePath, buffer);
    const sizeBytes = buffer.length;

    const downloadUrl = `/api/pdf/download/${fileId}`;

    logger.info(
      { fileId, tenantId, filename, sizeBytes, pageCount, storagePath },
      'Successfully stored generated PDF artifact'
    );

    return {
      fileId,
      filename,
      storagePath,
      downloadUrl,
      pageCount,
      sizeBytes,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieve PDF file from storage with strict tenant isolation
   */
  public static getPdfFile(
    tenantId: string,
    fileId: string
  ): { buffer: Buffer; filename: string; exists: boolean } {
    const tenantBase = path.join(this.getUploadBaseDir(), 'pdf', tenantId);
    if (!fs.existsSync(tenantBase)) {
      return { buffer: Buffer.alloc(0), filename: '', exists: false };
    }

    // Search within tenant's date folders
    const dateFolders = fs.readdirSync(tenantBase);
    for (const folder of dateFolders) {
      const folderPath = path.join(tenantBase, folder);
      if (!fs.statSync(folderPath).isDirectory()) continue;

      const files = fs.readdirSync(folderPath);
      for (const file of files) {
        if (file.includes(fileId.slice(0, 8))) {
          const fullPath = path.join(folderPath, file);
          return {
            buffer: fs.readFileSync(fullPath),
            filename: file,
            exists: true,
          };
        }
      }
    }

    return { buffer: Buffer.alloc(0), filename: '', exists: false };
  }
}
