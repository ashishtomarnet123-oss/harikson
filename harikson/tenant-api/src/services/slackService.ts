import logger from '../utils/logger.js';
import { pool } from '../db/pool.js';

export interface SlackAuthProfile {
  id: string;
  botUserId: string;
  botName: string;
  teamId: string;
  teamName: string;
  url: string;
}

export interface SlackChannelItem {
  id: string;
  name: string;
  isPrivate: boolean;
  memberCount: number;
  topic: string;
}

/** Validates Slack Bot User OAuth Token (`xoxb-...`) or user token */
export async function verifySlackToken(token: string): Promise<SlackAuthProfile> {
  const res = await fetch('https://slack.com/api/auth.test', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });

  const data: any = await res.json().catch(() => ({ ok: false }));
  if (!data.ok) {
    throw new Error(`Slack authentication failed: ${data.error || 'invalid_auth'}`);
  }

  return {
    id: data.user_id,
    botUserId: data.user_id,
    botName: data.user || 'Xarwiz Bot',
    teamId: data.team_id,
    teamName: data.team || 'Slack Workspace',
    url: data.url || '',
  };
}

/** Lists public and accessible private channels in the workspace */
export async function listSlackChannels(token: string): Promise<SlackChannelItem[]> {
  const res = await fetch(
    'https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=100',
    {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
      },
    }
  );

  const data: any = await res.json().catch(() => ({ ok: false }));
  if (!data.ok) {
    throw new Error(`Failed to list Slack channels: ${data.error || 'unknown_error'}`);
  }

  const channels: any[] = data.channels || [];
  return channels.map((c) => ({
    id: c.id,
    name: c.name,
    isPrivate: Boolean(c.is_private),
    memberCount: c.num_members || 0,
    topic: c.topic?.value || '',
  }));
}

/** Ingests recent discussion context from selected Slack channel */
export async function syncSlackChannel(
  tenantId: string,
  userId: string,
  channelId: string,
  token: string
): Promise<{ messagesProcessed: number }> {
  logger.info(`Syncing Slack channel ${channelId} for tenant=${tenantId}`);

  const res = await fetch(
    `https://slack.com/api/conversations.history?channel=${encodeURIComponent(channelId)}&limit=50`,
    {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
      },
    }
  );

  const data: any = await res.json().catch(() => ({ ok: false }));
  if (!data.ok) {
    throw new Error(`Failed to read channel history: ${data.error || 'unknown_error'}`);
  }

  const messages: any[] = data.messages || [];
  const validMessages = messages.filter((m) => m.text && !m.subtype);

  if (validMessages.length > 0) {
    await pool.query(
      `INSERT INTO file_index_state (tenant_id, file_path, mtime, sha256, updated_at)
       VALUES ($1, $2, NOW(), 'slack-synced', NOW())
       ON CONFLICT (tenant_id, file_path) DO UPDATE SET mtime = NOW(), updated_at = NOW()`,
      [tenantId, `slack://channel/${channelId}`]
    ).catch(() => {});
  }

  return { messagesProcessed: validMessages.length };
}
