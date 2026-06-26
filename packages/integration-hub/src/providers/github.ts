import { BaseProvider } from '../provider';
import type { ProviderMetadata, ProviderAction, ExecuteResult } from '../types';

export class GitHubProvider extends BaseProvider {
  readonly metadata: ProviderMetadata = {
    id: 'github',
    name: 'GitHub',
    description: 'Repository, issue, and pull request management',
    category: 'code',
    authMethod: 'bearer',
    baseUrl: 'https://api.github.com',
    scopes: ['repo', 'read:user'],
    capabilities: ['repos', 'issues', 'pulls'],
    version: '1.0.0',
  };

  getActions(): ProviderAction[] {
    return [
      { id: 'github.listRepos', providerId: 'github', name: 'List Repositories', description: 'List user repositories', method: 'GET', riskLevel: 'low', parameters: [{ name: 'perPage', type: 'number', required: false, description: 'Results per page' }] },
      { id: 'github.getIssues', providerId: 'github', name: 'Get Issues', description: 'List issues for a repository', method: 'GET', riskLevel: 'low', parameters: [{ name: 'owner', type: 'string', required: true, description: 'Repo owner' }, { name: 'repo', type: 'string', required: true, description: 'Repo name' }] },
      { id: 'github.getPulls', providerId: 'github', name: 'Get Pull Requests', description: 'List PRs for a repository', method: 'GET', riskLevel: 'low', parameters: [{ name: 'owner', type: 'string', required: true, description: 'Repo owner' }, { name: 'repo', type: 'string', required: true, description: 'Repo name' }] },
      { id: 'github.createIssue', providerId: 'github', name: 'Create Issue', description: 'Create a new issue', method: 'POST', riskLevel: 'medium', parameters: [{ name: 'owner', type: 'string', required: true, description: 'Repo owner' }, { name: 'repo', type: 'string', required: true, description: 'Repo name' }, { name: 'title', type: 'string', required: true, description: 'Issue title' }, { name: 'body', type: 'string', required: false, description: 'Issue body' }] },
      { id: 'github.createPR', providerId: 'github', name: 'Create Pull Request', description: 'Create a draft PR', method: 'POST', riskLevel: 'high', parameters: [{ name: 'owner', type: 'string', required: true, description: 'Repo owner' }, { name: 'repo', type: 'string', required: true, description: 'Repo name' }, { name: 'title', type: 'string', required: true, description: 'PR title' }, { name: 'head', type: 'string', required: true, description: 'Head branch' }, { name: 'base', type: 'string', required: true, description: 'Base branch' }] },
    ];
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecuteResult> {
    const start = performance.now();
    if (!this.credentials?.accessToken) {
      return this.makeError(action, start, 'Not authenticated');
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.credentials.accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'NEXUS-OS',
    };

    try {
      switch (action) {
        case 'github.listRepos': {
          const res = await fetch(`${this.metadata.baseUrl}/user/repos?per_page=${params.perPage ?? 30}`, { headers });
          return this.makeResult(action, start, await res.json());
        }
        case 'github.getIssues': {
          const res = await fetch(`${this.metadata.baseUrl}/repos/${params.owner}/${params.repo}/issues`, { headers });
          return this.makeResult(action, start, await res.json());
        }
        case 'github.getPulls': {
          const res = await fetch(`${this.metadata.baseUrl}/repos/${params.owner}/${params.repo}/pulls`, { headers });
          return this.makeResult(action, start, await res.json());
        }
        case 'github.createIssue': {
          const res = await fetch(`${this.metadata.baseUrl}/repos/${params.owner}/${params.repo}/issues`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: params.title, body: params.body }),
          });
          return this.makeResult(action, start, await res.json());
        }
        case 'github.createPR': {
          const res = await fetch(`${this.metadata.baseUrl}/repos/${params.owner}/${params.repo}/pulls`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: params.title, head: params.head, base: params.base, draft: true }),
          });
          return this.makeResult(action, start, await res.json());
        }
        default:
          return this.makeError(action, start, `Unknown action: ${action}`);
      }
    } catch (err) {
      return this.makeError(action, start, err instanceof Error ? err.message : String(err));
    }
  }
}
