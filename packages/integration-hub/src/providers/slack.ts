import { BaseProvider } from '../provider';
import type { ProviderMetadata, ProviderAction, ExecuteResult } from '../types';

export class SlackProvider extends BaseProvider {
  readonly metadata: ProviderMetadata = {
    id: 'slack',
    name: 'Slack',
    description: 'Team messaging and notifications',
    category: 'social',
    authMethod: 'bearer',
    baseUrl: 'https://slack.com/api',
    scopes: ['chat:write', 'channels:read'],
    capabilities: ['send', 'channels', 'search'],
    version: '1.0.0',
  };

  getActions(): ProviderAction[] {
    return [
      {
        id: 'slack.send',
        providerId: 'slack',
        name: 'Send Message',
        description: 'Send a message to a channel',
        method: 'POST',
        riskLevel: 'medium',
        parameters: [
          { name: 'channel', type: 'string', required: true, description: 'Channel ID' },
          { name: 'text', type: 'string', required: true, description: 'Message text' },
        ],
      },
      {
        id: 'slack.listChannels',
        providerId: 'slack',
        name: 'List Channels',
        description: 'List available channels',
        method: 'GET',
        riskLevel: 'low',
        parameters: [],
      },
    ];
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecuteResult> {
    const start = performance.now();
    if (!this.credentials?.accessToken) return this.makeError(action, start, 'Not authenticated');

    const headers = {
      Authorization: `Bearer ${this.credentials.accessToken}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (action) {
        case 'slack.send': {
          const res = await fetch(`${this.metadata.baseUrl}/chat.postMessage`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ channel: params.channel, text: params.text }),
          });
          return this.makeResult(action, start, await res.json());
        }
        case 'slack.listChannels': {
          const res = await fetch(`${this.metadata.baseUrl}/conversations.list`, { headers });
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
