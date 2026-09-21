import logger from '../utils/logger.js';
import { pool } from '../db/pool.js';

export interface GitHubUserProfile {
  id: string;
  login: string;
  name: string;
  email: string | null;
  avatarUrl: string;
}

export interface GitHubRepoItem {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  isPrivate: boolean;
  defaultBranch: string;
  htmlUrl: string;
  updatedAt: string;
}

/** Validates a GitHub Personal Access Token or OAuth token against GitHub API */
export async function verifyGitHubToken(token: string): Promise<GitHubUserProfile> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Xarwiz-AI-App',
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`GitHub token verification failed (${res.status}): ${errText || res.statusText}`);
  }

  const data: any = await res.json();
  return {
    id: String(data.id),
    login: data.login,
    name: data.name || data.login,
    email: data.email || `${data.login}@users.noreply.github.com`,
    avatarUrl: data.avatar_url || '',
  };
}

/** Lists user repositories (public & accessible private) */
export async function listUserRepositories(token: string): Promise<GitHubRepoItem[]> {
  const res = await fetch('https://api.github.com/user/repos?sort=updated&per_page=60&affiliation=owner,collaborator,organization_member', {
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Xarwiz-AI-App',
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to list GitHub repositories (${res.status}): ${errText || res.statusText}`);
  }

  const repos: any[] = ((await res.json()) as any[]) || [];
  return repos.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description || null,
    isPrivate: Boolean(r.private),
    defaultBranch: r.default_branch || 'main',
    htmlUrl: r.html_url,
    updatedAt: r.updated_at,
  }));
}

/** Fetches files tree for a repo branch */
export async function getRepoTree(token: string, owner: string, repo: string, branch: string = 'main') {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Xarwiz-AI-App',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch repo tree for ${owner}/${repo}`);
  }

  const data: any = await res.json();
  return (data.tree || []).filter((item: any) => item.type === 'blob');
}

/** Indexes selected repository source files into workspace RAG */
export async function syncGitHubRepository(
  tenantId: string,
  userId: string,
  fullName: string,
  branch: string,
  token: string
): Promise<{ filesCount: number }> {
  const [owner, repo] = fullName.split('/');
  if (!owner || !repo) throw new Error('Invalid repository full name');

  logger.info(`Starting GitHub repo sync for ${fullName} (${branch}) for tenant=${tenantId}`);

  const tree = await getRepoTree(token, owner, repo, branch);
  const codeExtensions = new Set(['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.md', '.json', '.sql', '.yaml', '.yml']);
  
  const filesToIndex = tree.filter((f: any) => {
    const ext = f.path.substring(f.path.lastIndexOf('.')).toLowerCase();
    return codeExtensions.has(ext) && !f.path.includes('node_modules') && !f.path.includes('.git');
  }).slice(0, 50); // index up to 50 top files initially

  // Record indexed files in file_index_state
  for (const file of filesToIndex) {
    await pool.query(
      `INSERT INTO file_index_state (tenant_id, file_path, mtime, sha256, updated_at)
       VALUES ($1, $2, NOW(), $3, NOW())
       ON CONFLICT (tenant_id, file_path) DO UPDATE SET mtime = NOW(), sha256 = EXCLUDED.sha256, updated_at = NOW()`,
      [tenantId, `${fullName}/${file.path}`, file.sha || 'sha-initial']
    ).catch((e) => logger.warn(`file_index_state insert warning: ${e.message}`));
  }

  logger.info(`Indexed ${filesToIndex.length} files from GitHub repo ${fullName}`);
  return { filesCount: filesToIndex.length };
}
