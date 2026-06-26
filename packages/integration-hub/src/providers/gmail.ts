import { BaseProvider } from '../provider';
import type { ProviderMetadata, ProviderAction, ExecuteResult } from '../types';

export class GmailProvider extends BaseProvider {
  readonly metadata: ProviderMetadata = {
    id: 'gmail',
    name: 'Gmail',
    description: 'Email reading and sending via Gmail API',
    category: 'email',
    authMethod: 'oauth2',
    baseUrl: 'https://gmail.googleapis.com/gmail/v1',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'],
    capabilities: ['read', 'send', 'search'],
    version: '1.0.0',
  };

  getActions(): ProviderAction[] {
    return [
      { id: 'gmail.listMessages', providerId: 'gmail', name: 'List Messages', description: 'Read inbox metadata', method: 'GET', riskLevel: 'low', parameters: [{ name: 'maxResults', type: 'number', required: false, description: 'Max results' }, { name: 'query', type: 'string', required: false, description: 'Search query' }] },
      { id: 'gmail.send', providerId: 'gmail', name: 'Send Email', description: 'Send an email', method: 'POST', riskLevel: 'high', parameters: [{ name: 'to', type: 'string', required: true, description: 'Recipient' }, { name: 'subject', type: 'string', required: true, description: 'Subject' }, { name: 'body', type: 'string', required: true, description: 'Email body' }] },
      { id: 'gmail.search', providerId: 'gmail', name: 'Search Messages', description: 'Search emails', method: 'GET', riskLevel: 'low', parameters: [{ name: 'query', type: 'string', required: true, description: 'Search query' }] },
    ];
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecuteResult> {
    const start = performance.now();
    if (!this.credentials?.accessToken) {
      return this.makeError(action, start, 'Not authenticated');
    }

    const headers = { Authorization: `Bearer ${this.credentials.accessToken}` };

    try {
      switch (action) {
        case 'gmail.listMessages': {
          const q = params.query ? `&q=${encodeURIComponent(params.query as string)}` : '';
          const res = await fetch(`${this.metadata.baseUrl}/users/me/messages?maxResults=${params.maxResults ?? 10}${q}`, { headers });
          return this.makeResult(action, start, await res.json());
        }
        case 'gmail.send': {
          const raw = btoa(`To: ${params.to}\r\nSubject: ${params.subject}\r\n\r\n${params.body}`);
          const res = await fetch(`${this.metadata.baseUrl}/users/me/messages/send`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw }),
          });
          return this.makeResult(action, start, await res.json());
        }
        case 'gmail.search': {
          const res = await fetch(`${this.metadata.baseUrl}/users/me/messages?q=${encodeURIComponent(params.query as string)}`, { headers });
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
