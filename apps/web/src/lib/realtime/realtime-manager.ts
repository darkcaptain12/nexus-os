import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export type ChangeHandler = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}) => void;

export interface Subscription {
  id: string;
  table: string;
  channel: RealtimeChannel;
  handler: ChangeHandler;
}

export class RealtimeManager {
  private subscriptions = new Map<string, Subscription>();
  private db: SupabaseClient | null;

  constructor(db: SupabaseClient | null) {
    this.db = db;
  }

  subscribe(table: string, handler: ChangeHandler, filter?: string): string {
    if (!this.db) return '';

    const id = crypto.randomUUID();
    const channelName = `${table}-${id}`;

    let channelBuilder = this.db.channel(channelName);

    const pgChangesConfig: { event: '*'; schema: 'public'; table: string; filter?: string } = {
      event: '*',
      schema: 'public',
      table,
    };

    if (filter) {
      pgChangesConfig.filter = filter;
    }

    channelBuilder = channelBuilder.on(
      'postgres_changes',
      pgChangesConfig,
      (payload) => {
        handler({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: (payload.new as Record<string, unknown>) ?? {},
          old: (payload.old as Record<string, unknown>) ?? {},
        });
      },
    );

    const channel = channelBuilder.subscribe();

    this.subscriptions.set(id, { id, table, channel, handler });
    return id;
  }

  unsubscribe(subscriptionId: string): void {
    const sub = this.subscriptions.get(subscriptionId);
    if (sub && this.db) {
      this.db.removeChannel(sub.channel);
      this.subscriptions.delete(subscriptionId);
    }
  }

  unsubscribeAll(): void {
    for (const id of this.subscriptions.keys()) {
      this.unsubscribe(id);
    }
  }

  getActiveSubscriptions(): number {
    return this.subscriptions.size;
  }
}
