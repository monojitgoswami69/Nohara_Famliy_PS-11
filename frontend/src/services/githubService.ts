// ─── GitHub Service ─────────────────────────────────────────────────────
// Handles GitHub OAuth popup flow + proxied API calls via backend.

const GH_TOKEN_KEY = 'codecollab-github-token';
const GH_USER_KEY = 'codecollab-github-user';
const OAUTH_RESULT_KEY = 'codecollab-github-oauth-result';
const API_BASE = '/api';

interface OAuthPopupResult {
  type: 'github-oauth';
  token?: string;
  error?: string;
}

function isOAuthPopupResult(value: unknown): value is OAuthPopupResult {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return data.type === 'github-oauth';
}

// ─── Token Management ──────────────────────────────────────────────────

export function getStoredToken(): string | null {
  return localStorage.getItem(GH_TOKEN_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(GH_TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(GH_TOKEN_KEY);
  localStorage.removeItem(GH_USER_KEY);
  localStorage.removeItem(OAUTH_RESULT_KEY);
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

export function getStoredUser(): GitHubUser | null {
  try {
    const raw = localStorage.getItem(GH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeUser(user: GitHubUser): void {
  localStorage.setItem(GH_USER_KEY, JSON.stringify(user));
}

// ─── Auth Headers ──────────────────────────────────────────────────────

function authHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ─── OAuth Popup Flow ──────────────────────────────────────────────────

/**
 * Opens a popup to the backend OAuth endpoint.
 * Returns a Promise that resolves with the access token
 * when the popup sends it back via postMessage.
 */
export function startOAuthPopup(): Promise<string> {
  return new Promise((resolve, reject) => {
    localStorage.removeItem(OAUTH_RESULT_KEY);

    const width = 500;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `${API_BASE}/auth/github`,
      'github-oauth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
    );

    if (!popup) {
      reject(new Error('Popup was blocked. Please allow popups for this site.'));
      return;
    }

    let completed = false;
    let pollTimer: number | undefined;

    const complete = (payload: OAuthPopupResult) => {
      if (completed) return;
      completed = true;
      cleanup();

      if (payload.error) {
        reject(new Error(payload.error));
      } else if (payload.token) {
        resolve(payload.token);
      } else {
        reject(new Error('No token received from GitHub.'));
      }
    };

    const completeFromStorage = () => {
      const raw = localStorage.getItem(OAUTH_RESULT_KEY);
      if (!raw) return false;
      try {
        const payload = JSON.parse(raw);
        localStorage.removeItem(OAUTH_RESULT_KEY);
        if (!isOAuthPopupResult(payload)) return false;
        complete(payload);
        return true;
      } catch {
        localStorage.removeItem(OAUTH_RESULT_KEY);
        return false;
      }
    };

    const cleanup = () => {
      window.removeEventListener('message', handler);
      window.removeEventListener('storage', storageHandler);
      if (pollTimer !== undefined) {
        window.clearInterval(pollTimer);
      }
    };

    const handler = (event: MessageEvent) => {
      // Accept only messages from the popup we opened.
      if (event.source !== popup) return;
      if (!isOAuthPopupResult(event.data)) return;
      complete(event.data);
    };

    const storageHandler = (event: StorageEvent) => {
      if (event.key !== OAUTH_RESULT_KEY || !event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue);
        localStorage.removeItem(OAUTH_RESULT_KEY);
        if (!isOAuthPopupResult(payload)) return;
        complete(payload);
      } catch {
        localStorage.removeItem(OAUTH_RESULT_KEY);
      }
    };

    // Poll for popup closed without completing auth
    pollTimer = window.setInterval(() => {
      if (popup.closed) {
        if (completeFromStorage()) return;
        if (completed) return;
        completed = true;
        cleanup();
        reject(new Error('Authentication cancelled.'));
      }
    }, 500);

    window.addEventListener('message', handler);
    window.addEventListener('storage', storageHandler);
  });
}

// ─── Validate Token / Get User ─────────────────────────────────────────

export async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const res = await fetch(`${API_BASE}/github/user`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to fetch GitHub user. Token may be invalid.');
  return res.json();
}

// ─── Repos ─────────────────────────────────────────────────────────────

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  language: string | null;
  updated_at: string;
  default_branch: string;
  owner: { login: string; avatar_url: string };
}

export async function listRepos(
  token: string,
  page = 1,
  perPage = 100,
  sort: 'updated' | 'pushed' | 'full_name' = 'updated'
): Promise<GitHubRepo[]> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    sort,
  });
  const res = await fetch(`${API_BASE}/github/repos?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to fetch repositories.');
  return res.json();
}

// ─── Repo Contents (Tree) ──────────────────────────────────────────────

export interface GitHubContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  sha: string;
  download_url: string | null;
}

export async function getRepoContents(
  token: string,
  owner: string,
  repo: string,
  path = ''
): Promise<GitHubContent[]> {
  const params = new URLSearchParams();
  if (path) params.set('path', path);
  const res = await fetch(
    `${API_BASE}/github/repos/${owner}/${repo}/contents?${params}`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error(`Failed to fetch contents for ${owner}/${repo}/${path}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [data];
  return data;
}

// ─── Fetch File Content ────────────────────────────────────────────────

export async function fetchFileContent(
  downloadUrl: string,
  token?: string | null
): Promise<string> {
  const params = new URLSearchParams({ url: downloadUrl });
  const res = await fetch(`${API_BASE}/github/file?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to fetch file content.');
  return res.text();
}

// ─── Repo Tree (Full Import) ───────────────────────────────────────────

export interface RepoTreeItem {
  path: string;
  type: 'blob' | 'tree';  // blob = file, tree = dir
  size: number;
  sha: string;
}

export interface RepoTree {
  tree: RepoTreeItem[];
  sha: string;
  truncated: boolean;
}

export async function fetchRepoTree(
  token: string,
  owner: string,
  repo: string,
  branch: string
): Promise<RepoTree> {
  const res = await fetch(
    `${API_BASE}/github/repos/${owner}/${repo}/tree/${branch}`,
    { headers: authHeaders(token) }
  );
  if (!res.ok) throw new Error(`Failed to fetch repo tree for ${owner}/${repo}`);
  return res.json();
}

/**
 * Fetch raw file content by constructing the raw URL.
 * Works for both public and private repos when token is provided.
 */
export async function fetchRawContent(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  token?: string | null
): Promise<string> {
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  const params = new URLSearchParams({ url: rawUrl });
  const res = await fetch(`${API_BASE}/github/file?${params}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to fetch file content.');
  return res.text();
}

// ─── Public URL Parsing ────────────────────────────────────────────────

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  fileName: string;
}

/**
 * Parses GitHub URLs in these formats:
 * - https://github.com/owner/repo/blob/branch/path/to/file.ext
 * - https://raw.githubusercontent.com/owner/repo/branch/path/to/file.ext
 */
export function parseGitHubUrl(url: string): ParsedGitHubUrl | null {
  const blobRegex = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/;
  const blobMatch = url.match(blobRegex);
  if (blobMatch) {
    const filePath = blobMatch[4];
    return { owner: blobMatch[1], repo: blobMatch[2], branch: blobMatch[3], path: filePath, fileName: filePath.split('/').pop() || filePath };
  }

  const rawRegex = /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/;
  const rawMatch = url.match(rawRegex);
  if (rawMatch) {
    const filePath = rawMatch[4];
    return { owner: rawMatch[1], repo: rawMatch[2], branch: rawMatch[3], path: filePath, fileName: filePath.split('/').pop() || filePath };
  }

  return null;
}

/**
 * Fetches file content from a public GitHub URL (no auth needed for public repos).
 */
export async function fetchFromPublicUrl(url: string): Promise<{ fileName: string; content: string }> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    throw new Error('Invalid GitHub URL. Supported formats:\n• https://github.com/owner/repo/blob/branch/file\n• https://raw.githubusercontent.com/owner/repo/branch/file');
  }

  const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${parsed.branch}/${parsed.path}`;
  const res = await fetch(rawUrl);
  if (!res.ok) {
    if (res.status === 404) throw new Error('File not found. Make sure the repository and file are public.');
    throw new Error(`Failed to fetch file (${res.status}).`);
  }

  return { fileName: parsed.fileName, content: await res.text() };
}
