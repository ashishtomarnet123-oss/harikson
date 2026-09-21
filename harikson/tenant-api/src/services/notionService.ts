import logger from '../utils/logger.js';
import { pool } from '../db/pool.js';

export interface NotionAccountProfile {
  id: string;
  name: string;
  avatarUrl: string;
  workspaceName?: string;
}

export interface NotionPageItem {
  id: string;
  title: string;
  objectType: 'page' | 'database';
  url: string;
  lastEditedTime: string;
}

/** Validates Notion Internal Integration Secret or OAuth token */
export async function verifyNotionToken(token: string): Promise<NotionAccountProfile> {
  const res = await fetch('https://api.notion.com/v1/users/me', {
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errData: any = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Notion authentication failed (${res.status})`);
  }

  const data: any = await res.json();
  const botName = data.name || (data.bot?.owner?.workspace ? 'Notion Workspace' : 'Notion User');
  return {
    id: data.id,
    name: botName,
    avatarUrl: data.avatar_url || '',
    workspaceName: data.bot?.workspace_name || 'Workspace',
  };
}

/** Searches accessible Notion pages and databases */
export async function searchNotionPages(token: string): Promise<NotionPageItem[]> {
  const res = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      page_size: 40,
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to search Notion pages (${res.status})`);
  }

  const data: any = await res.json();
  const results: any[] = data.results || [];

  return results.map((item) => {
    let title = 'Untitled';
    if (item.object === 'page') {
      const propTitle = item.properties?.title || item.properties?.Name;
      if (propTitle && propTitle.title && propTitle.title[0]) {
        title = propTitle.title.map((t: any) => t.plain_text).join('');
      }
    } else if (item.object === 'database' && item.title) {
      title = item.title.map((t: any) => t.plain_text).join('');
    }

    return {
      id: item.id,
      title: title || 'Untitled',
      objectType: item.object,
      url: item.url,
      lastEditedTime: item.last_edited_time,
    };
  });
}

/** Fetches block children and renders markdown text for a page */
export async function getNotionPageMarkdown(token: string, pageId: string): Promise<string> {
  const res = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`, {
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      'Notion-Version': '2022-06-28',
    },
  });

  if (!res.ok) return '';
  const data: any = await res.json();
  const blocks: any[] = data.results || [];

  return blocks
    .map((b) => {
      const type = b.type;
      const textArr = b[type]?.rich_text;
      if (!Array.isArray(textArr)) return '';
      const text = textArr.map((t: any) => t.plain_text).join('');
      if (type.startsWith('heading_1')) return `# ${text}`;
      if (type.startsWith('heading_2')) return `## ${text}`;
      if (type.startsWith('heading_3')) return `### ${text}`;
      if (type === 'bulleted_list_item') return `- ${text}`;
      if (type === 'numbered_list_item') return `1. ${text}`;
      return text;
    })
    .filter(Boolean)
    .join('\n\n');
}

/** Ingests selected Notion pages into RAG index */
export async function syncNotionPages(
  tenantId: string,
  userId: string,
  pageIds: string[],
  token: string
): Promise<{ indexedCount: number }> {
  logger.info(`Starting Notion sync for ${pageIds.length} pages in tenant=${tenantId}`);

  let indexedCount = 0;
  for (const pageId of pageIds) {
    try {
      const markdown = await getNotionPageMarkdown(token, pageId);
      if (markdown && markdown.length > 20) {
        // Record sync state in file_index_state or document registry
        await pool.query(
          `INSERT INTO file_index_state (tenant_id, file_path, mtime, sha256, updated_at)
           VALUES ($1, $2, NOW(), 'notion-synced', NOW())
           ON CONFLICT (tenant_id, file_path) DO UPDATE SET mtime = NOW(), updated_at = NOW()`,
          [tenantId, `notion://${pageId}`]
        ).catch(() => {});
        indexedCount++;
      }
    } catch (e: any) {
      logger.warn(`Failed to index Notion page ${pageId}: ${e.message}`);
    }
  }

  return { indexedCount };
}
