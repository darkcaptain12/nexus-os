import type {
  RuntimeEvent,
  EventSubscription,
  StoredEvent,
  DeadLetterEntry,
  EventReplayOptions,
  EventStreamPosition,
} from './types';

export interface EventRuntime {
  publish<T>(event: RuntimeEvent<T>): Promise<void>;
  publishBatch(events: RuntimeEvent[]): Promise<void>;
  publishDelayed<T>(event: RuntimeEvent<T>, delayMs: number): Promise<string>;
  publishScheduled<T>(event: RuntimeEvent<T>, executeAt: string): Promise<string>;
  subscribe(
    eventType: string,
    handler: EventRuntimeHandler,
    options?: SubscribeOptions,
  ): EventSubscription;
  unsubscribe(subscriptionId: string): void;
  unsubscribeAll(handlerId: string): void;
  replay(options: EventReplayOptions): AsyncIterable<StoredEvent>;
  getDeadLetterQueue(): Promise<DeadLetterEntry[]>;
  retryDeadLetter(entryId: string): Promise<void>;
  purgeDeadLetterQueue(): Promise<number>;
}

export type EventRuntimeHandler = (event: RuntimeEvent) => Promise<void>;

export interface SubscribeOptions {
  group?: string;
  filter?: import('./types').EventFilter;
  priority?: import('../core/types').Priority;
}

export interface EventStore {
  append(streamId: string, events: RuntimeEvent[]): Promise<StoredEvent[]>;
  read(streamId: string, fromSequence?: number, limit?: number): Promise<StoredEvent[]>;
  readAll(options: EventReplayOptions): AsyncIterable<StoredEvent>;
  getPosition(streamId: string): Promise<EventStreamPosition>;
  subscribe(streamId: string, handler: (event: StoredEvent) => Promise<void>): () => void;
}

export interface EventVersioning {
  upcast(event: RuntimeEvent, fromVersion: number, toVersion: number): RuntimeEvent;
  register(eventType: string, version: number, migrator: EventMigrator): void;
  getCurrentVersion(eventType: string): number;
}

export type EventMigrator = (payload: unknown) => unknown;
