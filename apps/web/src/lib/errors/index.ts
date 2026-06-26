export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';
export type ErrorCategory = 'auth' | 'database' | 'network' | 'validation' | 'permission' | 'provider' | 'workflow' | 'action' | 'system';

export class NexusError extends Error {
  readonly code: string;
  readonly severity: ErrorSeverity;
  readonly category: ErrorCategory;
  readonly userMessage: string;
  readonly retryable: boolean;
  readonly details?: Record<string, unknown>;
  readonly timestamp: string;
  readonly correlationId?: string;

  constructor(opts: {
    code: string;
    message: string;
    userMessage: string;
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    retryable?: boolean;
    details?: Record<string, unknown>;
    correlationId?: string;
    cause?: Error;
  }) {
    super(opts.message, { cause: opts.cause });
    this.name = 'NexusError';
    this.code = opts.code;
    this.severity = opts.severity ?? 'error';
    this.category = opts.category ?? 'system';
    this.userMessage = opts.userMessage;
    this.retryable = opts.retryable ?? false;
    this.details = opts.details;
    this.timestamp = new Date().toISOString();
    this.correlationId = opts.correlationId;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.userMessage,
      severity: this.severity,
      category: this.category,
      retryable: this.retryable,
      timestamp: this.timestamp,
    };
  }
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof NexusError) return error.retryable;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('timeout') || msg.includes('econnreset') || msg.includes('rate limit') || msg.includes('503');
  }
  return false;
}

export function toNexusError(error: unknown, category: ErrorCategory = 'system'): NexusError {
  if (error instanceof NexusError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new NexusError({
    code: 'UNKNOWN_ERROR',
    message,
    userMessage: 'Beklenmeyen bir hata oluştu.',
    category,
    retryable: isRetryable(error),
    cause: error instanceof Error ? error : undefined,
  });
}
