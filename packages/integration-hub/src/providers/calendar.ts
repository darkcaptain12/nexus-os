import { BaseProvider } from '../provider';
import type { ProviderMetadata, ProviderAction, ExecuteResult } from '../types';

export class GoogleCalendarProvider extends BaseProvider {
  readonly metadata: ProviderMetadata = {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Calendar event management',
    category: 'calendar',
    authMethod: 'oauth2',
    baseUrl: 'https://www.googleapis.com/calendar/v3',
    scopes: ['https://www.googleapis.com/auth/calendar'],
    capabilities: ['read', 'create', 'delete'],
    version: '1.0.0',
  };

  getActions(): ProviderAction[] {
    return [
      { id: 'calendar.listEvents', providerId: 'google-calendar', name: 'List Events', description: 'Read upcoming events', method: 'GET', riskLevel: 'low', parameters: [{ name: 'maxResults', type: 'number', required: false, description: 'Max results' }] },
      { id: 'calendar.createEvent', providerId: 'google-calendar', name: 'Create Event', description: 'Create calendar event', method: 'POST', riskLevel: 'medium', parameters: [{ name: 'summary', type: 'string', required: true, description: 'Event title' }, { name: 'start', type: 'string', required: true, description: 'Start ISO datetime' }, { name: 'end', type: 'string', required: true, description: 'End ISO datetime' }, { name: 'description', type: 'string', required: false, description: 'Description' }] },
      { id: 'calendar.deleteEvent', providerId: 'google-calendar', name: 'Delete Event', description: 'Delete calendar event', method: 'DELETE', riskLevel: 'high', parameters: [{ name: 'eventId', type: 'string', required: true, description: 'Event ID' }] },
    ];
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecuteResult> {
    const start = performance.now();
    if (!this.credentials?.accessToken) {
      return this.makeError(action, start, 'Not authenticated');
    }

    const headers: Record<string, string> = { Authorization: `Bearer ${this.credentials.accessToken}` };

    try {
      switch (action) {
        case 'calendar.listEvents': {
          const now = new Date().toISOString();
          const res = await fetch(`${this.metadata.baseUrl}/calendars/primary/events?timeMin=${now}&maxResults=${params.maxResults ?? 10}&orderBy=startTime&singleEvents=true`, { headers });
          return this.makeResult(action, start, await res.json());
        }
        case 'calendar.createEvent': {
          const res = await fetch(`${this.metadata.baseUrl}/calendars/primary/events`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              summary: params.summary,
              description: params.description,
              start: { dateTime: params.start },
              end: { dateTime: params.end },
            }),
          });
          return this.makeResult(action, start, await res.json());
        }
        case 'calendar.deleteEvent': {
          await fetch(`${this.metadata.baseUrl}/calendars/primary/events/${params.eventId}`, { method: 'DELETE', headers });
          return this.makeResult(action, start, { deleted: true });
        }
        default:
          return this.makeError(action, start, `Unknown action: ${action}`);
      }
    } catch (err) {
      return this.makeError(action, start, err instanceof Error ? err.message : String(err));
    }
  }
}
