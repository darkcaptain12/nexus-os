export interface ExternalEvent {
  provider: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface EventMapping {
  provider: string;
  externalEvent: string;
  internalAction: string;
  transform: (payload: Record<string, unknown>) => Record<string, unknown>;
}

export class EventBridge {
  private mappings: EventMapping[] = [];
  private handler: ((action: string, params: Record<string, unknown>) => Promise<void>) | null =
    null;
  private processedCount = 0;

  registerMapping(mapping: EventMapping): void {
    this.mappings.push(mapping);
  }

  onAction(handler: (action: string, params: Record<string, unknown>) => Promise<void>): void {
    this.handler = handler;
  }

  async processEvent(event: ExternalEvent): Promise<{ matched: boolean; action?: string }> {
    const mapping = this.mappings.find(
      (m) => m.provider === event.provider && m.externalEvent === event.eventType,
    );

    if (!mapping) return { matched: false };

    const params = mapping.transform(event.payload);
    this.processedCount++;

    if (this.handler) {
      await this.handler(mapping.internalAction, params);
    }

    return { matched: true, action: mapping.internalAction };
  }

  getMappings(): EventMapping[] {
    return [...this.mappings];
  }

  getProcessedCount(): number {
    return this.processedCount;
  }
}

export function createDefaultMappings(): EventMapping[] {
  return [
    {
      provider: 'github',
      externalEvent: 'issues.opened',
      internalAction: 'task.create',
      transform: (p) => ({
        title: `[GitHub] ${p['title']}`,
        description: p['body'] as string,
        priority: 'normal',
      }),
    },
    {
      provider: 'github',
      externalEvent: 'pull_request.merged',
      internalAction: 'notification.send',
      transform: (p) => ({ title: 'PR Merged', body: `${p['title']} merged into ${p['base']}` }),
    },
    {
      provider: 'google-calendar',
      externalEvent: 'event.upcoming',
      internalAction: 'notification.send',
      transform: (p) => ({ title: 'Yaklaşan Etkinlik', body: p['summary'] as string }),
    },
    {
      provider: 'slack',
      externalEvent: 'message.mention',
      internalAction: 'notification.send',
      transform: (p) => ({ title: 'Slack Bahsetme', body: p['text'] as string }),
    },
  ];
}
