import type { RuntimeEvent, EventSubscription, DeadLetterEntry, StoredEvent, EventReplayOptions } from '../../event-runtime/types';
import type { EventRuntime, EventRuntimeHandler, SubscribeOptions } from '../../event-runtime/interfaces';
import type { Logger } from '@apex-os/logger';

interface Subscriber {
  subscription: EventSubscription;
  handler: EventRuntimeHandler;
}

export class InMemoryEventRuntime implements EventRuntime {
  private subscribers = new Map<string, Subscriber[]>();
  private wildcardSubscribers: Subscriber[] = [];
  private deadLetterQueue: DeadLetterEntry[] = [];
  private eventStore: StoredEvent[] = [];
  private sequence = 0;
  private delayedTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private metrics = { published: 0, delivered: 0, failed: 0 };
  private log: Logger;

  constructor(log: Logger) {
    this.log = log;
  }

  async publish<T>(event: RuntimeEvent<T>): Promise<void> {
    this.metrics.published++;
    this.storeEvent(event);

    const subscribers = [
      ...(this.subscribers.get(event.type) ?? []),
      ...this.wildcardSubscribers,
    ].filter((s) => s.subscription.active && this.matchesFilter(event, s.subscription.filter));

    for (const sub of subscribers) {
      try {
        await sub.handler(event);
        this.metrics.delivered++;
      } catch (err) {
        this.metrics.failed++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.log.error(`Event handler failed: ${sub.subscription.handlerId}`, {
          eventType: event.type,
          eventId: event.id,
          error: errorMessage,
        });

        if (event.metadata.retryCount < event.metadata.maxRetries) {
          const retried: RuntimeEvent<T> = {
            ...event,
            metadata: { ...event.metadata, retryCount: event.metadata.retryCount + 1 },
          };
          await this.publish(retried);
        } else {
          this.deadLetterQueue.push({
            event,
            error: errorMessage,
            failedAt: new Date().toISOString(),
            attempts: event.metadata.maxRetries + 1,
            lastAttemptAt: new Date().toISOString(),
            handlerId: sub.subscription.handlerId,
          });
        }
      }
    }
  }

  async publishBatch(events: RuntimeEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  async publishDelayed<T>(event: RuntimeEvent<T>, delayMs: number): Promise<string> {
    const timerId = crypto.randomUUID();
    const timer = setTimeout(async () => {
      this.delayedTimers.delete(timerId);
      await this.publish(event);
    }, delayMs);
    this.delayedTimers.set(timerId, timer);
    return timerId;
  }

  async publishScheduled<T>(event: RuntimeEvent<T>, executeAt: string): Promise<string> {
    const delayMs = Math.max(0, new Date(executeAt).getTime() - Date.now());
    return this.publishDelayed(event, delayMs);
  }

  subscribe(
    eventType: string,
    handler: EventRuntimeHandler,
    options?: SubscribeOptions,
  ): EventSubscription {
    const subscription: EventSubscription = {
      id: crypto.randomUUID(),
      eventType,
      handlerId: options?.group ?? crypto.randomUUID(),
      group: options?.group,
      filter: options?.filter,
      active: true,
      createdAt: new Date().toISOString(),
    };

    const sub: Subscriber = { subscription, handler };

    if (eventType === '*') {
      this.wildcardSubscribers.push(sub);
    } else {
      const list = this.subscribers.get(eventType) ?? [];
      list.push(sub);
      this.subscribers.set(eventType, list);
    }

    this.log.debug(`Subscribed to ${eventType}`, { subscriptionId: subscription.id });
    return subscription;
  }

  unsubscribe(subscriptionId: string): void {
    for (const [type, subs] of this.subscribers) {
      const filtered = subs.filter((s) => s.subscription.id !== subscriptionId);
      if (filtered.length !== subs.length) {
        this.subscribers.set(type, filtered);
        return;
      }
    }
    this.wildcardSubscribers = this.wildcardSubscribers.filter(
      (s) => s.subscription.id !== subscriptionId,
    );
  }

  unsubscribeAll(handlerId: string): void {
    for (const [type, subs] of this.subscribers) {
      this.subscribers.set(
        type,
        subs.filter((s) => s.subscription.handlerId !== handlerId),
      );
    }
    this.wildcardSubscribers = this.wildcardSubscribers.filter(
      (s) => s.subscription.handlerId !== handlerId,
    );
  }

  async *replay(options: EventReplayOptions): AsyncIterable<StoredEvent> {
    let events = this.eventStore;

    if (options.streamId) {
      events = events.filter((e) => e.streamId === options.streamId);
    }
    if (options.fromSequence !== undefined) {
      events = events.filter((e) => e.sequence >= options.fromSequence!);
    }
    if (options.toSequence !== undefined) {
      events = events.filter((e) => e.sequence <= options.toSequence!);
    }
    if (options.eventTypes?.length) {
      events = events.filter((e) => options.eventTypes!.includes(e.type));
    }
    if (options.fromTimestamp) {
      events = events.filter((e) => e.storedAt >= options.fromTimestamp!);
    }
    if (options.toTimestamp) {
      events = events.filter((e) => e.storedAt <= options.toTimestamp!);
    }
    if (options.limit) {
      events = events.slice(0, options.limit);
    }

    for (const event of events) {
      yield event;
    }
  }

  async getDeadLetterQueue(): Promise<DeadLetterEntry[]> {
    return [...this.deadLetterQueue];
  }

  async retryDeadLetter(entryId: string): Promise<void> {
    const idx = this.deadLetterQueue.findIndex((e) => e.event.id === entryId);
    if (idx === -1) return;
    const entry = this.deadLetterQueue[idx]!;
    this.deadLetterQueue.splice(idx, 1);
    await this.publish({ ...entry.event, metadata: { ...entry.event.metadata, retryCount: 0 } });
  }

  async purgeDeadLetterQueue(): Promise<number> {
    const count = this.deadLetterQueue.length;
    this.deadLetterQueue = [];
    return count;
  }

  getMetrics() {
    return {
      ...this.metrics,
      subscriberCount: this.getSubscriberCount(),
      deadLetterCount: this.deadLetterQueue.length,
      storedEventCount: this.eventStore.length,
    };
  }

  dispose(): void {
    for (const timer of this.delayedTimers.values()) {
      clearTimeout(timer);
    }
    this.delayedTimers.clear();
    this.subscribers.clear();
    this.wildcardSubscribers = [];
  }

  private storeEvent(event: RuntimeEvent): void {
    this.sequence++;
    const stored: StoredEvent = {
      ...event,
      sequence: this.sequence,
      streamId: event.metadata.source,
      storedAt: new Date().toISOString(),
    };
    this.eventStore.push(stored);
  }

  private matchesFilter(event: RuntimeEvent, filter?: import('../../event-runtime/types').EventFilter): boolean {
    if (!filter) return true;
    if (filter.source && event.metadata.source !== filter.source) return false;
    return true;
  }

  private getSubscriberCount(): number {
    let count = this.wildcardSubscribers.length;
    for (const subs of this.subscribers.values()) {
      count += subs.length;
    }
    return count;
  }
}
