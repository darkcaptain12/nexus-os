import type { Priority } from '../core/types';

export interface Command<TPayload = unknown> {
  id: string;
  type: string;
  payload: TPayload;
  metadata: CommandMetadata;
}

export interface CommandMetadata {
  correlationId: string;
  causationId?: string;
  userId?: string;
  priority: Priority;
  timestamp: string;
  timeout: number;
  retries: number;
}

export interface CommandResult<T = unknown> {
  commandId: string;
  success: boolean;
  data?: T;
  error?: CommandError;
  durationMs: number;
  timestamp: string;
}

export interface CommandError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface CommandEnvelope {
  command: Command;
  attempt: number;
  maxAttempts: number;
  scheduledAt?: string;
  deadLetterReason?: string;
}

export interface MiddlewareContext {
  command: Command;
  metadata: Record<string, unknown>;
  aborted: boolean;
  abort(reason: string): void;
}

export type CommandMiddleware = (
  context: MiddlewareContext,
  next: () => Promise<CommandResult>,
) => Promise<CommandResult>;
