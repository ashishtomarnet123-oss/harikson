import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { pool, executeTenantQuery, invalidateTenantCache } from '../db/pool.js';
import logger from '../utils/logger.js';
import { RagService } from './rag.service.js';
import { encryptDocumentContent, decryptDocumentContent } from './documentEncryptionService.js';
import {
  refreshGoogleAccessToken,
  listDriveFiles,
  getDriveFileMeta,
  extractDriveFileText,
  DriveFileMeta,
} from './googleDriveService.js';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: null,
});

export const googleDriveSyncQueue = new Queue('googleDriveSyncQueue', { connection: redisConnection });

interface SyncJobData {
  jobId: string;
  connectionId: string;
  tenantId: string;
  userId: string;
}

/** Creates a sync_jobs row and enqueues the background worker to actually do the work. */
export async function enqueueGoogleDriveSync(connectionId: string, tenantId: string, userId: string): Promise<string> {
  const jobRes = await pool.query(
    `INSERT INTO integration_sync_jobs (connection_id, tenant_id, provider_id, job_type, status, triggered_by)
     VALUES ($1, $2, 'google_drive', 'full_sync', 'queued', 'user')
     RETURNING id`,
    [connectionId, tenantId]
  );
  const jobId = jobRes.rows[0].id;

  await pool.query(`UPDATE integration_connections SET status = 'syncing', updated_at = NOW() WHERE id = $1`, [connectionId]);

  await googleDriveSyncQueue.add(
    'sync-google-drive',
    { jobId, connectionId, tenantId, userId },
    { jobId: `gdrive-sync-${jobId}`, removeOnComplete: { age: 86400 }, removeOnFail: { age: 7 * 86400 } }
  );

  return jobId;
}

async function getConnectionTokens(
  connectionId: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date } | null> {
  const res = await pool.query(
    `SELECT access_token_encrypted, access_token_iv, access_token_tag,
            refresh_token_encrypted, refresh_token_iv, refresh_token_tag,
            token_key_id, token_expires_at
     FROM integration_connections WHERE id = $1`,
    [connectionId]
  );
  const row = res.rows[0];
  if (!row || !row.access_token_encrypted) return null;

  const accessToken = decryptDocumentContent(
    `${connectionId}:access`,
    row.access_token_encrypted,
    row.access_token_iv,
    row.access_token_tag,
    row.token_key_id || 'v1'
  );
  const refreshToken = row.refresh_token_encrypted
    ? decryptDocumentContent(
        `${connectionId}:refresh`,
        row.refresh_token_encrypted,
        row.refresh_token_iv,
        row.refresh_token_tag,
        row.token_key_id || 'v1'
      )
    : '';

  return {
    accessToken,
    refreshToken,
    expiresAt: row.token_expires_at ? new Date(row.token_expires_at) : new Date(0),
  };
}

/** Encrypts and persists a fresh token pair for a connection. Exported so the OAuth callback route can reuse it. */
export async function saveConnectionTokens(
  connectionId: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date
): Promise<void> {
  const accessEnc = encryptDocumentContent(`${connectionId}:access`, accessToken);

  if (refreshToken) {
    const refreshEnc = encryptDocumentContent(`${connectionId}:refresh`, refreshToken);
    await pool.query(
      `UPDATE integration_connections
       SET access_token_encrypted=$1, access_token_iv=$2, access_token_tag=$3, token_key_id=$4, token_expires_at=$5,
           refresh_token_encrypted=$6, refresh_token_iv=$7, refresh_token_tag=$8
       WHERE id=$9`,
      [
        accessEnc.encryptedContent,
        accessEnc.iv,
        accessEnc.authTag,
        accessEnc.keyId,
        expiresAt,
        refreshEnc.encryptedContent,
        refreshEnc.iv,
        refreshEnc.authTag,
        connectionId,
      ]
    );
  } else {
    await pool.query(
      `UPDATE integration_connections
       SET access_token_encrypted=$1, access_token_iv=$2, access_token_tag=$3, token_key_id=$4, token_expires_at=$5
       WHERE id=$6`,
      [accessEnc.encryptedContent, accessEnc.iv, accessEnc.authTag, accessEnc.keyId, expiresAt, connectionId]
    );
  }
}

