import { BaseProvider } from '../provider';
import type { ProviderMetadata, ProviderAction, ExecuteResult } from '../types';

export class NotionProvider extends BaseProvider {
  readonly metadata: ProviderMetadata = {
    id: 'notion',
    name: 'Notion',
    description: 'Workspace, database, and page management',
    category: 'storage',
    authMethod: 'bearer',
    baseUrl: 'https://api.notion.com/v1',
    scopes: [],
    capabilities: ['pages', 'databases', 'search'],
    version: '1.0.0',
  };

  getActions(): ProviderAction[] {
    return [
      {
        id: 'notion.search',
        providerId: 'notion',
        name: 'Search',
        description: 'Search pages and databases',
        method: 'POST',
        riskLevel: 'low',
        parameters: [
          { name: 'query', type: 'string', required: true, description: 'Search query' },
        ],
      },
      {
        id: 'notion.getPage',
        providerId: 'notion',
        name: 'Get Page',
        description: 'Get page content',
        method: 'GET',
        riskLevel: 'low',
        parameters: [{ name: 'pageId', type: 'string', required: true, description: 'Page ID' }],
      },
      {
        id: 'notion.createPage',
        providerId: 'notion',
        name: 'Create Page',
        description: 'Create a new page',
        method: 'POST',
        riskLevel: 'medium',
        parameters: [
          {
            name: 'parentId',
            type: 'string',
            required: true,
            description: 'Parent page/database ID',
          },
          { name: 'title', type: 'string', required: true, description: 'Page title' },
        ],
      },
      {
        id: 'notion.queryDatabase',
        providerId: 'notion',
        name: 'Query Database',
        description: 'Query a database',
        method: 'POST',
        riskLevel: 'low',
        parameters: [
          { name: 'databaseId', type: 'string', required: true, description: 'Database ID' },
        ],
      },
    ];
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecuteResult> {
    const start = performance.now();
    if (!this.credentials?.accessToken) return this.makeError(action, start, 'Not authenticated');

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.credentials.accessToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    };

    try {
      switch (action) {
        case 'notion.search': {
          const res = await fetch(`${this.metadata.baseUrl}/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query: params.query }),
          });
          return this.makeResult(action, start, await res.json());
        }
        case 'notion.getPage': {
          const res = await fetch(`${this.metadata.baseUrl}/pages/${params.pageId}`, { headers });
          return this.makeResult(action, start, await res.json());
        }
        case 'notion.createPage': {
          const res = await fetch(`${this.metadata.baseUrl}/pages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              parent: { page_id: params.parentId },
              properties: { title: { title: [{ text: { content: params.title } }] } },
            }),
          });
          return this.makeResult(action, start, await res.json());
        }
        case 'notion.queryDatabase': {
          const res = await fetch(`${this.metadata.baseUrl}/databases/${params.databaseId}/query`, {
            method: 'POST',
            headers,
            body: '{}',
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
