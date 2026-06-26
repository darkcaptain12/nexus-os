import { BaseProvider } from '../provider';
import type { ProviderMetadata, ProviderAction, ExecuteResult } from '../types';

export class HTTPProvider extends BaseProvider {
  readonly metadata: ProviderMetadata = {
    id: 'http',
    name: 'HTTP Client',
    description: 'Generic REST API client',
    category: 'http',
    authMethod: 'none',
    capabilities: ['get', 'post', 'put', 'delete'],
    version: '1.0.0',
  };

  getActions(): ProviderAction[] {
    return ['GET', 'POST', 'PUT', 'DELETE'].map((method) => ({
      id: `http.${method.toLowerCase()}`,
      providerId: 'http',
      name: `HTTP ${method}`,
      description: `Send HTTP ${method} request`,
      method,
      riskLevel: method === 'GET' ? 'low' as const : 'medium' as const,
      parameters: [
        { name: 'url', type: 'string' as const, required: true, description: 'Request URL' },
        { name: 'headers', type: 'object' as const, required: false, description: 'Request headers' },
        { name: 'body', type: 'object' as const, required: false, description: 'Request body' },
      ],
    }));
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecuteResult> {
    const start = performance.now();
    const url = params.url as string;
    if (!url) return this.makeError(action, start, 'URL required');

    const method = action.replace('http.', '').toUpperCase();
    const headers: Record<string, string> = {
      ...(params.headers as Record<string, string> ?? {}),
    };

    if (this.credentials?.accessToken) {
      headers['Authorization'] = `Bearer ${this.credentials.accessToken}`;
    }
    if (this.credentials?.apiKey) {
      headers['X-API-Key'] = this.credentials.apiKey;
    }

    try {
      const options: RequestInit = {
        method,
        headers,
        signal: AbortSignal.timeout(30000),
      };

      if (params.body && method !== 'GET') {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(params.body);
      }

      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type') ?? '';
      const data = contentType.includes('json') ? await res.json() : await res.text();

      return this.makeResult(action, start, { status: res.status, data });
    } catch (err) {
      return this.makeError(action, start, err instanceof Error ? err.message : String(err));
    }
  }
}
