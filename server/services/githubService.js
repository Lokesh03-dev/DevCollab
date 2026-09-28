import { env } from '../config/env.js';

const apiBaseUrl = 'https://api.github.com';

export class GitHubServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'GitHubServiceError';
    this.status = status;
  }
}

function repositoryPath(fullName) {
  if (
    typeof fullName !== 'string' ||
    fullName.length > 200 ||
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(fullName)
  ) {
    throw new GitHubServiceError(400, 'Repository must be in owner/repo format.');
  }

  return fullName.split('/').map(encodeURIComponent).join('/');
}

function getHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'DevCollab-Platform',
  };

  if (env.githubToken) headers.Authorization = `Bearer ${env.githubToken}`;
  return headers;
}

async function requestGitHub(path) {
  let response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(8000),
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      throw new GitHubServiceError(504, 'GitHub request timed out. Please try again.');
    }
    throw new GitHubServiceError(502, 'GitHub is unavailable. Please try again later.');
  }

  if (response.ok) return response.json();

  if (response.status === 404) {
    throw new GitHubServiceError(404, 'GitHub repository was not found or is not accessible.');
  }

  if (response.status === 401) {
    throw new GitHubServiceError(502, 'GitHub rejected the configured server token.');
  }

  if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
    throw new GitHubServiceError(429, 'GitHub API rate limit reached. Please try again later.');
  }

  if (response.status === 403) {
    throw new GitHubServiceError(403, 'GitHub denied access to this repository.');
  }

  throw new GitHubServiceError(502, 'GitHub returned an unexpected error.');
}

export async function getRepositorySummary(fullName) {
  const path = repositoryPath(fullName);
  const [repository, commits] = await Promise.all([
    requestGitHub(`/repos/${path}`),
    requestGitHub(`/repos/${path}/commits?per_page=5`),
  ]);

  return {
    repository: {
      fullName: repository.full_name,
      url: repository.html_url,
      description: repository.description,
      stars: repository.stargazers_count,
      forks: repository.forks_count,
      openIssues: repository.open_issues_count,
      defaultBranch: repository.default_branch,
    },
    commits: commits.map((commit) => ({
      sha: commit.sha,
      shortSha: commit.sha.slice(0, 7),
      message: commit.commit.message.split('\n')[0],
      url: commit.html_url,
      author: commit.author?.login || commit.commit.author?.name || 'Unknown author',
      authoredAt: commit.commit.author?.date,
    })),
  };
}