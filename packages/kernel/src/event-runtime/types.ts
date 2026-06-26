import type { Priority } from '../core/types';

export interface RuntimeEvent<TPayload = unknown> {
  id: string;
  type: string;
  payload: TPayload;
  metadata: EventMetadata;
}

export interface EventMetadata {
  correlationId: string;
  causationId?: string;
  source: string;
  userId?: string;
  version: number;
  priority: Priority;
  timestamp: string;
  scheduledFor?: string;
  retryCount: number;
  maxRetries: number;
}

export interface StoredEvent extends RuntimeEvent {
  sequence: number;
  streamId: string;
  storedAt: string;
}

export interface EventSubscription {
  id: string;
  eventType: string;
  handlerId: string;
  group?: string;
  filter?: EventFilter;
  active: boolean;
  createdAt: string;
}

export interface EventFilter {
  source?: string;
  minPriority?: Priority;
  metadata?: Record<string, unknown>;
}

export interface DeadLetterEntry {
  event: RuntimeEvent;
  error: string;
  failedAt: string;
  attempts: number;
  lastAttemptAt: string;
  handlerId: string;
}

export interface EventStreamPosition {
  streamId: string;
  sequence: number;
  timestamp: string;
}

export interface EventReplayOptions {
  streamId?: string;
  fromSequence?: number;
  toSequence?: number;
  fromTimestamp?: string;
  toTimestamp?: string;
  eventTypes?: string[];
  limit?: number;
}
