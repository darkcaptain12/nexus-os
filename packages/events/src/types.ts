export interface BaseEvent {
  id: string;
  type: string;
  timestamp: string;
  source: string;
  payload: unknown;
  metadata?: Record<string, unknown>;
}

export type EventHandler<T extends BaseEvent = BaseEvent> = (event: T) => Promise<void>;

export interface EventPublisher {
  publish<T extends BaseEvent>(event: T): Promise<void>;
  publishBatch<T extends BaseEvent>(events: T[]): Promise<void>;
}

export interface EventSubscriber {
  subscribe<T extends BaseEvent>(
    eventType: string,
    handler: EventHandler<T>,
  ): () => void;
  unsubscribeAll(): void;
}
