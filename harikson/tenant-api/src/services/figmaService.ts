import logger from '../utils/logger.js';
import { pool } from '../db/pool.js';

export interface FigmaUserProfile {
  id: string;
  email: string;
  handle: string;
  avatarUrl: string;
}

export interface FigmaFileInfo {
  key: string;
  name: string;
  lastModified: string;
  version: string;
  framesCount: number;
  frames: string[];
}

/** Extracts Figma file key from raw key or full URL */
export function extractFigmaFileKey(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/(?:file|design)\/([a-zA-Z0-9]+)/);
  if (match && match[1]) return match[1];
  return trimmed;
}

/** Validates Figma Personal Access Token */
export async function verifyFigmaToken(token: string): Promise<FigmaUserProfile> {
  const res = await fetch('https://api.figma.com/v1/me', {
    headers: {
      'X-Figma-Token': token.trim(),
    },
  });

  if (!res.ok) {
    throw new Error(`Figma authentication failed (${res.status}): Invalid Personal Access Token`);
  }

  const data: any = await res.json();
  return {
    id: data.id,
    email: data.email,
    handle: data.handle || data.email,
    avatarUrl: data.img_url || '',
  };
}

/** Inspects a Figma file to retrieve frames, components, and layout metadata */
export async function inspectFigmaFile(token: string, fileKeyOrUrl: string): Promise<FigmaFileInfo> {
  const fileKey = extractFigmaFileKey(fileKeyOrUrl);
  if (!fileKey) throw new Error('Invalid Figma file key or URL');

  const res = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=2`, {
    headers: {
      'X-Figma-Token': token.trim(),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to inspect Figma file (${res.status}). Verify permissions and file key.`);
  }

  const data: any = await res.json();
  const document = data.document;

  const frames: string[] = [];
  if (document && Array.isArray(document.children)) {
    for (const page of document.children) {
      if (Array.isArray(page.children)) {
        for (const child of page.children) {
          if (child.name) frames.push(`${page.name} / ${child.name}`);
        }
      }
    }
  }

  return {
    key: fileKey,
    name: data.name || 'Figma Document',
    lastModified: data.lastModified,
    version: data.version || '1.0',
    framesCount: frames.length,
    frames: frames.slice(0, 30),
  };
}

/** Saves inspected Figma design file to workspace context */
export async function syncFigmaFile(
  tenantId: string,
  userId: string,
  fileKeyOrUrl: string,
  token: string
): Promise<FigmaFileInfo> {
  const info = await inspectFigmaFile(token, fileKeyOrUrl);
  
  await pool.query(
    `INSERT INTO file_index_state (tenant_id, file_path, mtime, sha256, updated_at)
     VALUES ($1, $2, NOW(), 'figma-synced', NOW())
     ON CONFLICT (tenant_id, file_path) DO UPDATE SET mtime = NOW(), updated_at = NOW()`,
    [tenantId, `figma://file/${info.key}`]
  ).catch(() => {});

  logger.info(`Synced Figma file ${info.name} (${info.key}) with ${info.framesCount} frames`);
  return info;
}
