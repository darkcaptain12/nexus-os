export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'audit';

export interface LogContext {
  service: string;
  module?: string;
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  audit(message: string, context?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}