/**
 * Returns a valid (non-expired) access token for a connection, transparently
 * refreshing it via the stored refresh token if it's expired or about to
 * expire. Used by both the file-browsing routes and the sync worker so
 * neither ever hands Google's API a stale token.
 */
export async function getValidAccessToken(connectionId: string): Promise<string> {
  const tokens = await getConnectionTokens(connectionId);
  if (!tokens) throw new Error('Connection has no stored tokens — reconnect required');

  const isExpiringSoon = tokens.expiresAt.getTime() < Date.now() + 60_000;
  if (!isExpiringSoon) return tokens.accessToken;

  if (!tokens.refreshToken) {
    throw new Error('Access token expired and no refresh token is available — reconnect required');
  }

  const refreshed = await refreshGoogleAccessToken(tokens.refreshToken);
  await saveConnectionTokens(connectionId, refreshed.accessToken, refreshed.refreshToken, refreshed.expiresAt);
  return refreshed.accessToken;
}

/** Resolves the actual list of files to sync based on the connection's selected files/folders (or the whole Drive if neither is set). */
async function collectFilesToSync(accessToken: string, settings: any): Promise<DriveFileMeta[]> {
  const selectedFileIds: string[] = Array.isArray(settings?.selectedFileIds) ? settings.selectedFileIds : [];
  const selectedFolderIds: string[] = Array.isArray(settings?.selectedFolderIds) ? settings.selectedFolderIds : [];

  if (selectedFileIds.length > 0) {
    const metas = await Promise.all(selectedFileIds.map((id) => getDriveFileMeta(accessToken, id)));
    return metas.filter((m): m is DriveFileMeta => !!m && !m.isFolder);
  }

  // No specific folders selected either => walk from Drive root (entire accessible Drive).
  const foldersToWalk: (string | undefined)[] = selectedFolderIds.length > 0 ? selectedFolderIds : [undefined];
  const allFiles: DriveFileMeta[] = [];
  const visitedFolders = new Set<string>();

  async function walk(folderId?: string) {
    if (folderId) {
      if (visitedFolders.has(folderId)) return;
      visitedFolders.add(folderId);
    }

    let pageToken: string | undefined;
    do {
      const { files, nextPageToken } = await listDriveFiles(accessToken, folderId, pageToken);
      for (const f of files) {
        if (f.isFolder) {
          await walk(f.id);
        } else {
          allFiles.push(f);
        }
      }
      pageToken = nextPageToken;
    } while (pageToken);
  }

  for (const folderId of foldersToWalk) {
    await walk(folderId);
  }

  return allFiles;
}

async function deactivateKnowledgeDocument(tenantId: string, knowledgeDocumentId: string): Promise<void> {
  await executeTenantQuery(tenantId, async (client) => {
    await client.query(`DELETE FROM document_embeddings WHERE knowledge_document_id = $1`, [knowledgeDocumentId]);
    await client.query(`UPDATE knowledge_documents SET is_active = false WHERE id = $1`, [knowledgeDocumentId]);
  });
}

