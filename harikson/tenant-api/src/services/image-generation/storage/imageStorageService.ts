import fs from 'fs';
import path from 'path';
import axios from 'axios';
import logger from '../../../utils/logger.js';

export interface SavedImageMeta {
  storagePath: string;
  publicUrl: string;
  thumbnailUrl: string;
  fileSizeBytes: number;
  mimeType: string;
}

export class ImageStorageService {
  private static getUploadBaseDir(): string {
    const customDir = process.env.UPLOADS_DIR;
    if (customDir) return path.resolve(customDir);
    return path.join(process.cwd(), 'uploads');
  }

  public static async persistImage(
    imageId: string,
    tenantId: string,
    payload: { buffer?: Buffer; remoteUrl?: string; mimeType?: string }
  ): Promise<SavedImageMeta> {
    let rawBuffer: Buffer;
    let mimeType = payload.mimeType || 'image/jpeg';

    if (payload.buffer) {
      rawBuffer = payload.buffer;
    } else if (payload.remoteUrl) {
      logger.info({ remoteUrl: payload.remoteUrl }, 'Downloading remote image for permanent storage');
      const response = await axios.get(payload.remoteUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      rawBuffer = Buffer.from(response.data);
      if (response.headers['content-type']) {
        mimeType = String(response.headers['content-type']);
      }
    } else {
      throw new Error('Neither buffer nor remoteUrl provided for image storage');
    }

    // Determine extension
    let ext = '.jpg';
    if (mimeType.includes('png')) ext = '.png';
    else if (mimeType.includes('webp')) ext = '.webp';
    else if (mimeType.includes('gif')) ext = '.gif';
    else if (mimeType.includes('svg')) ext = '.svg';

    const dateFolder = new Date().toISOString().slice(0, 7); // YYYY-MM
    const tenantDir = path.join(this.getUploadBaseDir(), 'images', tenantId, dateFolder);

    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    const filename = `${imageId}${ext}`;
    const fullPath = path.join(tenantDir, filename);

    fs.writeFileSync(fullPath, rawBuffer);
    const fileSizeBytes = rawBuffer.length;

    const publicUrl = `/api/v1/images/${imageId}/view`;
    const thumbnailUrl = `/api/v1/images/${imageId}/view?thumb=1`;

    logger.info(
      { imageId, tenantId, fileSizeBytes, fullPath, publicUrl },
      'Successfully stored permanent image asset'
    );

    return {
      storagePath: fullPath,
      publicUrl,
      thumbnailUrl,
      fileSizeBytes,
      mimeType,
    };
  }

  public static getImageBuffer(storagePath: string): { buffer: Buffer; exists: boolean } {
    if (!fs.existsSync(storagePath)) {
      return { buffer: Buffer.alloc(0), exists: false };
    }
    return {
      buffer: fs.readFileSync(storagePath),
      exists: true,
    };
  }

  public static deleteImageFile(storagePath: string): boolean {
    try {
      if (fs.existsSync(storagePath)) {
        fs.unlinkSync(storagePath);
        return true;
      }
    } catch (err) {
      logger.warn({ storagePath, err }, 'Failed to delete image file from storage');
    }
    return false;
  }
}
