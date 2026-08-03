import { google } from 'googleapis';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

function getOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth is not configured: set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI');
  }
  return { clientId, clientSecret, redirectUri };
}

const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

function getScopes(): string[] {
  const raw = process.env.GOOGLE_DRIVE_SCOPES;
  if (raw && raw.trim()) return raw.split(',').map((s) => s.trim()).filter(Boolean);
  return DEFAULT_SCOPES;
}

function createOAuthClient() {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/** Is Google OAuth configured at all? Lets routes fail with a clear 500 instead of a stack trace. */
export function isGoogleOAuthConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI);
}

export function getGoogleAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: getScopes(),
    state,
    // Forces Google to re-issue a refresh_token even for a user who
    // previously authorized this app — without this, reconnecting after a
    // revoke/disconnect can silently come back with no refresh_token at all.
    prompt: 'consent',
  });
}

export interface GoogleTokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenSet> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token) throw new Error('Google did not return an access token');
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000),
  };
}

export async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleTokenSet> {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  if (!credentials.access_token) throw new Error('Failed to refresh Google access token');
  return {
    accessToken: credentials.access_token,
    refreshToken: credentials.refresh_token || refreshToken,
    expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(Date.now() + 3600 * 1000),
  };
}

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export async function getGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const client = createOAuthClient();
  client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data } = await oauth2.userinfo.get();
  return {
    id: data.id || '',
    email: data.email || '',
    name: data.name || data.email || 'Google User',
    picture: data.picture || '',
  };
}

/** Best-effort revoke — Google may already consider the token invalid, which isn't fatal for a disconnect. */
export async function revokeGoogleToken(token: string): Promise<void> {
  const client = createOAuthClient();
  try {
    await client.revokeToken(token);
  } catch {
    // ignore — proceed with local disconnect regardless
  }
}

export const SUPPORTED_DRIVE_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.google-apps.document', // Google Docs
  'application/vnd.google-apps.spreadsheet', // Google Sheets
  'application/vnd.google-apps.presentation', // Google Slides
];

export interface DriveFileMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webViewLink: string;
  ownerEmail: string;
  isFolder: boolean;
}

/** Lists supported files (and folders, to let the user browse into them) inside a Drive folder, or the user's root. */
export async function listDriveFiles(
  accessToken: string,
  folderId?: string,
  pageToken?: string
): Promise<{ files: DriveFileMeta[]; nextPageToken?: string }> {
  const client = createOAuthClient();
  client.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth: client });

  const mimeFilter = [...SUPPORTED_DRIVE_MIME_TYPES, 'application/vnd.google-apps.folder']
    .map((m) => `mimeType='${m}'`)
    .join(' or ');
  const parentFilter = folderId ? `'${folderId}' in parents` : `'root' in parents`;
  const q = `${parentFilter} and (${mimeFilter}) and trashed = false`;

  const res = await drive.files.list({
    q,
    pageToken,
    pageSize: 100,
    fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, owners(emailAddress))',
    spaces: 'drive',
  });

  const files: DriveFileMeta[] = (res.data.files || []).map((f) => ({
    id: f.id || '',
    name: f.name || 'Untitled',
    mimeType: f.mimeType || '',
    size: f.size ? parseInt(f.size, 10) : 0,
    modifiedTime: f.modifiedTime || new Date().toISOString(),
    webViewLink: f.webViewLink || '',
    ownerEmail: f.owners?.[0]?.emailAddress || '',
    isFolder: f.mimeType === 'application/vnd.google-apps.folder',
  }));

  return { files, nextPageToken: res.data.nextPageToken || undefined };
}

/** Fetches metadata for a single file (used during sync to check modifiedTime / detect deletion). */
export async function getDriveFileMeta(accessToken: string, fileId: string): Promise<DriveFileMeta | null> {
  const client = createOAuthClient();
  client.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth: client });
  try {
    const res = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, modifiedTime, webViewLink, owners(emailAddress), trashed',
    });
    if (res.data.trashed) return null;
    return {
      id: res.data.id || fileId,
      name: res.data.name || 'Untitled',
      mimeType: res.data.mimeType || '',
      size: res.data.size ? parseInt(res.data.size, 10) : 0,
      modifiedTime: res.data.modifiedTime || new Date().toISOString(),
      webViewLink: res.data.webViewLink || '',
      ownerEmail: res.data.owners?.[0]?.emailAddress || '',
      isFolder: res.data.mimeType === 'application/vnd.google-apps.folder',
    };
  } catch (err: any) {
    if (err?.code === 404) return null; // deleted or no longer shared with this account
    throw err;
  }
}

/** Downloads and extracts plain text from a supported Drive file, dispatching by mime type. */
export async function extractDriveFileText(
  accessToken: string,
  file: { id: string; mimeType: string }
): Promise<string> {
  const client = createOAuthClient();
  client.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth: client });

  if (file.mimeType === 'application/vnd.google-apps.document') {
    const res = await drive.files.export({ fileId: file.id, mimeType: 'text/plain' }, { responseType: 'text' });
    return res.data as unknown as string;
  }
  if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
    const res = await drive.files.export({ fileId: file.id, mimeType: 'text/csv' }, { responseType: 'text' });
    return res.data as unknown as string;
  }
  if (file.mimeType === 'application/vnd.google-apps.presentation') {
    const res = await drive.files.export({ fileId: file.id, mimeType: 'text/plain' }, { responseType: 'text' });
    return res.data as unknown as string;
  }

  const res = await drive.files.get({ fileId: file.id, alt: 'media' }, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(res.data as ArrayBuffer);

  if (file.mimeType === 'application/pdf') {
    const parsed = await pdf(buffer);
    return parsed.text;
  }
  if (file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  // text/plain, text/markdown
  return buffer.toString('utf-8');
}