async function processGoogleDriveSyncJob(job: Job<SyncJobData>): Promise<void> {
  const { jobId, connectionId, tenantId, userId } = job.data;

  await pool.query(`UPDATE integration_sync_jobs SET status = 'running', started_at = NOW() WHERE id = $1`, [jobId]);

  try {
    const connRes = await pool.query(`SELECT settings FROM integration_connections WHERE id = $1`, [connectionId]);
    const settings = connRes.rows[0]?.settings || {};

    const accessToken = await getValidAccessToken(connectionId);
    const driveFiles = await collectFilesToSync(accessToken, settings);
    const driveFileIds = new Set(driveFiles.map((f) => f.id));

    const previousRes = await pool.query(
      `SELECT external_file_id, modified_time, knowledge_document_id FROM integration_synced_files
       WHERE connection_id = $1 AND is_deleted = false`,
      [connectionId]
    );
    const previousByFileId = new Map<string, any>(previousRes.rows.map((r: any) => [r.external_file_id, r]));

    let processed = 0;
    let failed = 0;
    await pool.query(`UPDATE integration_sync_jobs SET total_items = $1 WHERE id = $2`, [driveFiles.length, jobId]);

    for (const file of driveFiles) {
      try {
        const previous = previousByFileId.get(file.id);
        const unchanged =
          previous?.modified_time && new Date(previous.modified_time).getTime() === new Date(file.modifiedTime).getTime();

        if (unchanged) {
          processed++;
          await pool.query(`UPDATE integration_sync_jobs SET processed_items = $1, failed_items = $2 WHERE id = $3`, [
            processed,
            failed,
            jobId,
          ]);
          continue;
        }

        // Re-indexing an updated file: retire the old knowledge_document/embeddings first.
        if (previous?.knowledge_document_id) {
          await deactivateKnowledgeDocument(tenantId, previous.knowledge_document_id);
        }

        const text = await extractDriveFileText(accessToken, { id: file.id, mimeType: file.mimeType });
        const { documentId } = await RagService.indexText(tenantId, userId, file.name, text, file.mimeType, file.size);

        await pool.query(
          `INSERT INTO integration_synced_files
             (connection_id, tenant_id, knowledge_document_id, external_file_id, file_name, mime_type, file_size, web_view_link, owner_email, modified_time, last_synced_at, is_deleted)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), false)
           ON CONFLICT (connection_id, external_file_id) DO UPDATE SET
             knowledge_document_id = EXCLUDED.knowledge_document_id,
             file_name = EXCLUDED.file_name,
             mime_type = EXCLUDED.mime_type,
             file_size = EXCLUDED.file_size,
             web_view_link = EXCLUDED.web_view_link,
             owner_email = EXCLUDED.owner_email,
             modified_time = EXCLUDED.modified_time,
             last_synced_at = NOW(),
             is_deleted = false`,
          [connectionId, tenantId, documentId, file.id, file.name, file.mimeType, file.size, file.webViewLink, file.ownerEmail, file.modifiedTime]
        );

        processed++;
      } catch (fileErr: any) {
        failed++;
        logger.warn(`Google Drive sync: failed to index file ${file.id} (${file.name}): ${fileErr.message}`);
      }

      await pool.query(`UPDATE integration_sync_jobs SET processed_items = $1, failed_items = $2 WHERE id = $3`, [
        processed,
        failed,
        jobId,
      ]);
    }

    // Deleted-file detection: anything previously synced but absent from this listing.
    for (const [fileId, previous] of previousByFileId.entries()) {
      if (driveFileIds.has(fileId)) continue;
      const stillExists = await getDriveFileMeta(accessToken, fileId).catch(() => null);
      if (stillExists) continue;

      if (previous.knowledge_document_id) {
        await deactivateKnowledgeDocument(tenantId, previous.knowledge_document_id);
      }
      await pool.query(
        `UPDATE integration_synced_files SET is_deleted = true WHERE connection_id = $1 AND external_file_id = $2`,
        [connectionId, fileId]
      );
    }

    await pool.query(`UPDATE integration_sync_jobs SET status = 'completed', completed_at = NOW() WHERE id = $1`, [jobId]);
    await pool.query(
      `UPDATE integration_connections
       SET status = 'connected', last_sync_at = NOW(), files_indexed_count = $1, last_error = NULL, updated_at = NOW()
       WHERE id = $2`,
      [processed, connectionId]
    );
    await invalidateTenantCache(tenantId);
    logger.info(`✅ Google Drive sync completed for connection ${connectionId}: ${processed} processed, ${failed} failed`);
  } catch (err: any) {
    logger.error(`❌ Google Drive sync job ${jobId} failed:`, err);
    await pool.query(`UPDATE integration_sync_jobs SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`, [
      err.message,
      jobId,
    ]);
    await pool.query(
      `UPDATE integration_connections SET status = 'error', last_error = $1, error_count = error_count + 1, updated_at = NOW() WHERE id = $2`,
      [err.message, connectionId]
    );
    throw err;
  }
}

export const googleDriveSyncWorker = new Worker('googleDriveSyncQueue', processGoogleDriveSyncJob, {
  connection: redisConnection,
  concurrency: 2,
});

googleDriveSyncWorker.on('failed', (job, err) => {
  logger.error(`Google Drive sync worker job ${job?.id} failed:`, err.message);
});
